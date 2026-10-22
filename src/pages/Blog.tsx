import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogShell } from "@/components/blog/BlogShell";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Revelar, Rotulo, Sequencia } from "@/components/landing/Motion";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { usePublicBlogPosts } from "@/hooks/useBlog";
import { usePublicSiteContent } from "@/hooks/useSiteContent";

const TODAS = "";

/** Índice do blog: todos os artigos no ar, com filtro por editoria. */
export default function Blog() {
  const { content } = usePublicSiteContent();
  const { posts, isLoading } = usePublicBlogPosts();
  const [categoria, setCategoria] = useState(TODAS);

  useDocumentMeta("Blog Obra sem Surto", "Artigos sobre orçamento, decisões e gerenciamento de obra, da Quadra Arquitetura.");

  const categorias = useMemo(
    () => Array.from(new Set(posts.map((p) => p.category).filter(Boolean))),
    [posts],
  );
  const visiveis = categoria === TODAS ? posts : posts.filter((p) => p.category === categoria);

  return (
    <BlogShell>
      <section className="max-w-6xl mx-auto px-6 md:px-10 pb-20 md:pb-28 min-w-0">
        <Revelar className="border-b border-brand-navy/10 pb-8 mb-10 md:mb-12">
          <Rotulo className="mb-4">{content.blog.eyebrow}</Rotulo>
          <h1
            className="title-balance text-brand-navy min-w-0"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            <RichText text={content.blog.title} styles={{ em: { color: "hsl(var(--brand-terracota))", fontStyle: "italic" } }} />
          </h1>
          <p
            className="text-brand-navy/70 mt-4 max-w-2xl"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "1.0625rem", fontWeight: 300, lineHeight: 1.7 }}
          >
            O que resolver antes do primeiro quebra-quebra: orçamento, decisões e o dia a dia de uma obra bem coordenada.
          </p>

          {categorias.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-8" role="group" aria-label="Filtrar por editoria">
              {[TODAS, ...categorias].map((c) => {
                const ativa = c === categoria;
                return (
                  <button
                    key={c || "todas"}
                    type="button"
                    aria-pressed={ativa}
                    onClick={() => setCategoria(c)}
                    className={`px-4 py-2 border text-[11px] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-terracota focus-visible:ring-offset-2 focus-visible:ring-offset-brand-creme ${
                      ativa
                        ? "bg-brand-navy border-brand-navy text-brand-creme"
                        : "border-brand-navy/20 text-brand-navy/70 hover:border-brand-navy hover:text-brand-navy"
                    }`}
                    style={{ fontFamily: "'Jost', sans-serif", letterSpacing: "0.14em", fontWeight: 500 }}
                  >
                    {c || "Todas"}
                  </button>
                );
              })}
            </div>
          )}
        </Revelar>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[16/12] bg-brand-pedra/60 animate-pulse" />
            ))}
          </div>
        ) : visiveis.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-brand-navy" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.75rem" }}>
              Os primeiros artigos estão a caminho.
            </p>
            <p className="text-brand-navy/75 mt-2" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300 }}>
              Enquanto isso, conheça como a Quadra trabalha.
            </p>
            <Link
              to="/"
              className="inline-block mt-6 text-brand-terracota hover:text-brand-vinho transition-colors"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase" }}
            >
              Voltar ao site
            </Link>
          </div>
        ) : (
          /* key = categoria: trocar o filtro refaz a cascata em vez de trocar
             os cartões em silêncio. */
          <Sequencia key={categoria} className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12">
            {visiveis.map((post, i) => (
              <BlogCard key={post.slug} post={post} index={i} destaque={i === 0 && visiveis.length > 2} />
            ))}
          </Sequencia>
        )}
      </section>
    </BlogShell>
  );
}
