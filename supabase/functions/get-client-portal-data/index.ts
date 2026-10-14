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
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
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
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "Link inválido ou expirado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check expiration
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Link inválido ou expirado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const projectId = tokenData.project_id;

    // Fetch all data in parallel
    const nowIso = new Date().toISOString();
    const [projectRes, tasksRes, paymentsRes, invoicesRes, diaryRes, reportsRes, pendingRes, activitiesRes, closingRes, visitsRes, scopeRes, quotesRes, purchasesRes] =
      await Promise.all([
        supabase
          .from("projects")
          .select("name, address, city, estimated_budget, ideal_budget, start_date, expected_end_date, client_move_in_date, clients(name)")
          .eq("id", projectId)
          .single(),
        supabase
          .from("schedule_tasks")
          .select(
            "id, task_name, start_date, end_date, status, discipline, color, progress_percentage, is_client_visible"
          )
          .eq("project_id", projectId)
          .eq("is_client_visible", true)
          .order("start_date", { ascending: true }),
        supabase
          .from("payments")
          .select("id, value, due_date, paid_date, status, description, payment_method")
          .eq("project_id", projectId)
          .order("due_date", { ascending: true }),
        supabase
          .from("invoices")
          .select("id, value, date, store_name, description, invoice_number")
          .eq("project_id", projectId)
          .order("date", { ascending: false }),
        supabase
          .from("site_diary_entries")
          .select("id, entry_date, photos")
          .eq("project_id", projectId)
          .not("photos", "is", null)
          .order("entry_date", { ascending: false })
          .limit(12),
        supabase
          .from("weekly_reports")
          .select("id, week_start, summary, next_steps, completion_percent, photo_urls, client_pending, created_at")
          .eq("project_id", projectId)
          .order("week_start", { ascending: false })
          .limit(20),
        supabase
          .from("client_pending_responses")
          .select("id, weekly_report_id, pending_item, response_text, status, responded_at, client_name, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        // Trilha simplificada: blocos de construção / escopos entregues
        // saem das atividades do Cronograma Reverso.
        supabase
          .from("project_activities")
          .select("id, name, discipline, status, progress_percent, start_date, end_date")
          .eq("project_id", projectId)
          .order("position", { ascending: true }),
        // Fechamento Cliente: o que depende do cliente (adoção / próximas entregas).
        supabase
          .from("client_closing_schedule")
          .select("id, description, closing_date, delivery_date, status")
          .eq("project_id", projectId)
          .order("closing_date", { ascending: true }),
        // Visitas futuras: só data e tipo (as notas são internas).
        supabase
          .from("site_visits")
          .select("id, visit_date, visit_type")
          .eq("project_id", projectId)
          .gte("visit_date", nowIso)
          .order("visit_date", { ascending: true })
          .limit(20),
        // Cenários orçamentários: a disciplina e o estado de contratação
        // moram no escopo; as propostas concorrentes, nas cotações.
        supabase
          .from("scope_items")
          .select("id, discipline, status, payment_terms")
          .eq("project_id", projectId),
        // Só o que o cliente precisa para comparar. Fica de fora o que é
        // interno (user_id, supplier_id) e o que não é proposta.
        supabase
          .from("budget_quotes")
          .select(
            "id, scope_item_id, supplier_name, value, material_estimate, delivery_time, payment_terms, status, revision, is_current_revision, created_at"
          )
          .eq("project_id", projectId),
        supabase
          .from("purchases")
          .select("id, name, category, supplier_name, value, deadline, status, payment_info, product_link")
          .eq("project_id", projectId),
      ]);

    if (projectRes.error) {
      return new Response(
        JSON.stringify({ error: "Projeto não encontrado" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Onboarding configurado pela equipe. Mesma regra de onboardingMode()
    // em src/lib/onboarding.ts:
    //   override.is_enabled = false        -> nada
    //   override.sections_json é lista     -> cópia personalizada da obra
    //   override.template_id preenchido    -> seções ao vivo desse modelo
    //   sem override / template_id nulo    -> modelo padrão do time
    //     (resolvido pelo dono do projeto -> team_members)
    // Falha aqui não derruba o portal: onboarding volta null.
    let onboarding: { sections: unknown[] } | null = null;
    try {
      const { data: override } = await supabase
        .from("onboarding_project_overrides")
        .select("is_enabled, sections_json, template_id")
        .eq("project_id", projectId)
        .maybeSingle();

      if (override && !override.is_enabled) {
        onboarding = { sections: [] };
      } else if (override && Array.isArray(override.sections_json)) {
        onboarding = { sections: override.sections_json };
      } else {
        let templateId: string | null = override?.template_id ?? null;
        if (!templateId) {
          const { data: owner } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
          const { data: membership } = owner
            ? await supabase.from("team_members").select("team_id").eq("user_id", owner.user_id).order("created_at", { ascending: true }).limit(1).maybeSingle()
            : { data: null };
          if (membership) {
            const { data: template } = await supabase
              .from("onboarding_templates")
              .select("id")
              .eq("team_id", membership.team_id)
              .eq("is_default", true)
              .limit(1)
              .maybeSingle();
            templateId = template?.id ?? null;
          }
        }
        if (templateId) {
          const { data: sections } = await supabase
            .from("onboarding_sections")
            .select("id, title, body, video_url, image_urls, cta_label, cta_url, is_active, display_order, layout")
            .eq("template_id", templateId)
            .eq("is_active", true)
            .order("display_order", { ascending: true });
          onboarding = { sections: sections ?? [] };
        } else {
          onboarding = { sections: [] };
        }
      }
    } catch (_e) {
      onboarding = null;
    }

    // Extract photos from diary entries
    const photos: { url: string; date: string }[] = [];
    (diaryRes.data ?? []).forEach((entry: any) => {
      if (entry.photos && Array.isArray(entry.photos)) {
        entry.photos.forEach((url: string) => {
          photos.push({ url, date: entry.entry_date });
        });
      }
    });

    // A disciplina da cotação vem do escopo: budget_quotes não guarda
    // disciplina própria. Cotação órfã (sem escopo) entra sem disciplina
    // e a tela a agrupa em "Sem disciplina", em vez de sumir com ela.
    const scopeRows = (scopeRes.data ?? []) as Array<Record<string, unknown>>;
    const disciplinaPorEscopo = new Map<string, string>();
    for (const r of scopeRows) {
      if (r.id) disciplinaPorEscopo.set(String(r.id), String(r.discipline ?? ""));
    }

    // `valid_until` e `note` são colunas novas. Enquanto a migração não
    // roda em produção, a consulta acima falharia se as pedisse, então
    // elas vêm numa consulta própria cujo erro é ignorado: antes da
    // migração a tela aparece sem selo de validade e sem nota, depois
    // ela acende sozinha. Esta consulta sai quando a migração estiver
    // aplicada em todos os ambientes.
    const validadePorCotacao = new Map<string, string | null>();
    const notaPorEscopo = new Map<string, string | null>();
    try {
      const [vRes, nRes] = await Promise.all([
        supabase.from("budget_quotes").select("id, valid_until").eq("project_id", projectId),
        supabase.from("scope_items").select("id, note").eq("project_id", projectId),
      ]);
      for (const r of (vRes.data ?? []) as Array<Record<string, unknown>>) {
        validadePorCotacao.set(String(r.id), (r.valid_until as string) ?? null);
      }
      for (const r of (nRes.data ?? []) as Array<Record<string, unknown>>) {
        notaPorEscopo.set(String(r.id), (r.note as string) ?? null);
      }
    } catch {
      // colunas ainda não existem: segue sem validade e sem nota
    }

    const quotes = ((quotesRes.data ?? []) as Array<Record<string, unknown>>).map((q) => ({
      id: String(q.id),
      discipline: q.scope_item_id ? disciplinaPorEscopo.get(String(q.scope_item_id)) ?? null : null,
      supplier: (q.supplier_name as string) ?? null,
      value: (q.value as number) ?? null,
      material: (q.material_estimate as number) ?? null,
      deliveryTime: (q.delivery_time as string) ?? null,
      paymentTerms: (q.payment_terms as string) ?? null,
      status: (q.status as string) ?? "pendente",
      revision: (q.revision as string) ?? null,
      isCurrentRevision: (q.is_current_revision as boolean) ?? null,
      quotedAt: q.created_at ? String(q.created_at).slice(0, 10) : null,
      validUntil: validadePorCotacao.get(String(q.id)) ?? null,
    }));

    const scope_items = scopeRows.map((r) => ({
      id: String(r.id),
      discipline: String(r.discipline ?? ""),
      status: (r.status as string) ?? null,
      paymentTerms: (r.payment_terms as string) ?? null,
      note: notaPorEscopo.get(String(r.id)) ?? null,
    }));

    const { clients: projectClient, ...projectFields } = projectRes.data as Record<string, unknown> & { clients?: { name?: string } | null };

    return new Response(
      JSON.stringify({
        project: { ...projectFields, client_name: projectClient?.name ?? null },
        tasks: tasksRes.data ?? [],
        payments: paymentsRes.data ?? [],
        invoices: invoicesRes.data ?? [],
        photos: photos.slice(0, 12),
        weekly_reports: reportsRes.data ?? [],
        pending_responses: pendingRes.data ?? [],
        activities: activitiesRes.data ?? [],
        closing_items: closingRes.data ?? [],
        visits: visitsRes.data ?? [],
        quotes,
        scope_items,
        purchases: purchasesRes.data ?? [],
        onboarding,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
