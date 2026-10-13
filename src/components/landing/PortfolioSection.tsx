import { motion } from "framer-motion";
import { ArrowUpRight, Instagram } from "lucide-react";
import carousel1 from "@/assets/carousel-1.jpg";
import carousel2 from "@/assets/carousel-2.jpg";
import carousel3 from "@/assets/carousel-3.jpg";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type PortfolioContent } from "@/lib/siteContent";

// Foto padrão de cada posição quando o projeto ainda não tem imagem enviada.
const FALLBACK_IMAGES = [carousel1, carousel2, carousel3];

export function PortfolioSection({ content = SITE_DEFAULTS.portfolio }: { content?: PortfolioContent }) {
  const projects = content.items.map((item, i) => ({
    ...item,
    image: item.image || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
  }));

  return (
    <section id="projetos" className="relative py-24 md:py-32 bg-brand-rosa">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16 md:mb-20 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
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
                color: "hsl(var(--brand-navy))",
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-terracota))" } }} />
            </h2>
          </motion.div>
          <motion.a
            href={content.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="group inline-flex items-center gap-2 text-brand-navy text-sm transition-colors hover:text-brand-vinho"
            style={{
              fontFamily: "'Jost', sans-serif",
              letterSpacing: "2px",
              textTransform: "uppercase",
              fontWeight: 400,
            }}
          >
            <Instagram className="h-4 w-4" strokeWidth={1.5} />
            {content.linkLabel}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </motion.a>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {projects.map((p, i) => (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: (i % 3) * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden aspect-[4/5] bg-brand-navy/10">
                <img
                  src={p.image}
                  alt={p.title || "Projeto"}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-6"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent 40%, rgba(27,42,74,0.85) 100%)",
                  }}
                >
                  <div className="flex items-center gap-2 text-brand-areia">
                    <span
                      className="text-xs uppercase"
                      style={{ letterSpacing: "3px", fontFamily: "'Jost', sans-serif" }}
                    >
                      Ver projeto
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="pt-5">
                {p.desc && (
                  <p
                    className="text-xs mb-2"
                    style={{
                      color: "hsl(var(--brand-vinho))",
                      letterSpacing: "3px",
                      fontFamily: "'Jost', sans-serif",
                      textTransform: "uppercase",
                      fontWeight: 500,
                    }}
                  >
                    {p.desc}
                  </p>
                )}
                <h3
                  className="transition-colors group-hover:text-brand-vinho"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "1.375rem",
                    color: "hsl(var(--brand-navy))",
                    fontWeight: 400,
                    lineHeight: 1.3,
                  }}
                >
                  {p.title || "Projeto"}
                </h3>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
