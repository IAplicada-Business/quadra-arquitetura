import { motion } from "framer-motion";
import foundersPhoto from "@/assets/founders-photo.png";
import { RichText, stripRichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, splitParagraphs, type AboutContent } from "@/lib/siteContent";

/**
 * Quem é a Quadra: texto à esquerda, foto sangrando à direita.
 *
 * A foto perdeu a moldura decorativa e a entrada deslocada no eixo X —
 * as duas coisas que empurravam a página e davam rolagem horizontal em
 * 375px. Agora ela ocupa a metade direita inteira e para aí, o que
 * dispensa o overflow-hidden que estava segurando o estrago.
 *
 * Cada sócia tem área e função próprias: é o que separa "duas
 * arquitetas" de "uma empresa com duas donas", e responde à pergunta que
 * o cliente não faz em voz alta — com quem eu falo sobre o quê.
 */
export function AboutSection({ content = SITE_DEFAULTS.about }: { content?: AboutContent }) {
  return (
    <section id="sobre" className="bg-brand-creme">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* ── Texto ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 lg:order-1 min-w-0 px-6 py-16 md:px-12 lg:px-16 lg:py-24"
        >
          <p
            className="text-brand-terracota mb-5"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
          >
            {content.eyebrow}
          </p>

          <h2
            className="text-brand-navy mb-6"
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

          <div
            className="text-brand-navy/60 space-y-4 max-w-xl"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.75, fontWeight: 300 }}
          >
            {splitParagraphs(content.body).map((p, i) => (
              <p key={i}>
                <RichText text={p} />
              </p>
            ))}
          </div>

          {content.credits.length > 0 && (
            <dl className="mt-10 space-y-7 max-w-xl">
              {content.credits.map((socia, i) => (
                <div key={i} className="min-w-0">
                  <dt
                    className="text-brand-navy"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", lineHeight: 1.2, fontWeight: 500 }}
                  >
                    {socia.title}
                  </dt>
                  {socia.tag && (
                    <p
                      className="text-brand-terracota mt-1 mb-2"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase" }}
                    >
                      {socia.tag}
                    </p>
                  )}
                  <dd
                    className="text-brand-navy/60"
                    style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.875rem", lineHeight: 1.7, fontWeight: 300 }}
                  >
                    {socia.desc}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {content.badges.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-3">
              {content.badges.map((selo, i) => (
                <li
                  key={i}
                  className="border border-brand-navy/20 px-4 py-2.5 text-brand-navy/60 whitespace-nowrap"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase" }}
                >
                  {selo.title}
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* ── Foto ───────────────────────────────────────────────── */}
        <div className="order-1 lg:order-2 relative min-h-[320px] lg:min-h-0">
          <img
            src={content.photo || foundersPhoto}
            alt={stripRichText(content.title) || "Quadra Arquitetura"}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
