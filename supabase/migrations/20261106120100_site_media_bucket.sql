-- Idempotente: garante o bucket site-media (imagens e PDF do checklist) e suas policies.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media', 'site-media', true, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml','application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can upload site media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view site media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update site media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete site media" ON storage.objects;

CREATE POLICY "Authenticated users can upload site media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-media');
CREATE POLICY "Anyone can view site media" ON storage.objects FOR SELECT USING (bucket_id = 'site-media');
CREATE POLICY "Authenticated users can update site media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site-media');
CREATE POLICY "Authenticated users can delete site media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-media');
