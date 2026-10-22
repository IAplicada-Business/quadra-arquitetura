import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Contador } from "@/components/landing/Efeitos";
import coverImg from "@/assets/socias-cover.jpg";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type HeroContent } from "@/lib/siteContent";
import { Item, Rotulo, SequenciaEntrada } from "@/components/landing/Motion";
import { useParalaxe } from "@/hooks/useParalaxe";

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
  const secao = useRef<HTMLElement>(null);
  /* A foto anda 40px contra a rolagem. É curto de propósito: a primeira
     dobra sai de cena rápido, e curso maior aqui vira solavanco em vez
     de profundidade. */
  const y = useParalaxe(secao, 40);

  const smoothTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  /* O rótulo do botão secundário é editável ("Ver a jornada completa",
     "Portfólio"…), e o destino precisa acompanhar o que ele promete: um
     botão "Portfólio" que rola para a jornada quebra a confiança no
     primeiro clique. */
  const destinoSecundario = /portf|case|projeto|obras/i.test(content.ctaSecondary) ? "#projetos" : "#jornada";

  return (
    /* pt-[68px]: a navbar é fixa e opaca, então a primeira dobra precisa
       começar abaixo dela em vez de passar por baixo. */
    <section ref={secao} id="inicio" className="relative w-full overflow-hidden bg-brand-navy pt-[68px] lg:pt-[72px]">
      <div className="grid lg:grid-cols-2 min-h-[640px]">
        {/* ── Painel ─────────────────────────────────────────────── */}
        {/* A trama e a marca d'água ficam numa camada própria: a máscara
            que desvanece a trama esconderia o texto se estivesse nele. */}
        <div className="order-2 lg:order-1 relative flex min-w-0 overflow-hidden">
        <div aria-hidden className="trama-quadra absolute inset-0" />
        <SequenciaEntrada
          atraso={0.15}
          className="relative flex-1 flex flex-col justify-center min-w-0 px-6 py-14 md:px-10 lg:pl-14 lg:pr-12 lg:py-20 xl:pl-20"
        >
          <Item>
          <Rotulo className="mb-6">{content.eyebrow}</Rotulo>
          </Item>

          <Item>
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
          </Item>

          <Item>
          <p
            className="text-brand-areia/85 max-w-xl mb-9"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "clamp(0.95rem, 1.1vw, 1.0625rem)", lineHeight: 1.75, fontWeight: 300 }}
          >
            <RichText text={content.subtitle} />
          </p>
          </Item>

          <Item className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <button
              onClick={() => smoothTo("#contato")}
              className="group inline-flex items-center justify-center gap-3 bg-brand-terracota text-brand-navy px-8 py-4 text-sm transition-colors hover:bg-brand-rosa focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-areia focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy"
              style={{ fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
            >
              {content.ctaPrimary}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => smoothTo(destinoSecundario)}
              className="text-brand-areia text-sm pb-1 border-b border-brand-areia/40 transition-colors hover:border-brand-areia self-start sm:self-auto"
              style={{ fontFamily: "'Jost', sans-serif", fontWeight: 400 }}
            >
              {content.ctaSecondary}
            </button>
          </Item>

          {/* ── Números ──────────────────────────────────────────── */}
          {content.stats.length > 0 && (
            <Item>
              <div className="h-px bg-brand-areia/20 my-10 max-w-xl" />
              {/* Uma faixa de dados: quatro colunas separadas por fio fino,
                  em vez de uma grade 2x2 solta. Abaixo de 520px volta a duas. */}
              <dl className="grid grid-cols-2 min-[520px]:grid-cols-4 gap-x-6 gap-y-7 max-w-xl">
                {content.stats.map((stat, i) => (
                  <div
                    key={i}
                    className="min-w-0 min-[520px]:border-l min-[520px]:border-brand-areia/20 min-[520px]:pl-5 min-[520px]:first:border-l-0 min-[520px]:first:pl-0"
                  >
                    <dt
                      className="text-brand-terracota"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "clamp(1.75rem, 2.4vw, 2.25rem)",
                        lineHeight: 1.1,
                        fontWeight: 400,
                      }}
                    >
                      <Contador valor={stat.title} />
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
            </Item>
          )}
        </SequenciaEntrada>
        </div>

        {/* ── Foto ───────────────────────────────────────────────── */}
        {/* overflow-hidden: a foto é maior que o quadro (folga do paralaxe) e,
            sem o corte, o excedente pintava por cima da faixa terracota logo
            abaixo, escondendo o texto dela. */}
        <div className="order-1 lg:order-2 relative min-h-[280px] lg:min-h-0 overflow-hidden">
          {/* A foto é 18% mais alta que o quadro e começa deslocada para
              cima na mesma medida. Essa folga é o que o paralaxe consome:
              sem ela, deslocar a imagem abriria faixa vazia na borda. */}
          <motion.img
            src={content.image || coverImg}
            alt="Camilla e Mariana, sócias da Quadra Arquitetura"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 w-full object-cover"
            /* O recorte sobe no original para não cortar as cabeças: com
               object-cover centralizado, a foto em pé perde o topo. */
            style={{ objectPosition: "center 18%", y, top: "-9%", height: "118%" }}
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
