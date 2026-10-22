-- Blog "Obra sem Surto" dentro do site institucional.
--
-- Contexto: a dobra de blog da landing só guardava chamadas com link para
-- fora (site_content, blog.items). Agora os artigos moram aqui e têm página
-- própria em /blog e /blog/:slug.
--
-- Mesmo desenho de site_content: isolamento por team_id (helpers de
-- 20260929120000), edição pelo time logado, leitura pública só por função
-- SECURITY DEFINER. O visitante anônimo nunca lê a tabela: rascunho e
-- agendamento futuro não vazam.
--
-- content é Markdown. status 'draft' nunca aparece no site; 'published' só
-- aparece quando published_at <= now(), o que permite agendar.

CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL DEFAULT public.get_my_team_id(),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_posts_team_slug_unique UNIQUE (team_id, slug)
);

CREATE INDEX blog_posts_team_published_idx
  ON public.blog_posts (team_id, published_at DESC)
  WHERE status = 'published';

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view blog_posts" ON public.blog_posts FOR SELECT
  USING (team_id IN (SELECT public.get_my_team_ids()));
CREATE POLICY "Team can create blog_posts" ON public.blog_posts FOR INSERT
  WITH CHECK (team_id IN (SELECT public.get_my_team_ids()));
CREATE POLICY "Team can update blog_posts" ON public.blog_posts FOR UPDATE
  USING (team_id IN (SELECT public.get_my_team_ids()))
  WITH CHECK (team_id IN (SELECT public.get_my_team_ids()));
CREATE POLICY "Team can delete blog_posts" ON public.blog_posts FOR DELETE
  USING (team_id IN (SELECT public.get_my_team_ids()));

-- updated_at/updated_by carimbados pelo banco; ao publicar sem data, a data
-- de publicação é o momento da publicação.
CREATE OR REPLACE FUNCTION public.stamp_blog_post()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER stamp_blog_post BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.stamp_blog_post();

-- Lista pública: sem o corpo, que pode ser longo e só a página do artigo usa.
CREATE OR REPLACE FUNCTION public.get_public_blog_posts(p_team_id uuid)
RETURNS TABLE (
  slug text, title text, excerpt text, cover_url text,
  category text, author text, published_at timestamptz, reading_chars integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bp.slug, bp.title, bp.excerpt, bp.cover_url, bp.category, bp.author,
         bp.published_at, length(bp.content)
  FROM blog_posts bp
  WHERE bp.team_id = p_team_id
    AND bp.status = 'published'
    AND bp.published_at <= now()
  ORDER BY bp.published_at DESC
$$;

CREATE OR REPLACE FUNCTION public.get_public_blog_post(p_team_id uuid, p_slug text)
RETURNS TABLE (
  slug text, title text, excerpt text, content text, cover_url text,
  category text, author text, published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bp.slug, bp.title, bp.excerpt, bp.content, bp.cover_url, bp.category,
         bp.author, bp.published_at
  FROM blog_posts bp
  WHERE bp.team_id = p_team_id
    AND bp.slug = p_slug
    AND bp.status = 'published'
    AND bp.published_at <= now()
$$;

REVOKE ALL ON FUNCTION public.get_public_blog_posts(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_blog_post(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_blog_posts(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_blog_post(uuid, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
