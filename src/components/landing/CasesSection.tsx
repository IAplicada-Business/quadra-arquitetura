import { ArrowRight } from "lucide-react";
import carousel1 from "@/assets/carousel-1.jpg";
import carousel2 from "@/assets/carousel-2.jpg";
import carousel3 from "@/assets/carousel-3.jpg";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, splitParagraphs, type PortfolioContent } from "@/lib/siteContent";
import { ItemArtigo, Revelar, Rotulo, Sequencia } from "@/components/landing/Motion";

const FOTOS_PADRAO = [carousel1, carousel2, carousel3];

/**
 * Os cases, contados pelo que foi evitado — não pelo que ficou bonito.
 *
 * A história de cada um vem em três parágrafos, nesta ordem: o que
 * aconteceu, o que foi evitado e onde foi. A posição é o que define o
 * papel de cada um, e isso está escrito na ajuda do campo no admin.
 * A alternativa seria caçar a frase "O que foi evitado" dentro do texto,
 * que quebraria no dia em que alguém escrevesse "Evitamos" — regra
 * posicional é chata, mas não falha em silêncio.
 *
 * Parágrafo que falte simplesmente não aparece: um case recém-cadastrado,
 * com só a história escrita, continua publicável.
 */
export function CasesSection({ content = SITE_DEFAULTS.portfolio }: { content?: PortfolioContent }) {
  const lista = content.layout === "lista";
  return (
    <section id="projetos" className="bg-brand-pedra py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <Revelar className="border-b border-brand-navy/10 pb-6 mb-10 md:mb-14">
          <Rotulo className="mb-4">{content.eyebrow}</Rotulo>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2
              className="title-balance text-brand-navy max-w-2xl min-w-0"
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
            {content.linkLabel && content.linkUrl && (
              <a
                href={content.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 text-brand-terracota shrink-0 transition-colors hover:text-brand-vinho"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase" }}
              >
                {content.linkLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
          </div>
        </Revelar>

        <Sequencia className={lista ? "space-y-6" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
          {content.items.map((caso, i) => {
            const [historia, evitado, meta] = splitParagraphs(caso.desc);

            return (
              <ItemArtigo key={i} className={
                  lista
                    ? "group bg-brand-creme grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-w-0 transition-shadow duration-500 hover:shadow-card"
                    : "group bg-brand-creme flex flex-col min-w-0 transition-shadow duration-500 hover:shadow-card"
                }>
                <div className={lista ? "aspect-[4/3] md:aspect-auto overflow-hidden" : "aspect-[4/3] overflow-hidden"}>
                  <img
                    src={caso.image || FOTOS_PADRAO[i % FOTOS_PADRAO.length]}
                    alt={caso.title}
                    className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                <div className="p-6 md:p-7 flex flex-col flex-1 min-w-0">
                  {caso.tag && (
                    <p
                      className="text-brand-terracota mb-3"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.14em", fontWeight: 500 }}
                    >
                      {caso.tag}
                    </p>
                  )}

                  <h3
                    className="text-brand-navy mb-3"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3125rem", lineHeight: 1.25, fontWeight: 500 }}
                  >
                    {caso.title}
                  </h3>

                  {historia && (
                    <p
                      className="text-brand-navy/75 flex-1"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.875rem", lineHeight: 1.7, fontWeight: 300 }}
                    >
                      <RichText text={historia} />
                    </p>
                  )}

                  {evitado && (
                    <p
                      className="border-l-2 border-brand-terracota pl-4 mt-5 text-brand-navy/75"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.875rem", lineHeight: 1.65, fontStyle: "italic" }}
                    >
                      <RichText text={evitado} styles={{ em: { fontStyle: "italic", fontWeight: 500 } }} />
                    </p>
                  )}

                  {meta && (
                    <p
                      className="border-t border-brand-navy/10 mt-5 pt-4 text-brand-navy/60"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.8125rem" }}
                    >
                      {meta}
                    </p>
                  )}
                </div>
              </ItemArtigo>
            );
          })}
        </Sequencia>
      </div>
    </section>
  );
}
