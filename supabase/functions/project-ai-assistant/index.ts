import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(anthropic: Anthropic, systemPrompt: string, userPrompt: string, schema: Record<string, unknown>) {
  const response = await anthropic.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: { type: "json_schema", schema } },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("A IA não conseguiu processar esta solicitação");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";
  if (!raw) throw new Error("AI did not return structured response");

  return JSON.parse(raw);
}

/**
 * Texto do contexto da obra para os prompts semanais. Aceita o formato novo
 * (diário recente + cronograma + último relatório, montado em
 * src/lib/weeklyAIContext.ts) e o antigo (só diary_entries da semana).
 */
function weeklyContextText(data: any): { text: string; hasData: boolean } {
  const diary = Array.isArray(data?.diary_entries) ? data.diary_entries : [];
  const schedule = Array.isArray(data?.schedule) ? data.schedule : [];
  const lastReport = data?.last_report ?? null;
  const scopeLabel: Record<string, string> = {
    semana: "registros desta semana",
    ultimos_14_dias: "sem registros nesta semana; registros dos últimos 14 dias",
    ultimos_registros: "sem registros recentes; últimos registros disponíveis",
    nenhum: "nenhum registro no diário de obra",
  };
  const parts: string[] = [];
  parts.push(`Semana de referência: ${data?.week_start || "?"} a ${data?.week_end || "?"}.`);
  if (typeof data?.progress_percent === "number") parts.push(`Progresso médio do cronograma: ${data.progress_percent}%.`);
  parts.push(`Diário de obra (${scopeLabel[data?.diary_scope] ?? "registros"}):\n${JSON.stringify(diary, null, 2)}`);
  if (schedule.length > 0) parts.push(`Cronograma (etapas em andamento, próximas 2 semanas e concluídas nas últimas 2 semanas):\n${JSON.stringify(schedule, null, 2)}`);
  if (lastReport) parts.push(`Último relatório semanal enviado ao cliente:\n${JSON.stringify(lastReport, null, 2)}`);
  return { text: parts.join("\n\n"), hasData: diary.length > 0 || schedule.length > 0 || !!lastReport };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { project_id, action, data } = await req.json();
    if (!project_id || !action) {
      return new Response(JSON.stringify({ error: "project_id and action required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const ok = (body: any) => new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const err = (msg: string, status = 500) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ===== SEQUENCE =====
    if (action === "sequence") {
      const activities = data?.activities || [];
      if (activities.length === 0) return err("No activities provided", 400);

      const parsed = await callAI(
        anthropic,
        "Você é um engenheiro de obras especializado em sequenciamento de atividades de construção civil. Responda apenas com o JSON solicitado.",
        `Dado este conjunto de atividades de obra:\n${JSON.stringify(activities.map((a: any) => ({ id: a.id, name: a.name, discipline: a.discipline, depends_on: a.depends_on })), null, 2)}\n\nOrganize-as em sequência lógica de execução considerando dependências técnicas típicas de uma reforma residencial/comercial em Belo Horizonte.`,
        {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  activity_id: { type: "string" },
                  activity_name: { type: "string" },
                  suggested_position: { type: "number" },
                  depends_on_activity_id: { type: "string", description: "ID da atividade predecessora, ou null" },
                  depends_on_activity_name: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["activity_id", "activity_name", "suggested_position", "depends_on_activity_id", "depends_on_activity_name", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["suggestions"],
          additionalProperties: false,
        }
      );
      return ok(parsed);
    }

    // ===== ANALYZE BUDGET =====
    if (action === "analyze_budget") {
      const { scenario_items, price_research } = data || {};
      const parsed = await callAI(
        anthropic,
        "Você é um consultor de custos de obra especializado no mercado de BH. Analise orçamentos de forma objetiva e profissional.",
        `Analise este orçamento de obra comparando com pesquisas de preço de mercado em Belo Horizonte:\n\nItens do orçamento:\n${JSON.stringify(scenario_items || [], null, 2)}\n\nPesquisas de preço:\n${JSON.stringify(price_research || [], null, 2)}\n\nCompare cada item do orçamento com os dados de pesquisa disponíveis. Identifique oportunidades de economia e itens acima da média.`,
        {
          type: "object",
          properties: {
            analysis_text: { type: "string", description: "Análise geral em 2-3 parágrafos" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  current_price: { type: "number" },
                  avg_price: { type: "number" },
                  status: { type: "string", enum: ["above", "below", "ok"] },
                  note: { type: "string" },
                },
                required: ["name", "current_price", "avg_price", "status", "note"],
                additionalProperties: false,
              },
            },
          },
          required: ["analysis_text", "items"],
          additionalProperties: false,
        }
      );
      return ok(parsed);
    }

    // ===== WEEKLY SUMMARY =====
    if (action === "weekly_summary") {
      const ctx = weeklyContextText(data);
      if (!ctx.hasData) return err("Sem diário, cronograma ou relatório anterior para resumir", 400);
      const parsed = await callAI(
        anthropic,
        "Você é assistente de gestão de obras. Gere relatórios semanais profissionais e concisos em português do Brasil, para o cliente da obra. Use só os dados fornecidos; não invente execução que não aparece no diário nem no cronograma.",
        `Dados da obra:\n${ctx.text}\n\nGere:\n1) Resumo do andamento (3-4 frases). Se não houver registros nesta semana, baseie-se no cronograma e nos registros mais recentes e deixe claro o que está previsto x executado.\n2) Próximas etapas previstas (lista), a partir do cronograma.\n3) Pendências que dependem do cliente (se houver; senão, string vazia).\nTom: profissional e direto.`,
        {
          type: "object",
          properties: {
            summary: { type: "string", description: "Resumo das atividades executadas" },
            next_steps: { type: "string", description: "Próximas etapas previstas" },
            client_pending: { type: "string", description: "Pendências que dependem do cliente" },
          },
          required: ["summary", "next_steps", "client_pending"],
          additionalProperties: false,
        }
      );
      return ok(parsed);
    }

    // ===== ESTIMATE COSTS =====
    if (action === "estimate_costs") {
      const activities = data?.activities || [];
      if (activities.length === 0) return err("No activities provided", 400);

      const parsed = await callAI(
        anthropic,
        "Você é uma especialista em gestão de obras em Belo Horizonte. Forneça estimativas realistas baseadas em preços praticados em BH em 2025.",
        `Com base nestas atividades de obra:\n${JSON.stringify(activities.map((a: any) => ({ name: a.name, area_m2: a.area_m2, discipline: a.discipline })), null, 2)}\n\nGere uma estimativa de custo para cada uma considerando mão de obra e materiais típicos de BH em 2025.`,
        {
          type: "object",
          properties: {
            estimates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  activity_name: { type: "string" },
                  estimated_cost_min: { type: "number" },
                  estimated_cost_max: { type: "number" },
                  unit: { type: "string" },
                  notes: { type: "string" },
                },
                required: ["activity_name", "estimated_cost_min", "estimated_cost_max", "unit", "notes"],
                additionalProperties: false,
              },
            },
          },
          required: ["estimates"],
          additionalProperties: false,
        }
      );
      return ok(parsed);
    }

    // ===== GENERATE MATERIALS =====
    if (action === "generate_materials") {
      const activities = data?.activities || [];
      if (activities.length === 0) return err("No activities provided", 400);

      const parsed = await callAI(
        anthropic,
        "Você é uma especialista em materiais de construção em Belo Horizonte. Forneça listas de materiais com quantidades baseadas em índices típicos de obra em BH.",
        `Com base nestas atividades:\n${JSON.stringify(activities.map((a: any) => ({ name: a.name, area_m2: a.area_m2, discipline: a.discipline })), null, 2)}\n\nEstime os materiais necessários para cada uma com quantidades baseadas nas áreas informadas. Considere índices típicos de obra em BH.`,
        {
          type: "object",
          properties: {
            materials: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  activity_name: { type: "string" },
                  material_name: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  notes: { type: "string" },
                },
                required: ["activity_name", "material_name", "quantity", "unit", "notes"],
                additionalProperties: false,
              },
            },
          },
          required: ["materials"],
          additionalProperties: false,
        }
      );
      return ok(parsed);
    }

    // ===== GENERATE SCHEDULE =====
    if (action === "generate_schedule") {
      const activities = data?.activities || [];
      if (activities.length === 0) return err("No activities provided", 400);

      const parsed = await callAI(
        anthropic,
        "Você é uma especialista em planejamento de obras. Sugira cronogramas realistas considerando sequência lógica de execução de uma reforma.",
        `Com base nestas atividades de obra:\n${JSON.stringify(activities.map((a: any) => ({ name: a.name, discipline: a.discipline, area_m2: a.area_m2 })), null, 2)}\n\nSugira um cronograma em dias para cada atividade e as dependências entre elas considerando sequência lógica de execução de uma reforma.`,
        {
          type: "object",
          properties: {
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  activity_name: { type: "string" },
                  duration_days: { type: "number" },
                  depends_on_activity_name: { type: "string" },
                  week_number: { type: "number" },
                },
                required: ["activity_name", "duration_days", "depends_on_activity_name", "week_number"],
                additionalProperties: false,
              },
            },
          },
          required: ["schedule"],
          additionalProperties: false,
        }
      );
      return ok(parsed);
    }

    // ===== FINANCIAL ANALYSIS =====
    if (action === "financial_analysis") {
      const { receita, despesas, pendentes, progresso } = data || {};

      const parsed = await callAI(
        anthropic,
        "Você é um consultor financeiro especializado em gestão de obras. Analise dados financeiros de forma objetiva e profissional em português do Brasil.",
        `Analise o desempenho financeiro deste projeto:\nReceita contratada: R$${receita || 0}\nDespesas até hoje: R$${despesas || 0}\nPagamentos pendentes: R$${pendentes || 0}\nProgresso físico: ${progresso || 0}%\n\nGere uma análise de 3-4 parágrafos identificando:\n1) Se o projeto está dentro do orçamento\n2) Riscos financeiros identificados\n3) Recomendações para o próximo período`,
        {
          type: "object",
          properties: {
            analysis_text: { type: "string", description: "Análise completa em 3-4 parágrafos" },
            risks: { type: "string", description: "Riscos financeiros identificados" },
            recommendations: { type: "string", description: "Recomendações para o próximo período" },
          },
          required: ["analysis_text", "risks", "recommendations"],
          additionalProperties: false,
        }
      );
      return ok(parsed);
    }

    // ===== WEEKLY INSIGHTS =====
    if (action === "weekly_insights") {
      const ctx = weeklyContextText(data);
      if (!ctx.hasData) return err("Sem diário, cronograma ou relatório anterior para analisar", 400);

      const parsed = await callAI(
        anthropic,
        "Você é um consultor de obras. Analise o diário de obra e o cronograma e forneça insights práticos e diretos em português do Brasil. Use só os dados fornecidos.",
        `Dados da obra:\n${ctx.text}\n\nIdentifique:\n1) Principais avanços\n2) Problemas ou riscos observados (inclua etapas atrasadas em relação ao cronograma e falta de registros no diário, se for o caso)\n3) Sugestões para a próxima semana\nSeja direto e prático.`,
        {
          type: "object",
          properties: {
            advances: { type: "string", description: "Principais avanços da semana" },
            issues: { type: "string", description: "Problemas ou riscos observados" },
            suggestions: { type: "string", description: "Sugestões para a próxima semana" },
          },
          required: ["advances", "issues", "suggestions"],
          additionalProperties: false,
        }
      );
      return ok(parsed);
    }

    return err(`Unknown action: ${action}`, 400);
  } catch (e) {
    console.error("project-ai-assistant error:", e);
    if (e instanceof Anthropic.RateLimitError) {
      return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
