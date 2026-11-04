import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { formatCurrencyBRL, formatDateShort } from "@/lib/portal";
import { COMPRA_ETAPAS, resumirCompras, type CompraEtapa, type CompraItem } from "@/lib/portalCompras";
import { SectionTitle, type ScreenProps } from "./shared";

const CARD_STYLE: Record<CompraEtapa, string> = {
  decidir: "border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)]/10",
  pedido: "border-[var(--trilha-areia)] bg-white",
  rota: "border-[var(--trilha-areia)] bg-white",
  entregue: "border-[var(--trilha-areia)] bg-white",
};

function prazoTexto(i: CompraItem): string {
  if (!i.deadline) return "";
  const d = formatDateShort(i.deadline);
  if (i.etapa === "decidir") return `Decidir até ${d}`;
  if (i.etapa === "entregue") return "Na obra";
  return `Previsto ${d}`;
}

function EtapaBadge({ etapa, passo }: { etapa: CompraEtapa; passo: number }) {
  const label = COMPRA_ETAPAS.find((e) => e.key === etapa)!.label;
  const strong = etapa === "decidir";
  return (
    <div className="flex flex-col items-end gap-1.5">
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ${
          strong ? "bg-[var(--trilha-terracota)] text-white" : "bg-[var(--trilha-areia)] text-[var(--trilha-navy)]"
        }`}
      >
        {label}
      </span>
      <div className="flex w-[78px] gap-[3px]" aria-hidden>
        {COMPRA_ETAPAS.map((e) => (
          <span key={e.key} className={`h-1 flex-1 rounded-full ${e.passo <= passo ? "bg-[var(--trilha-terracota)]" : "bg-[var(--trilha-navy)]/15"}`} />
        ))}
      </div>
    </div>
  );
}

/** Compras (Tela 6): tudo que precisa ser comprado, por categoria, com link do produto. */
export function ComprasScreen({ data }: ScreenProps) {
  const resumo = useMemo(() => resumirCompras(data.purchases ?? []), [data.purchases]);

  return (
    <div data-testid="screen-compras">
      <SectionTitle
        title="Compras"
        subtitle="Tudo que precisa ser comprado, separado por categoria, com o link do produto especificado. A Quadra já conferiu modelo e referência: você aprova e compra."
      />

      {resumo.categorias.length === 0 ? (
        <p className="text-sm text-[var(--trilha-navy)]/60" data-testid="compras-vazio">
          Ainda não há itens de compra especificados para esta obra.
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="col-span-2 rounded-md bg-[var(--trilha-navy)] p-4 md:col-span-1" data-testid="compras-total">
              <p className="text-[10.5px] font-medium uppercase tracking-widest text-[var(--trilha-terracota)]">Total especificado</p>
              <p className="mt-1.5 font-display text-xl text-[var(--trilha-areia)]">{formatCurrencyBRL(resumo.total)}</p>
            </div>
            {COMPRA_ETAPAS.map((e) => (
              <div key={e.key} className={`rounded-md border p-4 ${CARD_STYLE[e.key]}`} data-testid={`compras-qtd-${e.key}`}>
                <p className="text-[10.5px] font-medium uppercase tracking-widest text-[var(--trilha-navy)]/70">{e.label}</p>
                <p className="mt-1.5 font-display text-xl text-[var(--trilha-navy)]">{resumo.porEtapa[e.key]}</p>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            {resumo.categorias.map((cat) => (
              <section key={cat.nome} className="rounded-md border border-[var(--trilha-areia)] bg-white p-5" data-testid={`compras-cat-${cat.nome}`}>
                <header className="flex items-baseline justify-between gap-4 border-b border-[var(--trilha-areia)] pb-3">
                  <h3 className="font-display text-lg font-medium text-[var(--trilha-navy)]">{cat.nome}</h3>
                  <div className="text-right">
                    <p className="font-display text-base text-[var(--trilha-terracota)]">{formatCurrencyBRL(cat.total)}</p>
                    <p className="text-[11px] text-[var(--trilha-navy)]/70">
                      {cat.itens.length} {cat.itens.length === 1 ? "item" : "itens"}
                    </p>
                  </div>
                </header>
                <ul>
                  {cat.itens.map((i) => (
                    <li key={i.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--trilha-areia)] py-3.5 last:border-b-0 md:grid-cols-[2.4fr_1.2fr_1fr_1fr] md:items-center">
                      <div>
                        <p className="text-sm leading-snug text-[var(--trilha-navy)]">{i.name}</p>
                        {i.supplier_name && <p className="mt-0.5 text-[11px] text-[var(--trilha-navy)]/70">{i.supplier_name}</p>}
                        {i.product_link && (
                          <a
                            href={i.product_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 border-b border-[var(--trilha-terracota)]/40 text-[11.5px] text-[var(--trilha-terracota)]"
                          >
                            Ver produto <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        )}
                      </div>
                      <div className="row-span-2 justify-self-end md:order-last md:row-span-1">
                        <EtapaBadge etapa={i.etapa} passo={i.passo} />
                      </div>
                      <p className="text-[11.5px] text-[var(--trilha-navy)]/70 md:order-2">{prazoTexto(i)}</p>
                      <p className="text-right text-sm tabular-nums text-[var(--trilha-navy)] md:order-3">{i.value != null ? formatCurrencyBRL(i.value) : "—"}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
