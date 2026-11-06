-- Um único link ativo por obra + rotação atômica do link.
-- Ordem fixa: (1) desativa duplicados, (2) índice único parcial, (3) função de rotação.

-- 1) Mantém só o ativo mais novo de cada obra.
UPDATE public.client_portal_tokens t
SET is_active = false
WHERE t.is_active
  AND EXISTS (
    SELECT 1 FROM public.client_portal_tokens n
    WHERE n.project_id = t.project_id
      AND n.is_active
      AND (n.created_at, n.id) > (t.created_at, t.id)
  );

-- 2) Barra novos duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS client_portal_tokens_one_active_per_project
  ON public.client_portal_tokens (project_id)
  WHERE is_active;

-- 3) Rotação na mesma transação (SECURITY INVOKER: a RLS continua valendo).
CREATE OR REPLACE FUNCTION public.rotate_client_portal_token(p_project_id uuid)
RETURNS public.client_portal_tokens
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.client_portal_tokens;
BEGIN
  UPDATE public.client_portal_tokens
  SET is_active = false
  WHERE project_id = p_project_id AND is_active;

  INSERT INTO public.client_portal_tokens (project_id, user_id)
  VALUES (p_project_id, auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rotate_client_portal_token(uuid) TO authenticated;
