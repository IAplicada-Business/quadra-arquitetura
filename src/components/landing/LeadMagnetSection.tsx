import { ArrowRight, Check } from "lucide-react";
import logoAzul from "@/assets/logo-azul.png";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type LeadMagnetContent } from "@/lib/siteContent";
import { Revelar } from "@/components/landing/Motion";

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
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <Revelar className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 md:gap-12 items-center">
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
              className="text-brand-navy/75 mb-7 max-w-lg"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.7, fontWeight: 300 }}
            >
              <RichText text={content.body} />
            </p>
            {content.ctaLabel && (
              <button
                onClick={() => smoothTo("#contato")}
                className="group inline-flex items-center gap-3 bg-brand-navy text-brand-areia px-8 py-4 text-sm transition-colors hover:bg-brand-vinho focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-vinho focus-visible:ring-offset-2 focus-visible:ring-offset-brand-rosa"
                style={{ fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
              >
                {content.ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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
              /* Folha de checklist com a assinatura da marca: logotipo, módulos
                 quadrados como caixas de marcação e itens já riscados em
                 terracota. Decorativa, e boa o bastante para ficar no ar até
                 o time subir o mockup real. */
              <div
                aria-hidden
                className="relative w-full aspect-square bg-brand-creme border border-brand-navy/15 shadow-card p-7 md:p-8 flex flex-col rotate-[1.5deg]"
              >
                <img src={logoAzul} alt="" className="h-11 w-auto self-start" />
                <div className="mt-6 h-px bg-brand-navy/15" />
                <ul className="mt-6 flex-1 flex flex-col justify-between">
                  {[78, 92, 64, 85, 58].map((largura, i) => (
                    <li key={i} className="flex items-center gap-4">
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center border ${
                          i < 2 ? "border-brand-terracota bg-brand-terracota" : "border-brand-navy/30"
                        }`}
                      >
                        {i < 2 && <Check className="h-3 w-3 text-brand-navy" strokeWidth={3} />}
                      </span>
                      <span
                        className={`block h-1.5 ${i < 2 ? "bg-brand-navy/25" : "bg-brand-navy/12"}`}
                        style={{ width: `${largura}%` }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Revelar>
      </div>
    </section>
  );
}
