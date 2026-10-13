-- Foto em cada item do checklist de entrega.
--
-- As fotos ficam num bucket PRIVADO, organizadas por obra:
--   delivery-checklist-photos/<project_id>/<item_id>/<arquivo>.jpg
-- e só a equipe dona da obra (mesmo critério de projects:
-- user_id IN get_team_user_ids()) lê, envia ou apaga. O app mostra as
-- imagens com URLs assinadas de curta duração.
--
-- Idempotente: pode rodar de novo sem erro.

ALTER TABLE public.delivery_checklist_items
  ADD COLUMN IF NOT EXISTS photo_paths text[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-checklist-photos',
  'delivery-checklist-photos',
  false,
  15728640, -- 15 MB (o app reduz a foto antes de enviar; margem para fallback)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Team can view checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Team can upload checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Team can update checklist photos" ON storage.objects;
DROP POLICY IF EXISTS "Team can delete checklist photos" ON storage.objects;

-- Primeira pasta do caminho = id da obra; a obra precisa ser da equipe.
CREATE POLICY "Team can view checklist photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'delivery-checklist-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p WHERE p.user_id IN (SELECT public.get_team_user_ids())
    )
  );

CREATE POLICY "Team can upload checklist photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-checklist-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p WHERE p.user_id IN (SELECT public.get_team_user_ids())
    )
  );

CREATE POLICY "Team can update checklist photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'delivery-checklist-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p WHERE p.user_id IN (SELECT public.get_team_user_ids())
    )
  );

CREATE POLICY "Team can delete checklist photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'delivery-checklist-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p WHERE p.user_id IN (SELECT public.get_team_user_ids())
    )
  );
