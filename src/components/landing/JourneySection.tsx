import { motion } from "framer-motion";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type JourneyContent, type SiteListItem } from "@/lib/siteContent";

/**
 * As nove etapas do gerenciamento, agrupadas nos três momentos.
 *
 * A numeração sai da posição na lista, não do conteúdo: o time reordena
 * ou acrescenta etapas no admin sem ter que renumerar na mão — e sem o
 * risco de ficar "01, 02, 04" depois de remover uma do meio.
 *
 * O agrupamento vem da etiqueta de cada etapa casando com o nome do
 * momento. Etapa com etiqueta que não casa com momento nenhum ainda
 * aparece, num grupo sem título, em vez de sumir da página — o site é
 * editável por quem não escreve código, e conteúdo salvo não pode
 * desaparecer por causa de um erro de digitação.
 */
function agrupar(moments: SiteListItem[], steps: SiteListItem[]) {
  const chave = (s: string) => s.trim().toLowerCase();
  const grupos = moments.map((m) => ({ momento: m, etapas: [] as { n: number; etapa: SiteListItem }[] }));
  const orfas: { n: number; etapa: SiteListItem }[] = [];

  steps.forEach((etapa, i) => {
    const n = i + 1;
    const g = grupos.find((g) => chave(g.momento.title) === chave(etapa.tag ?? ""));
    if (g) g.etapas.push({ n, etapa });
    else orfas.push({ n, etapa });
  });

  const comEtapas = grupos.filter((g) => g.etapas.length > 0);
  return orfas.length > 0 ? [...comEtapas, { momento: null, etapas: orfas }] : comEtapas;
}

export function JourneySection({ content = SITE_DEFAULTS.journey }: { content?: JourneyContent }) {
  const grupos = agrupar(content.moments, content.steps);

  return (
    <section id="jornada" className="bg-brand-creme py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* ── Coluna fixa: o que é a jornada ──────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 min-w-0"
          >
            <div className="lg:sticky lg:top-28">
              <p
                className="text-brand-terracota mb-5"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
              >
                {content.eyebrow}
              </p>
              <h2
                className="text-brand-navy mb-5"
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
              <p
                className="text-brand-navy/60 mb-8"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.75, fontWeight: 300 }}
              >
                <RichText text={content.subtitle} />
              </p>

              <ul className="space-y-2.5">
                {content.moments.map((m, i) => (
                  <li key={i} className="flex items-center gap-2.5 min-w-0">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-terracota shrink-0" />
                    <span
                      className="text-brand-navy/60 truncate"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase" }}
                    >
                      {m.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ── Coluna das etapas ───────────────────────────────── */}
          <div className="lg:col-span-7 min-w-0">
            {grupos.map((grupo, gi) => (
              <div key={gi} className={gi > 0 ? "mt-12" : undefined}>
                {grupo.momento && (
                  <p
                    className="text-brand-terracota/80 border-b border-brand-navy/10 pb-2 mb-6"
                    style={{ fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 500 }}
                  >
                    {grupo.momento.title}
                  </p>
                )}

                <ol className="space-y-0">
                  {grupo.etapas.map(({ n, etapa }) => (
                    <motion.li
                      key={n}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="flex gap-5 md:gap-7 border-b border-brand-navy/10 py-6 last:border-0 min-w-0"
                    >
                      <span
                        aria-hidden
                        className="text-brand-terracota/70 shrink-0 tabular-nums"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", lineHeight: 1.2 }}
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <h3
                          className="text-brand-navy mb-2"
                          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", lineHeight: 1.3, fontWeight: 500 }}
                        >
                          {etapa.title}
                        </h3>
                        <p
                          className="text-brand-navy/60"
                          style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.7, fontWeight: 300 }}
                        >
                          {etapa.desc}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
