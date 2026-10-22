import { Link } from "react-router-dom";
import { FOTOS_PADRAO } from "@/components/blog/fotos";
import { formatPostDate, readingMinutes, type BlogPostSummary } from "@/lib/blog";
import { ItemArtigo } from "@/components/landing/Motion";

/** Linha de metadados: "12 de outubro de 2026 · 4 min de leitura". */
export function PostMeta({ post, className = "" }: { post: BlogPostSummary; className?: string }) {
  const partes = [
    formatPostDate(post.publishedAt),
    post.readingChars > 0 ? `${readingMinutes(post.readingChars)} min de leitura` : "",
  ].filter(Boolean);
  if (partes.length === 0) return null;
  return (
    <p className={className} style={{ fontFamily: "'Jost', sans-serif", fontSize: "12px", fontWeight: 300 }}>
      {partes.join(" · ")}
    </p>
  );
}

/**
 * Cartão de artigo. Mesma gramática da dobra de cases: foto 16/10, rótulo
 * em terracota, título em Cormorant. Foto e título sublinham no hover, o
 * cartão inteiro é o link.
 */
export function BlogCard({
  post,
  index = 0,
  lista = false,
  destaque = false,
}: {
  post: BlogPostSummary;
  index?: number;
  lista?: boolean;
  /** Primeiro artigo do índice: foto maior, ocupa duas colunas. */
  destaque?: boolean;
}) {
  return (
    <ItemArtigo className={`min-w-0 ${destaque ? "md:col-span-2" : ""}`}>
      <Link
        to={`/blog/${post.slug}`}
        className="group block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracota focus-visible:ring-offset-4 focus-visible:ring-offset-brand-pedra"
      >
        <div className={lista ? "hidden" : `overflow-hidden ${destaque ? "aspect-[21/10]" : "aspect-[16/10]"}`}>
          <img
            src={post.coverUrl || FOTOS_PADRAO[index % FOTOS_PADRAO.length]}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className={lista ? "py-5 min-w-0" : "pt-5 min-w-0"}>
          {post.category && (
            <p
              className="text-brand-terracota mb-2"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.14em", fontWeight: 500 }}
            >
              {post.category.toUpperCase()}
            </p>
          )}
          <h3
            className="text-brand-navy transition-colors group-hover:text-brand-vinho"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: destaque ? "clamp(1.5rem, 2.4vw, 2rem)" : "1.25rem",
              lineHeight: 1.3,
              fontWeight: 500,
            }}
          >
            {post.title}
          </h3>
          {post.excerpt && (
            <p
              className="text-brand-navy/70 mt-2 line-clamp-3"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", fontWeight: 300, lineHeight: 1.6 }}
            >
              {post.excerpt}
            </p>
          )}
          <PostMeta post={post} className="text-brand-navy/50 mt-3" />
        </div>
      </Link>
    </ItemArtigo>
  );
}
