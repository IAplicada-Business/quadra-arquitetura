import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, splitParagraphs, type TrailContent } from "@/lib/siteContent";

/**
 * A Trilha do Cliente: o texto à esquerda, uma amostra do painel à
 * direita.
 *
 * A amostra é ilustração, não dado real — por isso o conteúdo dela é
 * editável junto com o resto e não vem de obra nenhuma. Ela existe
 * porque "um painel atualizado a cada visita" é abstrato; ver a barra de
 * progresso, os selos e o aviso de decisão explica em dois segundos o
 * que três parágrafos não explicam.
 *
 * Fica marcada como aria-hidden: para quem usa leitor de tela, repetir
 * os seis passos da amostra só atrapalharia — o texto ao lado já diz
 * tudo que o painel mostra.
 */

/** O selo pega o tom pela situação. Situação desconhecida cai no neutro,
 *  porque o texto é editável e não pode quebrar a tela. */
function tomDoSelo(situacao: string) {
  const s = situacao.trim().toLowerCase();
  if (s.includes("andamento")) return "bg-brand-terracota text-brand-navy";
  if (s.includes("aguardando")) return "bg-brand-terracota/25 text-brand-areia";
  if (s.includes("conclu")) return "bg-brand-areia/10 text-brand-areia/70";
  return "bg-brand-areia/5 text-brand-areia/50";
}

export function TrailSection({ content = SITE_DEFAULTS.trail }: { content?: TrailContent }) {
  const progresso = Math.max(0, Math.min(100, Number(content.demoProgress) || 0));

  return (
    <section id="trilha" className="bg-brand-creme pb-20 md:pb-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <div className="border-t border-brand-navy/10 pt-16 md:pt-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* ── Texto ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            <p
              className="text-brand-terracota mb-5"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
            >
              {content.eyebrow}
            </p>
            <h2
              className="text-brand-navy mb-6"
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
              className="text-brand-navy/60 space-y-4 mb-8"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.75, fontWeight: 300 }}
            >
              {splitParagraphs(content.body).map((p, i) => (
                <p key={i}>
                  <RichText text={p} />
                </p>
              ))}
            </div>

            <ul className="space-y-4">
              {content.items.map((item, i) => (
                <li key={i} className="flex gap-3 min-w-0">
                  <span aria-hidden className="text-brand-terracota shrink-0">
                    —
                  </span>
                  <p
                    className="text-brand-navy/60 min-w-0"
                    style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.7, fontWeight: 300 }}
                  >
                    <span className="text-brand-navy font-medium">{item.title}</span>
                    {item.desc ? <> — {item.desc}</> : null}
                  </p>
                </li>
              ))}
            </ul>

            {content.note && (
              <p
                className="text-brand-navy/45 mt-8"
                style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.8125rem", lineHeight: 1.6, fontStyle: "italic" }}
              >
                {content.note}
              </p>
            )}
          </motion.div>

          {/* ── Amostra do painel ──────────────────────────────── */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="bg-brand-navy p-6 md:p-8 min-w-0"
            style={{ fontFamily: "'Jost', sans-serif" }}
          >
            <div className="flex items-start justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <p
                  className="text-brand-terracota mb-2 truncate"
                  style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase" }}
                >
                  {content.demoSubtitle}
                </p>
                <p
                  className="text-brand-areia truncate"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.375rem", lineHeight: 1.2 }}
                >
                  {content.demoTitle}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p
                  className="text-brand-terracota"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", lineHeight: 1 }}
                >
                  {content.demoDays}
                </p>
                <p className="text-brand-areia/50 mt-1" style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  {content.demoDaysLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 min-w-0">
              <div className="h-1 flex-1 bg-brand-areia/15 rounded-full overflow-hidden">
                <div className="h-full bg-brand-terracota rounded-full" style={{ width: `${progresso}%` }} />
              </div>
              <span className="text-brand-areia/60 shrink-0 tabular-nums" style={{ fontSize: "11px" }}>
                {progresso}% concluído
              </span>
            </div>

            <ul className="mt-6 space-y-0">
              {content.demoSteps.map((etapa, i) => {
                const concluida = (etapa.tag ?? "").trim().toLowerCase().includes("conclu");
                return (
                  <li key={i} className="flex items-start gap-3 border-t border-brand-areia/10 py-3.5 min-w-0 first:border-0">
                    <span
                      className={`mt-0.5 h-4 w-4 rounded-full shrink-0 grid place-items-center ${
                        concluida ? "bg-brand-terracota/80" : "border border-brand-areia/30"
                      }`}
                    >
                      {concluida && <Check className="h-2.5 w-2.5 text-brand-navy" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-brand-areia truncate" style={{ fontSize: "0.875rem", fontWeight: 400 }}>
                        {etapa.title}
                      </p>
                      <p className="text-brand-areia/45 line-clamp-2" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
                        {etapa.desc}
                      </p>
                    </div>
                    {etapa.tag && (
                      <span
                        className={`shrink-0 px-2 py-0.5 whitespace-nowrap ${tomDoSelo(etapa.tag)}`}
                        style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase" }}
                      >
                        {etapa.tag}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            {content.demoDecisionText && (
              <div className="mt-6 border-l-2 border-brand-terracota bg-brand-areia/5 px-4 py-3.5 min-w-0">
                <p className="text-brand-terracota mb-1.5" style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  {content.demoDecisionLabel}
                </p>
                <p className="text-brand-areia/85" style={{ fontSize: "0.8125rem", lineHeight: 1.6 }}>
                  <RichText text={content.demoDecisionText} />
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
