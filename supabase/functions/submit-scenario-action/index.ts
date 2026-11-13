import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkCanApprove,
  checkItemInScenario,
  checkScenarioOpen,
  isScenarioAction,
  scenarioTotal,
  validateClientName,
} from "../_shared/scenarioApproval.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Ações do cliente sobre os cenários de orçamento, pela Trilha (token do portal).
 *  - toggle_item: marca/desmarca um item (is_included) e recalcula o total.
 *  - approve: registra a aprovação (nome + data), trava o cenário e avisa os admins.
 * Aprovar SÓ REGISTRA: parcelas e itens de escopo continuam sendo gerados pela
 * equipe. Tudo é validado no servidor (o token é a única credencial do cliente).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const { token, action, scenario_id, item_id, is_included, client_name } = body as Record<string, unknown>;

    if (typeof token !== "string" || typeof scenario_id !== "string" || !isScenarioAction(action)) {
      return json({ error: "Campos obrigatórios faltando" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tokenData } = await supabase
      .from("client_portal_tokens")
      .select("id, project_id, expires_at")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();
    if (!tokenData) return json({ error: "Token inválido ou expirado" }, 403);
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return json({ error: "Token expirado" }, 403);
    }
    const projectId = tokenData.project_id as string;

    const { data: scenario } = await supabase
      .from("scenarios")
      .select("id, name, project_id, is_locked, approved_at")
      .eq("id", scenario_id)
      .maybeSingle();
    const open = checkScenarioOpen(scenario, projectId);
    if (!open.ok) return json({ error: open.error }, open.status);

    const { data: itemsData } = await supabase
      .from("scenario_items")
      .select("id, scenario_id, discipline, description, estimated_value, is_included")
      .eq("scenario_id", scenario_id);
    const items = (itemsData ?? []) as Array<{
      id: string; scenario_id: string; discipline: string | null; description: string | null;
      estimated_value: number | null; is_included: boolean | null;
    }>;

    if (action === "toggle_item") {
      if (typeof item_id !== "string" || typeof is_included !== "boolean") {
        return json({ error: "Campos obrigatórios faltando" }, 400);
      }
      const item = items.find((i) => i.id === item_id);
      const inScenario = checkItemInScenario(item, scenario_id);
      if (!inScenario.ok) return json({ error: inScenario.error }, inScenario.status);

      const { error: upErr } = await supabase
        .from("scenario_items")
        .update({ is_included: is_included })
        .eq("id", item_id);
      if (upErr) return json({ error: "Não foi possível atualizar o item" }, 500);

      const next = items.map((i) => (i.id === item_id ? { ...i, is_included } : i));
      const total = scenarioTotal(next);
      await supabase.from("scenarios").update({ total_value: total }).eq("id", scenario_id);
      await supabase.from("budget_approval_events").insert({
        project_id: projectId,
        scenario_id,
        token_id: tokenData.id,
        actor_name: validateClientName(client_name).ok ? (client_name as string).trim() : null,
        action: "toggle_item",
        payload: { item_id, is_included, total },
      });
      return json({ success: true, total });
    }

    // approve
    const name = validateClientName(client_name);
    if (!name.ok) return json({ error: name.error }, 400);
    const can = checkCanApprove(items);
    if (!can.ok) return json({ error: can.error }, can.status);

    const total = scenarioTotal(items);
    const approvedAt = new Date().toISOString();
    // Condicional: só aprova se ainda estiver aberto (duplo clique / corrida entre abas).
    const { data: updated, error: apErr } = await supabase
      .from("scenarios")
      .update({
        approved_by_name: name.name,
        approved_by_token_id: tokenData.id,
        approved_at: approvedAt,
        approval_source: "client",
        is_locked: true,
        total_value: total,
      })
      .eq("id", scenario_id)
      .eq("is_locked", false)
      .is("approved_at", null)
      .select("id");
    if (apErr) return json({ error: "Não foi possível registrar a aprovação" }, 500);
    if (!updated || updated.length === 0) return json({ success: true, duplicate: true });

    await supabase.from("budget_approval_events").insert({
      project_id: projectId,
      scenario_id,
      token_id: tokenData.id,
      actor_name: name.name,
      action: "approve",
      payload: {
        total,
        items: items.filter((i) => i.is_included).map((i) => ({
          id: i.id, discipline: i.discipline, description: i.description, estimated_value: i.estimated_value,
        })),
      },
    });

    const { data: projectData } = await supabase.from("projects").select("name").eq("id", projectId).single();
    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (projectData && admins && admins.length > 0) {
      await supabase.from("notifications").insert(
        admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          type: "client_response",
          title: "Orçamento aprovado pelo cliente",
          message: `${name.name} aprovou o cenário "${scenario!.name}" no projeto ${projectData.name}`,
          related_entity_type: "project",
          related_entity_id: projectId,
          related_project_id: projectId,
        })),
      );
    }

    return json({ success: true, approved_at: approvedAt, total });
  } catch {
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
