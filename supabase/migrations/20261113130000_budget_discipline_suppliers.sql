-- Fornecedor responsável por disciplina/grupo na aba Orçamentos.
-- Um responsável por (projeto, disciplina). A disciplina é texto livre,
-- igual a budget_quotes.discipline, então vale para grupos criados à mão.
CREATE TABLE IF NOT EXISTS public.budget_discipline_suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  discipline text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, discipline)
);

ALTER TABLE public.budget_discipline_suppliers ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de equipe de supplier_allocations.
CREATE POLICY "Team can view budget_discipline_suppliers"
  ON public.budget_discipline_suppliers FOR SELECT TO authenticated
  USING (user_id IN (SELECT public.get_team_user_ids()));

CREATE POLICY "Users can insert budget_discipline_suppliers"
  ON public.budget_discipline_suppliers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team can update budget_discipline_suppliers"
  ON public.budget_discipline_suppliers FOR UPDATE TO authenticated
  USING (user_id IN (SELECT public.get_team_user_ids()));

CREATE POLICY "Team can delete budget_discipline_suppliers"
  ON public.budget_discipline_suppliers FOR DELETE TO authenticated
  USING (user_id IN (SELECT public.get_team_user_ids()));
