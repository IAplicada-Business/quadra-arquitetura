import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BlogCard } from "@/components/blog/BlogCard";
import { FOTOS_PADRAO } from "@/components/blog/fotos";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import type { BlogPostSummary } from "@/lib/blog";
import { SITE_DEFAULTS, type BlogContent } from "@/lib/siteContent";
import { ItemArtigo, Revelar, Rotulo, Sequencia } from "@/components/landing/Motion";

const LINK_CLASS =
  "group inline-flex items-center gap-2 text-brand-terracota shrink-0 transition-colors hover:text-brand-vinho";
const LINK_STYLE = {
  fontFamily: "'Jost', sans-serif",
  fontSize: "11px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
} as const;

/**
 * O blog Obra sem Surto na landing.
 *
 * Com artigos publicados (Configurações → Blog), a dobra mostra os três
 * mais novos, que abrem em /blog/:slug, e o link do cabeçalho leva ao
 * índice. Sem nenhum, volta às chamadas de site_content: o site nunca
 * fica sem a dobra, e o texto pode estar pronto antes de o artigo ir ao ar.
 *
 * Nas chamadas, o link do artigo fica no campo de descrição. Chamada sem
 * link vira cartão sem link. Clicar num cartão morto frustra mais do que
 * não ter o que clicar, então o que não tem destino não finge ser clicável.
 */
export function BlogSection({
  content = SITE_DEFAULTS.blog,
  posts = [],
}: {
  content?: BlogContent;
  posts?: BlogPostSummary[];
}) {
  const lista = content.layout === "lista";
  const noAr = posts.slice(0, 3);
  const temPosts = noAr.length > 0;

  return (
    <section id="blog" className="bg-brand-pedra py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <Revelar className="border-b border-brand-navy/10 pb-6 mb-10 md:mb-12">
          <Rotulo className="mb-4">{content.eyebrow}</Rotulo>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              className="title-balance text-brand-navy min-w-0"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-terracota))", fontStyle: "italic" } }} />
            </h2>
            {temPosts ? (
              <Link to="/blog" className={LINK_CLASS} style={LINK_STYLE}>
                {content.linkLabel || "Ver todos os artigos"}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              content.linkLabel &&
              content.linkUrl && (
                <a href={content.linkUrl} target="_blank" rel="noreferrer" className={LINK_CLASS} style={LINK_STYLE}>
                  {content.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              )
            )}
          </div>
        </Revelar>

        <Sequencia className={lista ? "divide-y divide-brand-navy/10 border-t border-brand-navy/10" : "grid grid-cols-1 md:grid-cols-3 gap-6"}>
          {temPosts
            ? noAr.map((post, i) => <BlogCard key={post.slug} post={post} index={i} lista={lista} />)
            : content.items.map((artigo, i) => {
                const link = (artigo.desc ?? "").trim();
                /* No modelo lista a chamada é o conteúdo: sem foto, a leitura
                   fica em coluna única e cabe mais artigo na mesma altura. */
                const Capa = (
                  <>
                    <div className={lista ? "hidden" : "aspect-[16/10] overflow-hidden"}>
                      <img
                        src={artigo.image || FOTOS_PADRAO[i % FOTOS_PADRAO.length]}
                        alt={artigo.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className={lista ? "py-5 min-w-0" : "pt-5 min-w-0"}>
                      {artigo.tag && (
                        <p
                          className="text-brand-terracota mb-2"
                          style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.14em", fontWeight: 500 }}
                        >
                          {artigo.tag}
                        </p>
                      )}
                      <h3
                        className="text-brand-navy"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", lineHeight: 1.3, fontWeight: 500 }}
                      >
                        {artigo.title}
                      </h3>
                    </div>
                  </>
                );

                return (
                  <ItemArtigo key={i} className="min-w-0">
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="group block min-w-0">
                        {Capa}
                      </a>
                    ) : (
                      <div className="group min-w-0">{Capa}</div>
                    )}
                  </ItemArtigo>
                );
              })}
        </Sequencia>
      </div>
    </section>
  );
}
