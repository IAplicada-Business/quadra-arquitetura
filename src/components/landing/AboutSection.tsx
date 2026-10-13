import { motion } from "framer-motion";
import { Fragment } from "react";
import foundersPhoto from "@/assets/founders-photo.png";
import { RichText, stripRichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, splitParagraphs, type AboutContent } from "@/lib/siteContent";

export function AboutSection({ content = SITE_DEFAULTS.about }: { content?: AboutContent }) {
  return (
    <section id="sobre" className="relative py-24 md:py-32 bg-brand-rosa">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Photo */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img
                src={content.photo || foundersPhoto}
                alt={stripRichText(content.title) || "Quadra Arquitetura"}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative frame */}
            <div
              className="absolute -bottom-4 -right-4 w-full h-full border-2 pointer-events-none -z-0"
              style={{ borderColor: "hsl(var(--brand-terracota))" }}
            />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-7 lg:pl-8"
          >
            <p
              className="text-xs mb-6"
              style={{
                color: "hsl(var(--brand-terracota))",
                letterSpacing: "6px",
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
              }}
            >
              {content.eyebrow}
            </p>

            <h2
              className="mb-8"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.25rem, 5vw, 4rem)",
                lineHeight: 1.1,
                color: "hsl(var(--brand-vinho))",
                fontWeight: 400,
              }}
            >
              <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-terracota))", fontStyle: "normal" } }} />
            </h2>

            <div
              className="w-12 h-px mb-8"
              style={{ backgroundColor: "hsl(var(--brand-terracota))" }}
            />

            <div
              className="space-y-5"
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "clamp(0.95rem, 1.1vw, 1.0625rem)",
                lineHeight: 1.85,
                color: "hsl(var(--brand-navy))",
                fontWeight: 300,
              }}
            >
              {splitParagraphs(content.body).map((p, i) => (
                <p key={i}>
                  <RichText text={p} />
                </p>
              ))}
            </div>

            <div
              className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: "hsl(var(--brand-vinho))",
                fontSize: "1.125rem",
                fontStyle: "italic",
              }}
            >
              {content.credits.map((c, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <span
                      className="hidden md:inline w-8 h-px"
                      style={{ backgroundColor: "hsl(var(--brand-terracota))" }}
                    />
                  )}
                  <span>{c.title}</span>
                  {c.desc && (
                    <>
                      <span style={{ color: "hsl(var(--brand-terracota))" }}>&middot;</span>
                      <span>{c.desc}</span>
                    </>
                  )}
                </Fragment>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
