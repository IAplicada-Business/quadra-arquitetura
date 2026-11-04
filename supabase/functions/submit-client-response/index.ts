import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, weekly_report_id, pending_item, response_text, status, client_name } = await req.json();

    if (!token || !weekly_report_id || !pending_item || !status) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["respondido", "aprovado", "rejeitado"].includes(status)) {
      return new Response(JSON.stringify({ error: "Status inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("client_portal_tokens")
      .select("project_id, is_active, expires_at")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expirado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = tokenData.project_id;

    // Idempotência: se essa pendência já foi respondida (duplo clique, reenvio),
    // devolve a resposta existente em vez de criar outra e notificar de novo.
    const { data: existingResponse } = await supabase
      .from("client_pending_responses")
      .select()
      .eq("weekly_report_id", weekly_report_id)
      .eq("pending_item", pending_item)
      .maybeSingle();
    if (existingResponse) {
      return new Response(JSON.stringify({ success: true, duplicate: true, data: existingResponse }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert response
    const { data: responseData, error: insertError } = await supabase
      .from("client_pending_responses")
      .insert({
        weekly_report_id,
        project_id: projectId,
        pending_item,
        response_text: response_text || null,
        status,
        responded_at: new Date().toISOString(),
        client_name: client_name || null,
      })
      .select()
      .single();

    if (insertError) {
      // 23505: outra requisição inseriu entre a checagem e o insert (índice único).
      if ((insertError as { code?: string }).code === "23505") {
        const { data: dup } = await supabase
          .from("client_pending_responses")
          .select()
          .eq("weekly_report_id", weekly_report_id)
          .eq("pending_item", pending_item)
          .maybeSingle();
        return new Response(JSON.stringify({ success: true, duplicate: true, data: dup }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project name for notification
    const { data: projectData } = await supabase
      .from("projects")
      .select("name, user_id")
      .eq("id", projectId)
      .single();

    // Create notification for admins
    if (projectData) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin: any) => ({
          user_id: admin.user_id,
          type: "client_response",
          title: "Resposta do cliente",
          message: `Cliente ${client_name || ""} ${status === "aprovado" ? "aprovou" : "respondeu"} pendência no projeto ${projectData.name}`,
          related_entity_type: "project",
          related_entity_id: projectId,
          related_project_id: projectId,
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
