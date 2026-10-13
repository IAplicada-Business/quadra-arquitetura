import { useRef } from "react";
import { motion } from "framer-motion";
import foundersPhoto from "@/assets/founders-photo.png";
import { RichText, stripRichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, splitParagraphs, type AboutContent } from "@/lib/siteContent";
import { Item, ItemLista, Revelar, Rotulo, SequenciaDl, SequenciaUl } from "@/components/landing/Motion";
import { useParalaxe } from "@/hooks/useParalaxe";

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
  const secao = useRef<HTMLElement>(null);
  /* Curso maior que o do hero: esta dobra fica muito mais tempo em
     cena, então a foto tem espaço para andar sem parecer apressada. */
  const y = useParalaxe(secao, 70);

  return (
    <section ref={secao} id="sobre" className="bg-brand-creme overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* ── Texto ──────────────────────────────────────────────── */}
        <Revelar className="order-2 lg:order-1 min-w-0 px-6 py-16 md:px-10 lg:pl-14 lg:pr-12 lg:py-24 xl:pl-20">
          <Rotulo className="mb-5">{content.eyebrow}</Rotulo>

          <h2
            className="title-balance text-brand-navy mb-6"
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
            <SequenciaDl className="mt-10 space-y-7 max-w-xl">
              {content.credits.map((socia, i) => (
                <Item key={i} className="min-w-0">
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
                </Item>
              ))}
            </SequenciaDl>
          )}

          {content.badges.length > 0 && (
            <SequenciaUl className="mt-10 flex flex-wrap gap-3">
              {content.badges.map((selo, i) => (
                <ItemLista
                  key={i}
                  className="border border-brand-navy/20 px-4 py-2.5 text-brand-navy/60 whitespace-nowrap"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase" }}
                >
                  {selo.title}
                </ItemLista>
              ))}
            </SequenciaUl>
          )}
        </Revelar>

        {/* ── Foto ───────────────────────────────────────────────── */}
        <div className="order-1 lg:order-2 relative min-h-[320px] lg:min-h-0">
          {/* Mesma folga do hero: a imagem é mais alta que o quadro
              para o paralaxe ter o que consumir nas bordas. */}
          <motion.img
            src={content.photo || foundersPhoto}
            alt={stripRichText(content.title) || "Quadra Arquitetura"}
            className="absolute left-0 w-full object-cover"
            style={{ y, top: "-10%", height: "120%" }}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
