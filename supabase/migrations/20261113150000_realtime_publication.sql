-- Sincronização mobile x desktop: coloca as tabelas de dados de projeto na
-- publicação supabase_realtime, para o app da equipe receber as mudanças
-- (postgres_changes) em tempo real. Hoje só `notifications` estava lá.
-- A RLS continua valendo: cada usuário só recebe o que pode ler.
-- Idempotente: pula tabela inexistente ou já publicada.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects', 'schedule_tasks', 'schedule_scenarios', 'project_activities',
    'scope_items', 'budget_quotes', 'budget_quote_items',
    'budget_discipline_suppliers', 'scenarios', 'scenario_items',
    'budget_approval_events', 'payments', 'invoices', 'purchases',
    'material_tracking', 'supplier_scopes', 'supplier_allocations',
    'weekly_reports', 'site_diary_entries', 'site_visits',
    'client_closing_schedule', 'pending_items'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;
