import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import coverImg from "@/assets/carousel-1.jpg";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type HeroContent } from "@/lib/siteContent";

export function HeroSection({ content = SITE_DEFAULTS.hero }: { content?: HeroContent }) {
  const smoothTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative w-full h-screen min-h-[640px] overflow-hidden">
      {/* Background image with parallax */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={content.image || coverImg}
          alt="Quadra Arquitetura"
          className="w-full h-full object-cover"
          style={{ objectPosition: "center center" }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(27,42,74,0.75) 0%, rgba(27,42,74,0.65) 50%, rgba(27,42,74,0.85) 100%)",
          }}
        />
        {/* Left-side darkening for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(27,42,74,0.55) 0%, rgba(27,42,74,0.25) 45%, rgba(27,42,74,0) 70%)",
          }}
        />
      </motion.div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl"
        >
          {/* Decorative line */}
          <div className="w-16 h-px bg-brand-terracota mb-8 md:mb-10" />

          {/* Title */}
          <h1
            className="text-brand-areia mb-6 md:mb-8"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: "clamp(2.5rem, 7vw, 6rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-terracota))" } }} />
          </h1>

          {/* Subtitle */}
          <p
            className="text-brand-areia/85 max-w-2xl mb-10 md:mb-12"
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "clamp(1rem, 1.3vw, 1.25rem)",
              lineHeight: 1.7,
              fontWeight: 300,
            }}
          >
            <RichText text={content.subtitle} />
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => smoothTo("#contato")}
              className="group bg-brand-areia text-brand-navy px-8 py-4 text-xs tracking-widest uppercase transition-all hover:bg-white"
              style={{ letterSpacing: "3px", fontWeight: 500 }}
            >
              <span className="inline-block transition-transform group-hover:translate-x-1">
                {content.ctaPrimary} &nbsp;&rarr;
              </span>
            </button>
            <button
              onClick={() => smoothTo("#projetos")}
              className="border border-brand-areia/40 text-brand-areia px-8 py-4 text-xs tracking-widest uppercase transition-all hover:bg-brand-areia/10"
              style={{ letterSpacing: "3px", fontWeight: 400 }}
            >
              {content.ctaSecondary}
            </button>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.button
          onClick={() => smoothTo("#sobre")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-brand-areia/60 flex flex-col items-center gap-2 hover:text-brand-areia transition-colors"
          aria-label="Rolar para baixo"
        >
          <span
            className="text-[10px] uppercase"
            style={{ letterSpacing: "3px", fontFamily: "'Jost', sans-serif" }}
          >
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.button>
      </div>
    </section>
  );
}
