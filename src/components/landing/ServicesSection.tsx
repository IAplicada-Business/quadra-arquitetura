import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, splitParagraphs, type ServicesContent } from "@/lib/siteContent";

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-12 md:mb-16"
        >
          <p
            className="text-brand-terracota mb-5"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
          >
            {content.eyebrow}
          </p>
          <h2
            className="text-brand-navy mb-5"
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
            className="text-brand-navy/60"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.7, fontWeight: 300 }}
          >
            <RichText text={content.subtitle} />
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.items.map((fase, i) => {
            const aberta = abertas.has(i);
            const itens = (fase.bullets ?? "").split("\n").map((t) => t.trim()).filter(Boolean);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="bg-brand-creme border border-brand-navy/10 p-7 md:p-9 min-w-0 flex flex-col"
              >
                {fase.tag && (
                  <p
                    className="text-brand-terracota mb-3"
                    style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.16em", fontWeight: 500 }}
                  >
                    {fase.tag}
                  </p>
                )}

                <h3
                  className="text-brand-navy mb-4"
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
                  className="text-brand-navy/65 flex-1"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.75, fontWeight: 300 }}
                >
                  {splitParagraphs(fase.desc).map((p, j) => (
                    <p key={j} className={j > 0 ? "mt-3" : undefined}>
                      <RichText text={p} />
                    </p>
                  ))}
                </div>

                {itens.length > 0 && (
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
                            className="flex gap-3 text-brand-navy/70 min-w-0"
                            style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.875rem", lineHeight: 1.65, fontWeight: 300 }}
                          >
                            <span aria-hidden className="text-brand-terracota shrink-0">
                              —
                            </span>
                            <span className="min-w-0">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
