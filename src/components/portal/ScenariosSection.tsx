import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyBRL, formatDateBR, type PortalData } from "@/lib/portal";
import {
  analiseDeCenarios,
  desembolsos,
  fatias,
  validades,
  type Cenario,
  type ChaveCenario,
  type SituacaoValidade,
} from "@/lib/portalScenarios";
import { todayIso } from "@/lib/reverseSchedule";

/**
 * Análise de cenários: a dobra que o cliente usa para decidir.
 *
 * O desenho vem da referência da Quadra e tem uma ordem de leitura
 * deliberada. Primeiro os cenários lado a lado, para escolher um.
 * Depois a tabela, que mostra *onde* eles diferem — em negrito, porque
 * numa lista de doze disciplinas costumam ser duas ou três. Depois o
 * peso de cada disciplina, que é onde há o que negociar. Por último a
 * validade das propostas e o desembolso, que são as duas perguntas que
 * aparecem na hora de assinar.
 *
 * Nada aqui é cadastrado à parte: tudo sai das cotações que a equipe
 * já lança no sistema. Ver `portalScenarios.ts`.
 */

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--trilha-navy)]/45">{children}</p>
  );
}

function valorCurto(v: number): string {
  if (Math.abs(v) >= 1000) return `R$ ${Math.round(v / 1000).toLocaleString("pt-BR")} mil`;
  return formatCurrencyBRL(v);
}

/** Cartão de um cenário, clicável para virar o cenário em leitura. */
function CartaoCenario({
  cenario,
  ativo,
  onSelecionar,
}: {
  cenario: Cenario;
  ativo: boolean;
  onSelecionar: () => void;
}) {
  const delta = cenario.deltaReferencia;
  return (
    <button
      type="button"
      onClick={onSelecionar}
      aria-pressed={ativo}
      className={`flex flex-col rounded-lg border p-5 text-left transition ${
        ativo
          ? "border-[var(--trilha-navy)] bg-white shadow-sm"
          : "border-[var(--trilha-areia)] bg-white/70 hover:border-[var(--trilha-navy)]/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--trilha-navy)]">{cenario.nome}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            ativo ? "bg-[var(--trilha-navy)] text-white" : "bg-[var(--trilha-areia)] text-[var(--trilha-navy)]/70"
          }`}
        >
          {ativo ? "em leitura" : "ver"}
        </span>
      </div>
      <p className="mt-3 font-display text-2xl text-[var(--trilha-navy)]">{formatCurrencyBRL(cenario.total)}</p>
      {/* Só o econômico é a referência. Quando o escritório aprova
          justamente a proposta mais barata, o recomendado empata com
          ele — e aí a frase certa é "igual ao econômico", não um
          segundo cartão dizendo que também é a referência. */}
      <p className="mt-1 text-xs text-[var(--trilha-navy)]/55">
        {cenario.chave === "economico"
          ? "referência"
          : Math.abs(delta) < 0.5
            ? "igual ao econômico"
            : delta > 0
              ? `${valorCurto(delta)} acima do econômico`
              : `${valorCurto(-delta)} abaixo do econômico`}
      </p>
      <p className="mt-4 border-t border-[var(--trilha-areia)] pt-3 text-xs leading-relaxed text-[var(--trilha-navy)]/65">
        {cenario.resumo}
      </p>
    </button>
  );
}

const CORES_VALIDADE: Record<SituacaoValidade, string> = {
  valida: "bg-[var(--trilha-salvia)]/20 text-[#2f6b55]",
  vence_hoje: "bg-amber-100 text-amber-800",
  vencida: "bg-[var(--trilha-terracota)]/20 text-[#8c4a36]",
  sem_prazo: "bg-[var(--trilha-areia)] text-[var(--trilha-navy)]/60",
};

const ROTULO_VALIDADE: Record<SituacaoValidade, string> = {
  valida: "válida",
  vence_hoje: "vence hoje",
  vencida: "vencida",
  sem_prazo: "sem prazo",
};

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export function ScenariosSection({ data }: { data: PortalData }) {
  const hoje = todayIso();
  const analise = useMemo(() => analiseDeCenarios(data.quotes, data.scope_items), [data.quotes, data.scope_items]);
  const [ativo, setAtivo] = useState<ChaveCenario>("recomendado");

  if (analise.vazio) return null;

  const cenario = analise.cenarios.find((c) => c.chave === ativo) ?? analise.cenarios[0];
  const pedacos = fatias(cenario);
  const lista = validades(cenario, hoje);
  const saidas = desembolsos(cenario).filter((d) => d.entrada !== null);
  const entradaTotal = saidas.reduce((s, d) => s + (d.entrada ?? 0), 0);
  const comValidade = lista.filter((v) => v.situacao !== "sem_prazo");
  const vencidas = lista.filter((v) => v.situacao === "vencida").length;

  return (
    <section className="space-y-5" data-testid="secao-cenarios">
      <div className="max-w-3xl">
        <h3 className="font-display text-2xl text-[var(--trilha-navy)]">Análise de cenários</h3>
        <p className="mt-2 text-sm text-[var(--trilha-navy)]/70">
          Os orçamentos que recebemos de cada fornecedor, combinados em três caminhos possíveis. A tabela atualiza
          sozinha conforme novas propostas chegam.
        </p>
      </div>

      {/* ── Os três cenários ─────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {analise.cenarios.map((c) => (
          <CartaoCenario key={c.chave} cenario={c} ativo={c.chave === cenario.chave} onSelecionar={() => setAtivo(c.chave)} />
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="space-y-5 min-w-0">
          {/* ── Comparativo ──────────────────────────────────────── */}
          <Card className="border-[var(--trilha-areia)] bg-white/95">
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-display text-lg text-[var(--trilha-navy)]">Comparativo entre cenários</h4>
                <p className="text-xs text-[var(--trilha-navy)]/50">em negrito: o que muda em relação ao econômico</p>
              </div>
              {/* A tabela rola na horizontal no celular em vez de
                  espremer quatro colunas de dinheiro em 375px. */}
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[34rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--trilha-areia)] text-left">
                      <th className="pb-2 pr-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--trilha-navy)]/45">
                        Disciplina
                      </th>
                      {analise.cenarios.map((c) => (
                        <th
                          key={c.chave}
                          className="pb-2 pl-3 text-right text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--trilha-navy)]/45"
                        >
                          {c.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analise.disciplinas.map((d) => (
                      <tr key={d.nome} className="border-b border-[var(--trilha-areia)]/60 align-top">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-[var(--trilha-navy)]">{d.nome}</p>
                          <p className="mt-0.5 text-xs text-[var(--trilha-navy)]/50">
                            {d.propostas.length} {d.propostas.length === 1 ? "proposta" : "propostas"}
                            {d.contratada && " · contratada"}
                          </p>
                          {d.nota && <p className="mt-1 text-xs leading-relaxed text-[var(--trilha-navy)]/60">{d.nota}</p>}
                        </td>
                        {analise.cenarios.map((c) => {
                          const e = c.escolhas.find((x) => x.disciplina === d.nome);
                          if (!e) return <td key={c.chave} className="py-3 pl-3 text-right">—</td>;
                          return (
                            <td
                              key={c.chave}
                              className={`py-3 pl-3 text-right tabular-nums ${
                                c.chave === cenario.chave ? "bg-[var(--trilha-areia)]/25" : ""
                              }`}
                            >
                              <p className={e.destoa ? "font-semibold text-[var(--trilha-navy)]" : "text-[var(--trilha-navy)]/80"}>
                                {formatCurrencyBRL(e.proposta.total)}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--trilha-navy)]/45">{e.proposta.fornecedor}</p>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td className="pt-3 pr-3 font-medium text-[var(--trilha-navy)]">Total geral</td>
                      {analise.cenarios.map((c) => (
                        <td key={c.chave} className="pt-3 pl-3 text-right tabular-nums">
                          <p className="font-display text-lg text-[var(--trilha-navy)]">{formatCurrencyBRL(c.total)}</p>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ── Peso de cada disciplina ──────────────────────────── */}
          <Card className="border-[var(--trilha-areia)] bg-white/95">
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-display text-lg text-[var(--trilha-navy)]">O que consome o orçamento</h4>
                <p className="text-xs text-[var(--trilha-navy)]/50">
                  {cenario.nome} · subtotal {formatCurrencyBRL(cenario.subtotal)}
                </p>
              </div>
              <ul className="space-y-2.5">
                {pedacos.map((f) => (
                  <li key={f.disciplina}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-[var(--trilha-navy)]">{f.disciplina}</span>
                      <span className="shrink-0 tabular-nums text-[var(--trilha-navy)]/60">
                        {(f.fracao * 100).toFixed(1)}% · {formatCurrencyBRL(f.valor)}
                      </span>
                    </div>
                    {/* Barra em vez de rosca: comparar comprimentos lado
                        a lado é mais fácil do que comparar ângulos, e a
                        barra cabe no celular sem legenda à parte. */}
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--trilha-areia)]">
                      <div
                        className="h-full rounded-full bg-[var(--trilha-terracota)]"
                        style={{ width: `${Math.max(1, f.fracao * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* ── Validade ─────────────────────────────────────────── */}
          {comValidade.length > 0 && (
            <Card className="border-[var(--trilha-areia)] bg-white/95">
              <CardContent className="p-5">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-display text-lg text-[var(--trilha-navy)]">Validade das propostas</h4>
                  <p className="text-xs text-[var(--trilha-navy)]/50">
                    {vencidas > 0 ? `${vencidas} vencida${vencidas > 1 ? "s" : ""}, pedir revalidação` : "todas em dia"}
                  </p>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {comValidade.map((v) => (
                    <li
                      key={v.proposta.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--trilha-areia)] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[var(--trilha-navy)]">
                          {v.proposta.fornecedor} · {v.proposta.disciplina}
                        </p>
                        <p className="text-xs text-[var(--trilha-navy)]/50">
                          {v.proposta.cotadaEm && `${formatDateBR(v.proposta.cotadaEm)} · `}
                          até {formatDateBR(v.proposta.validaAte)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${CORES_VALIDADE[v.situacao]}`}>
                        {ROTULO_VALIDADE[v.situacao]}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Resumo do cenário em leitura ───────────────────────── */}
        <Card className="relative overflow-hidden border-0 bg-[var(--trilha-navy)] text-[var(--trilha-areia)] lg:sticky lg:top-4">
          <CardContent className="relative p-5">
            <Rotulo>Total de obra</Rotulo>
            <p className="font-display text-xl text-white">{cenario.nome}</p>

            <ul className="mt-4 space-y-1.5 text-sm">
              {cenario.escolhas.map((e) => (
                <li key={e.disciplina} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[var(--trilha-areia)]/85">{e.disciplina}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatCurrencyBRL(e.proposta.total)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1.5 border-t border-white/15 pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[var(--trilha-areia)]/85">Subtotal</span>
                <span className="font-medium tabular-nums">{formatCurrencyBRL(cenario.subtotal)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[var(--trilha-areia)]/85">Imprevistos (5%)</span>
                <span className="font-medium tabular-nums">{formatCurrencyBRL(cenario.imprevistos)}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-white/15 pt-4">
              <Rotulo>Total geral</Rotulo>
              <p className="font-display text-3xl text-white">{formatCurrencyBRL(cenario.total)}</p>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-white/15 pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[var(--trilha-areia)]/85">Já contratado</span>
                <span className="font-medium tabular-nums">{formatCurrencyBRL(cenario.contratado)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[var(--trilha-areia)]/85">A contratar</span>
                <span className="font-medium tabular-nums">{formatCurrencyBRL(cenario.aContratar)}</span>
              </div>
            </div>

            {saidas.length > 0 && (
              <div className="mt-4 border-t border-white/15 pt-4">
                <Rotulo>Desembolso na contratação</Rotulo>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {saidas.map((d) => (
                    <li key={d.disciplina} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[var(--trilha-areia)]/85">
                        {d.disciplina} · {d.condicao}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">{formatCurrencyBRL(d.entrada ?? 0)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-white/10 pt-3">
                  <span className="text-sm text-[var(--trilha-areia)]/85">Total de entradas</span>
                  <span className="font-display text-xl text-white">{formatCurrencyBRL(entradaTotal)}</span>
                </p>
                {/* Honestidade sobre o que a soma não cobre: condição de
                    pagamento é texto livre, e quando o fornecedor não
                    informou não dá para deduzir entrada nenhuma. */}
                {saidas.length < cenario.escolhas.length && (
                  <p className="mt-2 text-xs leading-relaxed text-[var(--trilha-areia)]/55">
                    {cenario.escolhas.length - saidas.length} de {cenario.escolhas.length} propostas sem condição de
                    pagamento informada — fora desta soma.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

/** Lista das propostas de uma disciplina, para quem quiser o detalhe. */
export function DetalheDisciplinas({ data }: { data: PortalData }) {
  const analise = useMemo(() => analiseDeCenarios(data.quotes, data.scope_items), [data.quotes, data.scope_items]);
  if (analise.vazio) return null;

  return (
    <section className="space-y-3" data-testid="detalhe-disciplinas">
      <h3 className="font-display text-2xl text-[var(--trilha-navy)]">Propostas por disciplina</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {analise.disciplinas.map((d) => (
          <Card key={d.nome} className="border-[var(--trilha-areia)] bg-white/95">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-display text-lg text-[var(--trilha-navy)]">{d.nome}</h4>
                {d.amplitude > 0 && (
                  <p className="text-xs text-[var(--trilha-navy)]/50">
                    {valorCurto(d.amplitude)} entre a mais barata e a mais cara
                  </p>
                )}
              </div>
              <ul className="mt-3 divide-y divide-[var(--trilha-areia)]">
                {d.propostas.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm text-[var(--trilha-navy)]">
                        <span className="truncate">{p.fornecedor}</span>
                        {p.status === "aprovado" && (
                          <Check aria-label="aprovada" className="h-3.5 w-3.5 shrink-0 text-[var(--trilha-salvia)]" />
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--trilha-navy)]/50">
                        {[p.condicao, p.prazoEntrega && `entrega ${p.prazoEntrega}`].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums text-[var(--trilha-navy)]">
                        {formatCurrencyBRL(p.total)}
                      </p>
                      {p.material > 0 && (
                        <p className="text-xs text-[var(--trilha-navy)]/45">inclui {valorCurto(p.material)} de material</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
