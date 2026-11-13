-- Análises orçamentárias importadas (HTML gerado fora do sistema).
-- O HTML fica guardado como está e é exibido na aba "Análise orçamentária"
-- da Trilha do cliente. Não altera budget_quotes nem o orçamento.

CREATE TABLE public.budget_analysis_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  file_name text,
  html text NOT NULL CHECK (length(html) <= 2000000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX budget_analysis_imports_project_idx
  ON public.budget_analysis_imports (project_id, created_at DESC);

ALTER TABLE public.budget_analysis_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget_analysis_imports" ON public.budget_analysis_imports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create budget_analysis_imports" ON public.budget_analysis_imports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget_analysis_imports" ON public.budget_analysis_imports FOR DELETE USING (auth.uid() = user_id);
