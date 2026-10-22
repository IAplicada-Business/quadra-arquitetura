import { useState } from "react";
import { Plus, X } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type FaqContent } from "@/lib/siteContent";
import { Item, Revelar, Rotulo, SequenciaDl } from "@/components/landing/Motion";

/**
 * As perguntas que aparecem antes de fechar.
 *
 * A primeira já vem aberta: ela é a dúvida mais comum ("preciso
 * contratar as duas fases?"), e uma lista inteiramente fechada parece
 * decorativa — quem bate o olho não sabe se vale clicar. Com uma aberta,
 * o leitor vê o tipo de resposta que vai encontrar.
 *
 * Mais de uma pode ficar aberta ao mesmo tempo: fechar a anterior
 * obrigaria a reabrir para comparar duas respostas.
 */
export function FaqSection({ content = SITE_DEFAULTS.faq }: { content?: FaqContent }) {
  const [abertas, setAbertas] = useState<Set<number>>(new Set([0]));

  const alternar = (i: number) =>
    setAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section id="faq" className="bg-brand-creme py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <Revelar className="lg:col-span-5 min-w-0">
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
            {content.note && (
              <p
                className="text-brand-navy/65"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.7, fontWeight: 300 }}
              >
                {content.note}
              </p>
            )}
          </Revelar>

          <SequenciaDl className="lg:col-span-7 min-w-0">
            {content.items.map((item, i) => {
              const aberta = abertas.has(i);
              return (
                <Item key={i} className="border-b border-brand-navy/10 min-w-0">
                  <dt>
                    <button
                      type="button"
                      onClick={() => alternar(i)}
                      aria-expanded={aberta}
                      aria-controls={`faq-${i}`}
                      className="flex items-start justify-between gap-5 w-full py-5 text-left text-brand-navy transition-colors hover:text-brand-terracota"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1875rem", lineHeight: 1.35, fontWeight: 500 }}
                    >
                      <span className="min-w-0">{item.title}</span>
                      {aberta ? (
                        <X aria-hidden className="h-4 w-4 mt-1 shrink-0 text-brand-terracota" />
                      ) : (
                        <Plus aria-hidden className="h-4 w-4 mt-1 shrink-0 text-brand-terracota" />
                      )}
                    </button>
                  </dt>
                  {aberta && (
                    <dd
                      id={`faq-${i}`}
                      className="text-brand-navy/75 pb-6 pr-8 min-w-0"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.75, fontWeight: 300 }}
                    >
                      <RichText text={item.desc} />
                    </dd>
                  )}
                </Item>
              );
            })}
          </SequenciaDl>
        </div>
      </div>
    </section>
  );
}
