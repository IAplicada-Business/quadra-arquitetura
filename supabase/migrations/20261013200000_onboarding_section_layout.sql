-- Layout por seção do onboarding do cliente.
--
-- Antes o layout era fixo pela posição: a primeira seção virava a capa e as
-- demais, cards numerados. Agora cada seção escolhe o seu: capa, card,
-- texto (corrido), destaque ou midia (mídia ao lado do texto).
--
-- NULL = automático pela posição (o comportamento antigo), então as seções
-- que já existem não mudam de aparência. Nas cópias por obra
-- (onboarding_project_overrides.sections_json) o campo vai dentro do JSON.

ALTER TABLE public.onboarding_sections
  ADD COLUMN IF NOT EXISTS layout text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_sections_layout_check'
  ) THEN
    ALTER TABLE public.onboarding_sections
      ADD CONSTRAINT onboarding_sections_layout_check
      CHECK (layout IS NULL OR layout IN ('capa', 'card', 'texto', 'destaque', 'midia'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
