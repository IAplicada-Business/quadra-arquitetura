import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import carousel2 from "@/assets/carousel-2.jpg";
import carousel3 from "@/assets/carousel-3.jpg";
import carousel1 from "@/assets/carousel-1.jpg";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type BlogContent } from "@/lib/siteContent";

const FOTOS_PADRAO = [carousel2, carousel3, carousel1];

/**
 * As chamadas do Obra sem Surto.
 *
 * O link de cada artigo fica no campo de descrição. Artigo sem link vira
 * cartão sem link — ainda aparece, porque a chamada já é conteúdo e o
 * texto pode estar pronto antes de o artigo ir ao ar. Clicar num cartão
 * morto frustra mais do que não ter o que clicar, então o que não tem
 * destino não finge ser clicável.
 */
export function BlogSection({ content = SITE_DEFAULTS.blog }: { content?: BlogContent }) {
  return (
    <section id="blog" className="bg-brand-pedra py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-brand-navy/10 pb-6 mb-10 md:mb-12"
        >
          <p
            className="text-brand-terracota mb-4"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
          >
            {content.eyebrow}
          </p>
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
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {content.items.map((artigo, i) => {
            const link = (artigo.desc ?? "").trim();
            const Capa = (
              <>
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={artigo.image || FOTOS_PADRAO[i % FOTOS_PADRAO.length]}
                    alt={artigo.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="pt-5 min-w-0">
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
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="min-w-0"
              >
                {link ? (
                  <a href={link} target="_blank" rel="noreferrer" className="group block min-w-0">
                    {Capa}
                  </a>
                ) : (
                  <div className="group min-w-0">{Capa}</div>
                )}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
