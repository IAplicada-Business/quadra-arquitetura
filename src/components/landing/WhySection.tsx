import { motion } from "framer-motion";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type WhyContent } from "@/lib/siteContent";

/**
 * O argumento de posicionamento, logo depois da promessa do hero.
 *
 * É uma lista de contrapontos, não de qualidades: cada linha diz o que
 * um outro tipo de profissional entrega e onde ele para. O fecho é a
 * única linha em navy cheio — é a frase que resume a Quadra, e por isso
 * sai do tom esmaecido das anteriores.
 *
 * Coluna única e estreita de propósito: o texto é para ser lido em
 * sequência, e uma grade de cards faria o leitor escolher por onde
 * começar quando a ordem é o próprio argumento.
 */
export function WhySection({ content = SITE_DEFAULTS.why }: { content?: WhyContent }) {
  return (
    <section id="por-que" className="bg-brand-creme py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-6 md:px-10 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p
            className="text-brand-terracota text-center mb-6"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
          >
            {content.eyebrow}
          </p>

          <h2
            className="text-brand-navy text-center mb-12 md:mb-16"
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

          <dl className="max-w-2xl mx-auto">
            {content.items.map((item, i) => (
              <div key={i} className="border-t border-brand-navy/10 py-5 min-w-0">
                {/* O nome e o complemento formam uma frase só ("Construtoras
                    entregam a obra…"), por isso o dt fica fora do fluxo
                    visual mas continua existindo para o leitor de tela. */}
                <dt className="sr-only">{item.title}</dt>
                <dd
                  className="text-brand-navy/60"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: "1rem", lineHeight: 1.7, fontWeight: 300 }}
                >
                  <span className="text-brand-navy/75">{item.title}</span> {item.desc}
                </dd>
              </div>
            ))}

            {content.closing && (
              <div className="border-t border-brand-navy/10 pt-6">
                <p
                  className="text-brand-navy"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(1.125rem, 1.8vw, 1.5rem)",
                    lineHeight: 1.4,
                    fontWeight: 500,
                  }}
                >
                  <RichText
                    text={content.closing}
                    styles={{ em: { color: "hsl(var(--brand-terracota))", fontStyle: "italic" } }}
                  />
                </p>
              </div>
            )}
          </dl>
        </motion.div>
      </div>
    </section>
  );
}
