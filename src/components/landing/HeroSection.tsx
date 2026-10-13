import { motion } from "framer-motion";
import coverImg from "@/assets/socias-cover.jpg";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type HeroContent } from "@/lib/siteContent";

/**
 * Primeira dobra no formato da referência: painel navy à esquerda com a
 * promessa e os números, foto à direita, faixa terracota no pé da foto.
 *
 * Não é mais foto de tela cheia com texto por cima. O motivo é prático:
 * a promessa da Quadra é longa ("do número ao tijolo") e vinha brigando
 * com a imagem por legibilidade. Painel sólido resolve isso sem precisar
 * de camada de escurecimento sobre a foto.
 *
 * No celular a foto vai para cima e o painel desce, porque a frase é o
 * que precisa ser lido primeiro — a foto ilustra, não informa.
 */
export function HeroSection({ content = SITE_DEFAULTS.hero }: { content?: HeroContent }) {
  const smoothTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    /* pt-[68px]: a navbar é fixa e opaca, então a primeira dobra precisa
       começar abaixo dela em vez de passar por baixo. */
    <section id="inicio" className="relative w-full bg-brand-navy pt-[68px] lg:pt-[72px]">
      <div className="grid lg:grid-cols-2 min-h-[640px]">
        {/* ── Painel ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 lg:order-1 flex flex-col justify-center min-w-0 px-6 py-14 md:px-12 lg:px-16 lg:py-20"
        >
          <p
            className="text-brand-terracota mb-6"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
          >
            {content.eyebrow}
          </p>

          <h1
            className="title-balance text-brand-areia mb-6"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(2.25rem, 4vw, 3.75rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            <RichText
              text={content.title}
              styles={{ em: { color: "hsl(var(--brand-terracota))", fontStyle: "italic" } }}
            />
          </h1>

          <p
            className="text-brand-areia/85 max-w-xl mb-9"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "clamp(0.95rem, 1.1vw, 1.0625rem)", lineHeight: 1.75, fontWeight: 300 }}
          >
            <RichText text={content.subtitle} />
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <button
              onClick={() => smoothTo("#contato")}
              className="bg-brand-terracota text-brand-navy px-8 py-4 text-sm transition-colors hover:bg-brand-rosa"
              style={{ fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
            >
              {content.ctaPrimary}
            </button>
            <button
              onClick={() => smoothTo("#jornada")}
              className="text-brand-areia text-sm pb-1 border-b border-brand-areia/40 transition-colors hover:border-brand-areia self-start sm:self-auto"
              style={{ fontFamily: "'Jost', sans-serif", fontWeight: 400 }}
            >
              {content.ctaSecondary}
            </button>
          </div>

          {/* ── Números ──────────────────────────────────────────── */}
          {content.stats.length > 0 && (
            <>
              <div className="h-px bg-brand-areia/20 my-10 max-w-xl" />
              <dl className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-x-10 gap-y-7 max-w-xl">
                {content.stats.map((stat, i) => (
                  <div key={i} className="min-w-0">
                    <dt
                      className="text-brand-terracota"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "clamp(1.75rem, 2.4vw, 2.25rem)",
                        lineHeight: 1.1,
                        fontWeight: 400,
                      }}
                    >
                      {stat.title}
                    </dt>
                    <dd
                      className="text-brand-areia/70 mt-1"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase" }}
                    >
                      {stat.desc}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </motion.div>

        {/* ── Foto ───────────────────────────────────────────────── */}
        <div className="order-1 lg:order-2 relative min-h-[280px] lg:min-h-0">
          <img
            src={content.image || coverImg}
            alt="Camilla e Mariana, sócias da Quadra Arquitetura"
            className="absolute inset-0 w-full h-full object-cover"
            /* O recorte sobe no original para não cortar as cabeças: com
               object-cover centralizado, a foto em pé perde o topo. */
            style={{ objectPosition: "center 18%" }}
          />
        </div>
      </div>

      {/* Faixa de promessa: ocupa a coluna da foto no desktop e a largura
          toda no celular, onde a grade de duas colunas não existe. */}
      {content.note && (
        <div className="lg:grid lg:grid-cols-2">
          <div className="hidden lg:block" />
          <p
            className="bg-brand-terracota text-brand-navy px-6 py-5 md:px-10 text-center min-w-0"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", fontWeight: 500 }}
          >
            {content.note}
          </p>
        </div>
      )}
    </section>
  );
}
