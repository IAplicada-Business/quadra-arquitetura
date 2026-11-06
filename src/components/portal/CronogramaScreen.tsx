import { Fragment, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyBRL, formatDateBR, type PortalData } from "@/lib/portal";
import { analiseDeCenarios } from "@/lib/portalScenarios";
import {
  cronogramaDeCompras,
  cronogramaReverso,
  inicioPorDisciplina,
  linhasDeCompra,
  linhasDeContratacao,
  resumoDoCronograma,
  type EtapaCronograma,
  type LinhaDeCompra,
  type SituacaoEtapa,
  type UrgenciaLinha,
} from "@/lib/portalSchedule";
import { todayIso } from "@/lib/reverseSchedule";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Cronograma: o reverso da obra e o de compra e contratação.
 *
 * São duas perguntas diferentes e por isso duas seções. O reverso
 * responde "como está a obra" — o que já andou, o que atrasou e quanto.
 * O de compra e contratação responde "o que eu preciso resolver agora
 * para a obra não parar", que é a pergunta que custa dinheiro quando
 * ninguém faz.
 *
 * A segunda não é uma lista cadastrada: a data limite de cada linha é
 * calculada recuando o prazo de entrega do fornecedor a partir do dia
 * em que a disciplina começa no cronograma reverso. Quando a obra
 * atrasa, as datas de compra andam junto, sozinhas.
 */

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

const CORES_ETAPA: Record<SituacaoEtapa, string> = {
  concluida: "bg-[var(--trilha-salvia)]/20 text-[#2f6b55]",
  em_andamento: "bg-[var(--trilha-navy)]/10 text-[var(--trilha-navy)]",
  atrasada: "bg-[var(--trilha-terracota)]/20 text-[#8c4a36]",
  a_iniciar: "bg-[var(--trilha-areia)] text-[var(--trilha-navy)]/60",
};

const ROTULO_ETAPA: Record<SituacaoEtapa, string> = {
  concluida: "concluída",
  em_andamento: "em andamento",
  atrasada: "atrasada",
  a_iniciar: "a iniciar",
};

const CORES_URGENCIA: Record<UrgenciaLinha, string> = {
  atrasado: "bg-[var(--trilha-terracota)]/20 text-[#8c4a36]",
  esta_semana: "bg-amber-100 text-amber-800",
  proximo: "bg-[var(--trilha-areia)] text-[var(--trilha-navy)]/70",
  sem_data: "bg-[var(--trilha-areia)] text-[var(--trilha-navy)]/50",
  fechado: "bg-[var(--trilha-salvia)]/20 text-[#2f6b55]",
};

function Kpi({ label, valor, detalhe }: { label: string; valor: string; detalhe?: string }) {
  return (
    <Card className="border-[var(--trilha-areia)] bg-white/95">
      <CardContent className="p-4">
        <p className="trilha-eyebrow">{label}</p>
        <p className="mt-1 font-display text-xl text-[var(--trilha-navy)]">{valor}</p>
        {detalhe && <p className="mt-0.5 text-xs text-[var(--trilha-navy)]/55">{detalhe}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * O cronograma reverso: mesmas colunas, ordem e prazos da planilha Q153
 * (COMEÇO, TÉRMINO, SERVIÇO EXECUTADO, PRAZO EM DIAS ÚTEIS; último marco
 * no topo, porque se lê de trás para frente a partir da entrega), no
 * visual da Trilha. A situação vira selo e marcador lateral, em vez de
 * pintar a linha inteira. No celular cada etapa vira um cartão.
 */
const SELO_SITUACAO: Partial<Record<SituacaoEtapa, { rotulo: string; selo: string; marcador: string }>> = {
  concluida: { rotulo: "Concluída", selo: "bg-[var(--trilha-salvia)]/25 text-[#245844]", marcador: "bg-[var(--trilha-salvia)]" },
  em_andamento: { rotulo: "Em andamento", selo: "bg-[var(--trilha-navy)]/10 text-[var(--trilha-navy)]", marcador: "bg-[var(--trilha-navy)]" },
  atrasada: { rotulo: "Atrasada", selo: "bg-[var(--trilha-terracota)] text-white", marcador: "bg-[var(--trilha-terracota)]" },
};

function Selo({ texto, classe }: { texto: string; classe: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${classe}`}>{texto}</span>;
}

function Legenda({ itens }: { itens: { cor: string; texto: string }[] }) {
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--trilha-navy)]/70">
      {itens.map((i) => (
        <span key={i.texto}><span className={`mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle ${i.cor}`} />{i.texto}</span>
      ))}
    </p>
  );
}

const MOLDURA = "overflow-hidden rounded-xl border border-[var(--trilha-areia)] bg-white/95";
const CABECALHO = "bg-[var(--trilha-navy)] text-[11px] font-semibold uppercase tracking-wide text-white";

export function TabelaReversa({ etapas }: { etapas: EtapaCronograma[] }) {
  const linhas = [...etapas].reverse();
  const celular = useIsMobile();
  return (
    <div data-testid="tabela-reversa">
      <div className={MOLDURA}>
        <p className="border-b border-[var(--trilha-areia)] px-4 py-3 font-display text-base text-[var(--trilha-navy)]">Cronograma reverso</p>
        {celular ? (
          <ul className="divide-y divide-[var(--trilha-areia)]">
            {linhas.map((e) => {
              const sit = SELO_SITUACAO[e.situacao];
              return (
                <li key={e.id} className="relative space-y-1 py-3 pl-5 pr-4">
                  <span className={`absolute inset-y-2 left-2 w-1 rounded-full ${sit?.marcador ?? "bg-[var(--trilha-areia)]"}`} aria-hidden />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--trilha-navy)]">{e.nome}</p>
                    {sit && <Selo texto={sit.rotulo} classe={sit.selo} />}
                  </div>
                  <p className="text-xs tabular-nums text-[var(--trilha-navy)]/70">
                    {formatDateBR(e.inicio)} → {formatDateBR(e.termino)}
                    {e.prazoPlanilha != null ? ` · ${e.prazoPlanilha} dias úteis` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-[var(--trilha-navy)]">
              <thead>
                <tr className={CABECALHO}>
                  <th scope="col" className="w-[16%] px-4 py-2.5 text-left">COMEÇO</th>
                  <th scope="col" className="w-[16%] px-4 py-2.5 text-left">TÉRMINO</th>
                  <th scope="col" className="px-4 py-2.5 text-left">SERVIÇO EXECUTADO</th>
                  <th scope="col" className="w-[18%] px-4 py-2.5 text-right">PRAZO (DIAS ÚTEIS)</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((e, i) => {
                  const sit = SELO_SITUACAO[e.situacao];
                  return (
                    <tr key={e.id} className={i % 2 === 1 ? "bg-[var(--trilha-creme)]" : "bg-white"}>
                      <td className="relative whitespace-nowrap px-4 py-2 tabular-nums">
                        <span className={`absolute inset-y-1 left-0 w-1 rounded-r ${sit?.marcador ?? "bg-transparent"}`} aria-hidden />
                        {formatDateBR(e.inicio)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums">{formatDateBR(e.termino)}</td>
                      <td className="px-4 py-2 text-left">
                        {e.nome}
                        {sit && <span className="ml-2 align-middle"><Selo texto={sit.rotulo} classe={sit.selo} /></span>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{e.prazoPlanilha ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Legenda
        itens={[
          { cor: "bg-[var(--trilha-salvia)]", texto: "concluída" },
          { cor: "bg-[var(--trilha-navy)]", texto: "em andamento" },
          { cor: "bg-[var(--trilha-terracota)]", texto: "atrasada" },
        ]}
      />
    </div>
  );
}

const MESES = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

/** "2026-09-11" → "SETEMBRO/2026" (o mês da data limite, como na planilha). */
function mesAno(iso: string | null): string {
  if (!iso) return "SEM DATA";
  const [ano, mes] = iso.split("-");
  return `${MESES[Number(mes) - 1] ?? ""}/${ano}`;
}

/** Selo da DATA LIMITE DE FECHAMENTO: vencida, esta semana ou já fechado. */
const SELO_LIMITE: Partial<Record<UrgenciaLinha, { rotulo: string; selo: string }>> = {
  atrasado: { rotulo: "Vencida", selo: "bg-[var(--trilha-terracota)] text-white" },
  esta_semana: { rotulo: "Esta semana", selo: "bg-[var(--trilha-terracota)]/15 text-[#8c4a36]" },
  fechado: { rotulo: "Fechado", selo: "bg-[var(--trilha-salvia)]/25 text-[#245844]" },
};

function LinkProduto({ l }: { l: LinhaDeCompra }) {
  if (!l.link) return null;
  return (
    <a
      href={l.link}
      target="_blank"
      rel="noreferrer"
      className="ml-1.5 inline-block align-middle text-[var(--trilha-terracota)]"
      aria-label={`Abrir o produto ${l.nome}`}
    >
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

/**
 * O cronograma de compra e contratação (Cronograma de fechamento da Q153):
 * MÊS/ANO, DATA DE ENTREGA (quando a obra precisa), DATA LIMITE DE
 * FECHAMENTO, DESCRIÇÃO e PRAZO DE ENTREGA, com uma faixa por mês (o mês da
 * data limite) e a data mais próxima primeiro. Mesmo visual do reverso.
 */
export function TabelaFechamento({ linhas }: { linhas: LinhaDeCompra[] }) {
  const celular = useIsMobile();
  const ordenadas = [...linhas].sort((a, b) => {
    if (a.fecharAte && b.fecharAte && a.fecharAte !== b.fecharAte) return a.fecharAte < b.fecharAte ? -1 : 1;
    if (a.fecharAte && !b.fecharAte) return -1;
    if (!a.fecharAte && b.fecharAte) return 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
  const grupos: { mes: string; linhas: LinhaDeCompra[] }[] = [];
  for (const l of ordenadas) {
    const mes = mesAno(l.fecharAte);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.mes === mes) ultimo.linhas.push(l);
    else grupos.push({ mes, linhas: [l] });
  }
  return (
    <div data-testid="tabela-fechamento">
      <div className={MOLDURA}>
        <p className="border-b border-[var(--trilha-areia)] px-4 py-3 font-display text-base text-[var(--trilha-navy)]">Cronograma de fechamento</p>
        {celular ? (
          <div>
            {grupos.map((g) => (
              <section key={g.mes} aria-label={g.mes}>
                <p className="bg-[var(--trilha-areia)] px-4 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--trilha-navy)]">{g.mes}</p>
                <ul className="divide-y divide-[var(--trilha-areia)]">
                  {g.linhas.map((l) => {
                    const lim = SELO_LIMITE[l.urgencia];
                    return (
                      <li key={l.id} className="space-y-1 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-[var(--trilha-navy)]">{l.nome}<LinkProduto l={l} /></p>
                          {lim && <Selo texto={lim.rotulo} classe={lim.selo} />}
                        </div>
                        <p className="text-xs tabular-nums text-[var(--trilha-navy)]/70">
                          Fechar até {formatDateBR(l.fecharAte)} · Entrega {formatDateBR(l.precisaEm)}
                          {l.entregaDias ? ` · ${l.entregaDias} dias úteis` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-[var(--trilha-navy)]">
              <thead>
                <tr className={CABECALHO}>
                  <th scope="col" className="w-[13%] px-4 py-2.5 text-left">MÊS / ANO</th>
                  <th scope="col" className="w-[15%] px-4 py-2.5 text-left">DATA DE ENTREGA</th>
                  <th scope="col" className="w-[22%] px-4 py-2.5 text-left">DATA LIMITE DE FECHAMENTO</th>
                  <th scope="col" className="px-4 py-2.5 text-left">DESCRIÇÃO</th>
                  <th scope="col" className="w-[15%] px-4 py-2.5 text-right">PRAZO DE ENTREGA</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <Fragment key={g.mes}>
                    <tr className="bg-[var(--trilha-areia)] text-[11px] font-semibold tracking-wide">
                      <td colSpan={5} className="px-4 py-1.5">{g.mes}</td>
                    </tr>
                    {g.linhas.map((l, i) => {
                      const lim = SELO_LIMITE[l.urgencia];
                      return (
                        <tr key={l.id} className={i % 2 === 1 ? "bg-[var(--trilha-creme)]" : "bg-white"}>
                          <td className="px-4 py-2 text-[var(--trilha-navy)]/60">{g.mes}</td>
                          <td className="whitespace-nowrap px-4 py-2 tabular-nums">{formatDateBR(l.precisaEm)}</td>
                          <td className="whitespace-nowrap px-4 py-2 tabular-nums">
                            {formatDateBR(l.fecharAte)}
                            {lim && <span className="ml-2 align-middle"><Selo texto={lim.rotulo} classe={lim.selo} /></span>}
                          </td>
                          <td className="px-4 py-2 text-left">{l.nome}<LinkProduto l={l} /></td>
                          <td className="px-4 py-2 text-right tabular-nums">{l.entregaDias ? `${l.entregaDias} dias úteis` : ""}</td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Legenda
        itens={[
          { cor: "bg-[var(--trilha-terracota)]", texto: "data limite vencida" },
          { cor: "bg-[var(--trilha-terracota)]/30", texto: "fechar esta semana" },
          { cor: "bg-[var(--trilha-salvia)]", texto: "já fechado" },
        ]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export function CronogramaScreen({ data }: { data: PortalData }) {
  const hoje = todayIso();

  const etapas = useMemo(() => cronogramaReverso(data.activities, hoje), [data.activities, hoje]);
  const resumo = useMemo(() => resumoDoCronograma(etapas), [etapas]);

  const compras = useMemo(() => {
    const inicios = inicioPorDisciplina(etapas);
    const { disciplinas } = analiseDeCenarios(data.quotes, data.scope_items);
    return cronogramaDeCompras([
      ...linhasDeContratacao(disciplinas, inicios, hoje),
      ...linhasDeCompra(data.purchases ?? [], inicios, hoje),
    ]);
  }, [etapas, data.quotes, data.scope_items, data.purchases, hoje]);

  const temCronograma = etapas.length > 0;
  const temCompras = compras.linhas.length > 0;

  return (
    <div className="space-y-8" data-testid="screen-cronograma">
      <div className="mb-6 max-w-3xl">
        <h2 className="font-display text-3xl text-[var(--trilha-navy)]">Cronograma</h2>
        <p className="mt-2 text-sm text-[var(--trilha-navy)]/70">
          Como a obra está andando e o que precisa ser fechado para ela não parar.
        </p>
      </div>

      {/* ── Cronograma reverso ───────────────────────────────────── */}
      <section className="space-y-4" data-testid="secao-reverso">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-2xl text-[var(--trilha-navy)]">Cronograma reverso</h3>
          {resumo.primeiroInicio && resumo.ultimoTermino && (
            <p className="text-xs text-[var(--trilha-navy)]/55">
              {formatDateBR(resumo.primeiroInicio)} a {formatDateBR(resumo.ultimoTermino)}
            </p>
          )}
        </div>

        {temCronograma ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Avanço" valor={`${Math.round(resumo.avanco * 100)}%`} detalhe={`${resumo.concluidas} de ${resumo.total} etapas`} />
              <Kpi label="Em andamento" valor={String(resumo.emAndamento)} />
              <Kpi
                label="Atrasadas"
                valor={String(resumo.atrasadas)}
                detalhe={resumo.maiorAtraso > 0 ? `maior atraso: ${resumo.maiorAtraso} dias úteis` : undefined}
              />
              <Kpi label="A iniciar" valor={String(resumo.aIniciar)} />
            </div>

            <TabelaReversa etapas={etapas} />
          </>
        ) : (
          <p className="text-sm text-[var(--trilha-navy)]/60">
            O cronograma da obra ainda não foi montado. Assim que as etapas forem lançadas, elas aparecem aqui.
          </p>
        )}
      </section>

      {/* ── Compra e contratação ─────────────────────────────────── */}
      <section className="space-y-4" data-testid="secao-compras">
        <div className="max-w-3xl">
          <h3 className="font-display text-2xl text-[var(--trilha-navy)]">Compra e contratação</h3>
          <p className="mt-2 text-sm text-[var(--trilha-navy)]/70">
            A data limite de cada item vem do cronograma: é o dia em que a obra precisa dele, menos o prazo de entrega
            do fornecedor. Quando a obra se move, estas datas se movem junto.
          </p>
        </div>

        {temCompras ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Kpi label="Atrasadas" valor={String(compras.atrasadas)} detalhe="passaram da data limite" />
              <Kpi label="Esta semana" valor={String(compras.estaSemana)} detalhe="fechar nos próximos 5 dias úteis" />
              <Kpi label="A desembolsar" valor={formatCurrencyBRL(compras.aDesembolsar)} detalhe={`${compras.pendentes} em aberto`} />
            </div>

            <TabelaFechamento linhas={compras.linhas} />
          </>
        ) : (
          <p className="text-sm text-[var(--trilha-navy)]/60">
            Ainda não há compras ou contratações lançadas para esta obra.
          </p>
        )}
      </section>
    </div>
  );
}
