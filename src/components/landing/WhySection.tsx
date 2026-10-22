import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type WhyContent } from "@/lib/siteContent";
import { Item, Revelar, Rotulo, SequenciaDl } from "@/components/landing/Motion";

/**
 * O argumento de posicionamento, logo depois da promessa do hero.
 *
 * É uma lista de contrapontos, não de qualidades: cada linha diz o que
 * um outro tipo de profissional entrega e onde ele para. O fecho é a
 * única linha em navy cheio, porque é a frase que resume a Quadra, e por
 * isso sai do tom esmaecido das anteriores.
 *
 * No desktop o título fica fixo à esquerda enquanto a lista rola à
 * direita: o argumento continua sendo lido em sequência (a numeração
 * deixa a ordem explícita), e a metade direita da tela deixa de ficar
 * vazia. No celular volta a ser uma coluna só.
 */
export function WhySection({ content = SITE_DEFAULTS.why }: { content?: WhyContent }) {
  return (
    <section id="por-que" className="bg-brand-creme py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-10 lg:gap-20">
          <Revelar className="min-w-0 lg:sticky lg:top-32 lg:self-start">
            <Rotulo className="mb-6">{content.eyebrow}</Rotulo>

            <h2
              className="title-balance text-brand-navy"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(1.75rem, 3.2vw, 2.75rem)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-terracota))", fontStyle: "italic" } }} />
            </h2>
          </Revelar>

          <SequenciaDl className="min-w-0">
            {content.items.map((item, i) => (
              <Item
                key={i}
                modo="lado"
                className="group border-t border-brand-navy/10 py-6 md:py-7 min-w-0 transition-colors duration-300 hover:border-brand-terracota/60"
              >
                {/* O nome e o complemento formam uma frase só ("Construtoras
                    entregam a obra…"), por isso o dt fica fora do fluxo
                    visual mas continua existindo para o leitor de tela. */}
                <dt className="sr-only">{item.title}</dt>
                <dd
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-5 md:gap-7 text-brand-navy/75 transition-colors duration-300 group-hover:text-brand-navy/80"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: "1.0625rem", lineHeight: 1.7, fontWeight: 300 }}
                >
                  {/* Numeração decorativa: a ordem já está na leitura. */}
                  <span
                    aria-hidden
                    className="text-brand-terracota/45 transition-colors duration-300 group-hover:text-brand-terracota"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.75rem", lineHeight: 1.1, fontWeight: 400 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 transition-transform duration-300 group-hover:translate-x-1">
                    <span className="text-brand-navy font-normal">{item.title}</span> {item.desc}
                  </span>
                </dd>
              </Item>
            ))}

            {content.closing && (
              <Item className="border-t border-brand-navy/10 pt-8 flex gap-4 items-start">
                {/* O módulo quadrado do logotipo, como marcador do fecho. */}
                <span aria-hidden className="mt-[0.65em] block h-2.5 w-2.5 shrink-0 bg-brand-terracota" />
                <p
                  className="text-brand-navy min-w-0"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(1.375rem, 2.2vw, 1.875rem)",
                    lineHeight: 1.35,
                    fontWeight: 500,
                  }}
                >
                  <RichText
                    text={content.closing}
                    styles={{ em: { color: "hsl(var(--brand-terracota))", fontStyle: "italic" } }}
                  />
                </p>
              </Item>
            )}
          </SequenciaDl>
        </div>
      </div>
    </section>
  );
}
