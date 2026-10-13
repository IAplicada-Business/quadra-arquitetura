-- Importação de orçamentos: vínculo estável cotação ↔ atividade e acesso
-- por equipe.
--
-- 1. activity_id / discipline em budget_quotes. Antes a disciplina da
--    cotação era deduzida comparando o texto da cotação com o nome da
--    atividade: renomear a atividade jogava a cotação em "Sem Disciplina"
--    e reimportar duplicava. Agora a importação grava o vínculo.
-- 2. Backfill do vínculo pelo nome (mesmo critério que a tela usava).
-- 3. RLS por equipe (get_team_user_ids), como projects, scope_items,
--    payments e budget_quote_items. Antes cada pessoa só via as cotações
--    que ela mesma criou: quem não importou via a aba vazia / R$ 0.
--
-- Idempotente.

ALTER TABLE public.budget_quotes
  ADD COLUMN IF NOT EXISTS activity_id uuid REFERENCES public.project_activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discipline text;

CREATE INDEX IF NOT EXISTS idx_budget_quotes_activity ON public.budget_quotes(activity_id);

UPDATE public.budget_quotes bq
SET activity_id = pa.id,
    discipline = COALESCE(bq.discipline, pa.discipline)
FROM public.project_activities pa
WHERE bq.activity_id IS NULL
  AND pa.project_id = bq.project_id
  AND lower(trim(pa.name)) = lower(trim(bq.services_description));

DROP POLICY IF EXISTS "Users can view own budget_quotes" ON public.budget_quotes;
DROP POLICY IF EXISTS "Users can create budget_quotes" ON public.budget_quotes;
DROP POLICY IF EXISTS "Users can update own budget_quotes" ON public.budget_quotes;
DROP POLICY IF EXISTS "Users can delete own budget_quotes" ON public.budget_quotes;
DROP POLICY IF EXISTS "Team can view budget_quotes" ON public.budget_quotes;
DROP POLICY IF EXISTS "Team can create budget_quotes" ON public.budget_quotes;
DROP POLICY IF EXISTS "Team can update budget_quotes" ON public.budget_quotes;
DROP POLICY IF EXISTS "Team can delete budget_quotes" ON public.budget_quotes;

CREATE POLICY "Team can view budget_quotes" ON public.budget_quotes FOR SELECT
  USING (user_id IN (SELECT public.get_team_user_ids()));
CREATE POLICY "Team can create budget_quotes" ON public.budget_quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Team can update budget_quotes" ON public.budget_quotes FOR UPDATE
  USING (user_id IN (SELECT public.get_team_user_ids()));
CREATE POLICY "Team can delete budget_quotes" ON public.budget_quotes FOR DELETE
  USING (user_id IN (SELECT public.get_team_user_ids()));
