import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type LeadMagnetContent } from "@/lib/siteContent";

/**
 * O checklist gratuito.
 *
 * O botão leva ao formulário de contato em vez de baixar um arquivo: a
 * troca é "seu contato pelo material", e é lá que o lead é registrado.
 * Quando houver um PDF hospedado, basta trocar o destino — mas enquanto
 * não houver, mandar para o formulário é honesto e não promete um
 * download que não existe.
 *
 * A imagem é opcional. Sem ela, entra um bloco com ícone no lugar, para
 * a dobra não ficar com metade vazia antes de alguém subir o mockup.
 */
export function LeadMagnetSection({ content = SITE_DEFAULTS.leadMagnet }: { content?: LeadMagnetContent }) {
  const smoothTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="material" className="bg-brand-rosa py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-6 md:px-10 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 md:gap-12 items-center"
        >
          <div className="min-w-0">
            <p
              className="text-brand-vinho mb-4"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
            >
              {content.eyebrow}
            </p>
            <h2
              className="title-balance text-brand-navy mb-4"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(1.5rem, 2.6vw, 2.125rem)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-vinho))", fontStyle: "italic" } }} />
            </h2>
            <p
              className="text-brand-navy/65 mb-7 max-w-lg"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.7, fontWeight: 300 }}
            >
              <RichText text={content.body} />
            </p>
            {content.ctaLabel && (
              <button
                onClick={() => smoothTo("#contato")}
                className="bg-brand-navy text-brand-areia px-8 py-4 text-sm transition-colors hover:bg-brand-vinho"
                style={{ fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
              >
                {content.ctaLabel}
              </button>
            )}
          </div>

          <div className="min-w-0">
            {content.image ? (
              <img
                src={content.image}
                alt="Checklist da Quadra Arquitetura"
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
            ) : (
              <div
                aria-hidden
                className="w-full aspect-square border border-brand-navy/15 bg-brand-creme/60 grid place-items-center"
              >
                <FileText className="h-12 w-12 text-brand-navy/20" strokeWidth={1} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
