import { motion } from "framer-motion";
import { Armchair, ClipboardList, Hammer } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type ServicesContent } from "@/lib/siteContent";

// Ícones seguem a ordem dos cards (repetem se houver mais de 3).
const ICONS = [ClipboardList, Armchair, Hammer];

export function ServicesSection({ content = SITE_DEFAULTS.services }: { content?: ServicesContent }) {
  return (
    <section id="servicos" className="relative py-24 md:py-32 bg-brand-navy overflow-hidden">
      {/* Decorative element */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: "hsl(var(--brand-terracota))" }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1 }}
          className="text-center mb-16 md:mb-20"
        >
          <p
            className="text-xs mb-5"
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
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              color: "hsl(var(--brand-areia))",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-terracota))" } }} />
          </h2>
          <div
            className="w-12 h-px mx-auto mt-8"
            style={{ backgroundColor: "hsl(var(--brand-terracota))" }}
          />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-brand-areia/10">
          {content.items.map((s, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="group relative bg-brand-navy p-10 md:p-12 transition-all duration-500 hover:bg-[#243558]"
              >
                {/* Number */}
                <span
                  className="absolute top-6 right-8 text-brand-terracota/30 transition-colors group-hover:text-brand-terracota/60"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "2rem",
                    fontWeight: 300,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div
                  className="w-14 h-14 mb-8 flex items-center justify-center border transition-colors duration-500 group-hover:bg-brand-terracota group-hover:border-brand-terracota"
                  style={{ borderColor: "hsl(var(--brand-terracota))" }}
                >
                  <Icon
                    className="h-6 w-6 transition-colors duration-500"
                    style={{ color: "hsl(var(--brand-terracota))" }}
                    strokeWidth={1.5}
                  />
                </div>

                <h3
                  className="mb-4 text-brand-areia"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)",
                    fontWeight: 400,
                    lineHeight: 1.2,
                  }}
                >
                  {s.title}
                </h3>

                <p
                  className="text-brand-areia/70 max-w-md"
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "0.9375rem",
                    lineHeight: 1.75,
                    fontWeight: 300,
                  }}
                >
                  {s.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
