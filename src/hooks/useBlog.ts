import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { SITE_TEAM_ID } from "@/lib/siteContent";
import {
  parseBlogPost,
  parseBlogSummary,
  type BlogPost,
  type BlogPostDraft,
  type BlogPostRow,
  type BlogPostSummary,
} from "@/lib/blog";

export const PUBLIC_BLOG_LIST_KEY = ["public-blog-posts", SITE_TEAM_ID] as const;
export const publicBlogPostKey = (slug: string) => ["public-blog-post", SITE_TEAM_ID, slug] as const;
export const BLOG_ADMIN_KEY = ["blog-posts-admin"] as const;

/** Mesma tolerância da landing: banco lento não trava a página. */
const FETCH_TIMEOUT_MS = 4000;

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const { data, error } = await supabase
      .rpc(fn as never, args as never)
      .abortSignal(controller.signal);
    if (error) throw error;
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Artigos publicados, do mais novo ao mais antigo. Falha vira lista vazia. */
export function usePublicBlogPosts() {
  const query = useQuery({
    queryKey: PUBLIC_BLOG_LIST_KEY,
    queryFn: async (): Promise<BlogPostSummary[]> => {
      const rows = await rpc<unknown[] | null>("get_public_blog_posts", { p_team_id: SITE_TEAM_ID });
      return (rows ?? []).map(parseBlogSummary).filter((p): p is BlogPostSummary => p != null);
    },
    staleTime: 60 * 1000,
    retry: false,
  });
  return { posts: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}

/** Um artigo pelo slug. `post` null depois de carregar = não existe (ou não está no ar). */
export function usePublicBlogPost(slug: string | undefined) {
  const query = useQuery({
    queryKey: publicBlogPostKey(slug ?? ""),
    enabled: !!slug,
    queryFn: async (): Promise<BlogPost | null> => {
      const rows = await rpc<unknown[] | null>("get_public_blog_post", { p_team_id: SITE_TEAM_ID, p_slug: slug });
      return parseBlogPost(rows?.[0]);
    },
    staleTime: 60 * 1000,
    retry: false,
  });
  return { post: query.data ?? null, isLoading: query.isLoading, isError: query.isError };
}

/** Artigos do time logado (inclui rascunhos), para Configurações → Blog. */
export function useBlogPostsAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BLOG_ADMIN_KEY,
    enabled: !!user,
    queryFn: async (): Promise<BlogPostRow[]> => {
      const { data, error } = await supabase
        .from("blog_posts" as never)
        .select("id, slug, title, excerpt, content, cover_url, category, author, status, published_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BlogPostRow[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: BLOG_ADMIN_KEY });
    queryClient.invalidateQueries({ queryKey: ["public-blog-posts"] });
    queryClient.invalidateQueries({ queryKey: ["public-blog-post"] });
  };

  const save = useMutation({
    mutationFn: async (draft: BlogPostDraft) => {
      const { id, ...campos } = draft;
      // team_id vem do DEFAULT (get_my_team_id); updated_* do trigger.
      const q = supabase.from("blog_posts" as never);
      const { error } = id
        ? await q.update(campos as never).eq("id", id)
        : await q.insert(campos as never);
      if (error) throw error;
    },
    onSuccess: (_d, draft) => {
      invalidate();
      toast({ title: draft.status === "published" ? "Artigo publicado" : "Rascunho salvo" });
    },
    onError: (e: Error) => {
      const duplicado = /blog_posts_team_slug_unique|duplicate key/i.test(e.message);
      toast({
        title: "Erro ao salvar",
        description: duplicado ? "Já existe um artigo com esse endereço (slug)." : e.message,
        variant: "destructive",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_posts" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Artigo excluído" });
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  return { posts: query.data ?? [], isLoading: query.isLoading, save, remove };
}
