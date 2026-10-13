import { ArrowRight } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type TestimonialsContent } from "@/lib/siteContent";
import { ItemFigura, Revelar, Rotulo, Sequencia } from "@/components/landing/Motion";

/**
 * Prova social.
 *
 * Os depoimentos de hoje são espaços reservados, escritos pela própria
 * Quadra, e por isso não levam aspas nem foto: assinar com aspas um
 * texto que o cliente não disse seria inventar depoimento. Quando os
 * reais chegarem, basta trocar o conteúdo no admin — a dobra já está
 * desenhada para recebê-los.
 */
export function TestimonialsSection({ content = SITE_DEFAULTS.testimonials }: { content?: TestimonialsContent }) {
  const destaque = content.layout === "destaque";
  return (
    <section id="depoimentos" className="bg-brand-creme py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <Revelar className="mb-12 md:mb-14">
          <Rotulo className="mb-5">{content.eyebrow}</Rotulo>
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

        <Sequencia className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {content.items.map((dep, i) => (
            <ItemFigura key={i} className={`border border-brand-navy/10 p-7 flex flex-col min-w-0 ${
                destaque && i === 0 ? "md:col-span-2 md:row-span-2 bg-brand-pedra/40" : ""
              }`}>
              <blockquote
                className="text-brand-navy/65 flex-1"
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: destaque && i === 0 ? "1.125rem" : "0.9375rem",
                  lineHeight: 1.75,
                  fontWeight: 300,
                }}
              >
                {dep.desc}
              </blockquote>
              <figcaption className="border-t border-brand-navy/10 mt-6 pt-5 min-w-0">
                <p
                  className="text-brand-navy truncate"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.125rem", fontWeight: 500 }}
                >
                  {dep.title}
                </p>
                {dep.tag && (
                  <p
                    className="text-brand-navy/45 mt-1 truncate"
                    style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.8125rem" }}
                  >
                    {dep.tag}
                  </p>
                )}
              </figcaption>
            </ItemFigura>
          ))}
        </Sequencia>
      </div>
    </section>
  );
}
