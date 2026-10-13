import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type ArchitectsContent } from "@/lib/siteContent";

/**
 * O programa de parceria, em fundo escuro.
 *
 * A dobra muda de cor porque muda de público: tudo acima fala com quem
 * vai morar na obra, esta fala com quem projeta. O corte visual avisa
 * "isto aqui não é para você" sem precisar de uma linha de texto dizendo
 * isso — e quem é arquiteto reconhece a própria seção de longe.
 *
 * Os compromissos vêm numa lista só, com os "nunca" no fim: a promessa
 * de parceria vale mais quando vem acompanhada do que não se faz, e
 * separar em duas listas enfraqueceria as duas.
 */
export function ArchitectsSection({ content = SITE_DEFAULTS.architects }: { content?: ArchitectsContent }) {
  const ehNegativa = (tag?: string) => (tag ?? "").trim().toLowerCase().startsWith("n");

  const smoothTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="arquitetos" className="bg-brand-navy py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          {/* ── Promessa e compromissos ────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            <p
              className="text-brand-terracota mb-5"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
            >
              {content.eyebrow}
            </p>
            <h2
              className="text-brand-areia mb-5"
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
              className="text-brand-areia/70 mb-9 max-w-xl"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.75, fontWeight: 300 }}
            >
              <RichText text={content.body} />
            </p>

            <ul className="space-y-3.5 mb-9">
              {content.promises.map((p, i) => {
                const nao = ehNegativa(p.tag);
                const Icone = nao ? X : Check;
                return (
                  <li key={i} className="flex gap-3 min-w-0">
                    <Icone
                      aria-hidden
                      className={`h-4 w-4 mt-0.5 shrink-0 ${nao ? "text-brand-vinho" : "text-brand-terracota"}`}
                      strokeWidth={2.5}
                    />
                    <span className="sr-only">{nao ? "Nunca:" : "Sim:"}</span>
                    <span
                      className="text-brand-areia/75 min-w-0"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.65, fontWeight: 300 }}
                    >
                      {p.title}
                    </span>
                  </li>
                );
              })}
            </ul>

            {content.ctaLabel && (
              <button
                onClick={() => smoothTo("#contato")}
                className="bg-brand-terracota text-brand-navy px-8 py-4 text-sm transition-colors hover:bg-brand-rosa"
                style={{ fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
              >
                {content.ctaLabel}
              </button>
            )}
          </motion.div>

          {/* ── Ganhos ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-5 content-start">
            {content.benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="border border-brand-areia/15 p-6 min-w-0"
              >
                <h3
                  className="text-brand-terracota mb-3"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", lineHeight: 1.2, fontWeight: 500 }}
                >
                  {b.title}
                </h3>
                <p
                  className="text-brand-areia/65"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.875rem", lineHeight: 1.7, fontWeight: 300 }}
                >
                  {b.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
