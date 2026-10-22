import { semTravessao } from "@/lib/siteContent";

/**
 * Blog "Obra sem Surto".
 *
 * Os artigos vivem em blog_posts (Markdown) e o site lê só os publicados,
 * pelas funções get_public_blog_posts / get_public_blog_post. Este arquivo
 * é a parte sem rede: tipos, leitura das linhas e pequenas regras de texto,
 * para poder testar sem banco.
 */

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  category: string;
  author: string;
  publishedAt: string | null;
  /** Quantidade de caracteres do corpo, para estimar o tempo de leitura. */
  readingChars: number;
}

export interface BlogPost extends Omit<BlogPostSummary, "readingChars"> {
  content: string;
}

/** Linha como o admin edita: tudo do banco, inclusive rascunho. */
export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string;
  category: string;
  author: string;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
}

export type BlogPostDraft = Omit<BlogPostRow, "id" | "updated_at"> & { id?: string };

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** A regra da casa vale para o que é publicado, como em siteContent. */
const limpo = (v: unknown): string => semTravessao(str(v));

export function parseBlogSummary(raw: unknown): BlogPostSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const slug = str(r.slug);
  const title = limpo(r.title).trim();
  if (!slug || !title) return null;
  return {
    slug,
    title,
    excerpt: limpo(r.excerpt),
    coverUrl: str(r.cover_url),
    category: limpo(r.category),
    author: limpo(r.author),
    publishedAt: typeof r.published_at === "string" ? r.published_at : null,
    readingChars: typeof r.reading_chars === "number" ? r.reading_chars : 0,
  };
}

export function parseBlogPost(raw: unknown): BlogPost | null {
  const base = parseBlogSummary(raw);
  if (!base) return null;
  const { readingChars: _ignorado, ...resto } = base;
  return { ...resto, content: limpo((raw as Record<string, unknown>).content) };
}

/** "Orçamento: o que ninguém conta!" -> "orcamento-o-que-ninguem-conta". */
export function slugify(texto: string): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/** ~1.100 caracteres por minuto de leitura em português. Nunca menos de 1. */
export function readingMinutes(chars: number): number {
  return Math.max(1, Math.ceil((chars || 0) / 1100));
}

const FORMATO = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export function formatPostDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : FORMATO.format(d);
}
