-- Aprovação de cenário de orçamento pelo cliente, na Trilha (portal).
--
-- O cliente (sem login, pelo token do portal) marca/desmarca itens do cenário
-- e aprova. A edge function submit-scenario-action grava com service role.
-- Aprovar pelo cliente SÓ REGISTRA: a equipe continua gerando parcelas e itens
-- de escopo pela aba de cenários (approveScenario), por isso is_approved e
-- projects.approved_scenario_id não são tocados aqui.

ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_by_token_id uuid REFERENCES public.client_portal_tokens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_source text CHECK (approval_source IN ('team', 'client')),
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Histórico: quem fez o quê e quando. Só a equipe lê; só a service role grava.
CREATE TABLE IF NOT EXISTS public.budget_approval_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.client_portal_tokens(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL CHECK (action IN ('toggle_item', 'approve', 'unlock')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_approval_events_scenario
  ON public.budget_approval_events (scenario_id, created_at DESC);

ALTER TABLE public.budget_approval_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team can view budget_approval_events" ON public.budget_approval_events;
CREATE POLICY "Team can view budget_approval_events"
  ON public.budget_approval_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = budget_approval_events.project_id
      AND p.user_id IN (SELECT public.get_team_user_ids())
  ));
-- Sem policy de INSERT/UPDATE/DELETE: só a service role (edge function) grava.

-- A equipe registra o "unlock" (reabrir cenário aprovado pelo cliente) pelo app.
DROP POLICY IF EXISTS "Team can insert unlock budget_approval_events" ON public.budget_approval_events;
CREATE POLICY "Team can insert unlock budget_approval_events"
  ON public.budget_approval_events FOR INSERT TO authenticated
  WITH CHECK (
    action = 'unlock'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = budget_approval_events.project_id
        AND p.user_id IN (SELECT public.get_team_user_ids())
    )
  );
