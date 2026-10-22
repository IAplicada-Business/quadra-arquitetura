import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, splitParagraphs, type ServicesContent } from "@/lib/siteContent";
import { Item, Revelar, Rotulo, Sequencia } from "@/components/landing/Motion";

/**
 * As duas fases do serviço, cada uma com o escopo escondido atrás de um
 * clique.
 *
 * O que está incluso é uma lista longa (cinco a seis itens por fase).
 * Deixar as duas abertas de saída empurraria a jornada — que é a dobra
 * seguinte e a mais importante — para fora da primeira rolagem. Quem
 * quer o detalhe abre; quem só quer saber que são duas fases, lê o
 * resumo e segue.
 *
 * Cada fase abre sozinha: são compráveis separadamente, então nada
 * justifica fechar uma ao abrir a outra.
 */
export function ServicesSection({ content = SITE_DEFAULTS.services }: { content?: ServicesContent }) {
  const modelo = content.layout;
  /* "lista" mostra o escopo sempre; "cards" não mostra escopo nenhum.
     Só o modelo "fases" tem o que abrir e fechar. */
  const comAcordeao = modelo !== "lista" && modelo !== "cards";
  const [abertas, setAbertas] = useState<Set<number>>(new Set());

  const alternar = (i: number) =>
    setAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section id="servicos" className="bg-brand-pedra py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <Revelar className="max-w-2xl mb-12 md:mb-16">
          <Rotulo className="mb-5">{content.eyebrow}</Rotulo>
          <h2
            className="title-balance text-brand-navy mb-5"
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
          <p
            className="text-brand-navy/75"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.7, fontWeight: 300 }}
          >
            <RichText text={content.subtitle} />
          </p>
        </Revelar>

        <Sequencia
          className={
            modelo === "lista"
              ? "space-y-6 max-w-3xl mx-auto"
              : modelo === "cards"
                ? "grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-3 gap-5"
                : "grid grid-cols-1 md:grid-cols-2 gap-6"
          }
        >
          {content.items.map((fase, i) => {
            const aberta = comAcordeao ? abertas.has(i) : modelo === "lista";
            const itens = (fase.bullets ?? "").split("\n").map((t) => t.trim()).filter(Boolean);
            /* Fase só com título (conteúdo ainda não preenchido no admin):
               em vez de um cartão baixo e vazio, ganha altura, ancora o
               título embaixo e oferece o próximo passo. */
            const enxuto = !fase.desc.trim() && itens.length === 0;

            return (
              <Item
                key={i}
                className={`group relative overflow-hidden bg-brand-creme border border-brand-navy/10 p-7 md:p-9 min-w-0 flex flex-col transition-[box-shadow,border-color] duration-500 hover:border-brand-terracota/40 hover:shadow-card ${
                  enxuto ? "min-h-[14rem] justify-end" : ""
                }`}
              >
                {/* A linha terracota se risca no hover: o traço de projeto
                    da landing, agora também como resposta ao toque. */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brand-terracota transition-transform duration-700 group-hover:scale-x-100"
                />
                {/* Numeral fantasma: dá peso de "fase" sem competir com o título. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-1 -top-4 select-none text-brand-navy/[0.045]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "8rem", lineHeight: 1, fontWeight: 500 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {fase.tag && (
                  <p
                    className="text-brand-terracota mb-3"
                    style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.16em", fontWeight: 500 }}
                  >
                    {fase.tag}
                  </p>
                )}

                <h3
                  className="title-balance text-brand-navy mb-4"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(1.5rem, 2.2vw, 1.875rem)",
                    lineHeight: 1.2,
                    fontWeight: 400,
                  }}
                >
                  {fase.title}
                </h3>

                <div
                  className="text-brand-navy/75 flex-1"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.75, fontWeight: 300 }}
                >
                  {splitParagraphs(fase.desc).map((p, j) => (
                    <p key={j} className={j > 0 ? "mt-3" : undefined}>
                      <RichText text={p} />
                    </p>
                  ))}
                </div>

                {enxuto && (
                  <button
                    type="button"
                    onClick={() => document.querySelector("#contato")?.scrollIntoView({ behavior: "smooth" })}
                    aria-label={`Falar com a Quadra sobre ${fase.title.trim()}`}
                    className="mt-6 flex w-full items-center justify-between gap-3 border-t border-brand-navy/10 pt-5 text-left text-brand-navy transition-colors hover:text-brand-terracota focus-visible:outline-none focus-visible:text-brand-terracota"
                    style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    <span>Falar com a Quadra</span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                )}

                {itens.length > 0 && comAcordeao && (
                  <>
                    <button
                      type="button"
                      onClick={() => alternar(i)}
                      aria-expanded={aberta}
                      aria-controls={`fase-${i}-escopo`}
                      className="mt-7 flex items-center justify-between gap-3 w-full border-t border-brand-navy/10 pt-5 text-left text-brand-navy transition-colors hover:text-brand-terracota"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.875rem", fontWeight: 500 }}
                    >
                      <span>Ver o que está incluso</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${aberta ? "rotate-180" : ""}`}
                      />
                    </button>

                    {aberta && (
                      <ul id={`fase-${i}-escopo`} className="mt-5 space-y-2.5">
                        {itens.map((item, j) => (
                          <li
                            key={j}
                            className="flex gap-3 text-brand-navy/70 min-w-0 animate-fade-in motion-reduce:animate-none [animation-fill-mode:backwards]"
                            style={{
                              fontFamily: "'Jost', sans-serif",
                              fontSize: "0.875rem",
                              lineHeight: 1.65,
                              fontWeight: 300,
                              animationDelay: `${j * 60}ms`,
                            }}
                          >
                            <span aria-hidden className="mt-[0.55em] block h-1.5 w-1.5 shrink-0 bg-brand-terracota" />
                            <span className="min-w-0">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {itens.length > 0 && modelo === "lista" && (
                  <ul className="mt-6 border-t border-brand-navy/10 pt-5 space-y-2.5">
                    {itens.map((item, j) => (
                      <li
                        key={j}
                        className="flex gap-3 text-brand-navy/70 min-w-0"
                        style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.875rem", lineHeight: 1.65, fontWeight: 300 }}
                      >
                        <span aria-hidden className="mt-[0.55em] block h-1.5 w-1.5 shrink-0 bg-brand-terracota" />
                        <span className="min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Item>
            );
          })}
        </Sequencia>
      </div>
    </section>
  );
}
