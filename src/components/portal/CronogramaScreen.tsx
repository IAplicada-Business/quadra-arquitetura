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
 * O cronograma reverso no formato da planilha Q153: faixa cinza com o
 * título, cabeçalho COMEÇO / TÉRMINO / SERVIÇO EXECUTADO / PRAZO (DIAS
 * ÚTEIS), linhas zebradas com tudo centralizado e o último marco no topo
 * (é "reverso": lê-se de trás para frente, a partir da entrega).
 * As cores de destaque seguem a planilha: verde para o que foi
 * concluído, vermelho para o que está atrasado, rosa para o que está
 * em andamento.
 */
const DESTAQUE_LINHA: Partial<Record<SituacaoEtapa, string>> = {
  concluida: "bg-[#6fcf7f] font-bold",
  atrasada: "bg-[#ff4d4d]",
  em_andamento: "bg-[#ffc7ce]",
};

export function TabelaReversa({ etapas }: { etapas: EtapaCronograma[] }) {
  const linhas = [...etapas].reverse();
  const celula = "border border-[#7f7f7f] px-2 py-[3px] text-center";
  return (
    <div className="overflow-x-auto" data-testid="tabela-reversa">
      <table className="w-full min-w-[640px] border-collapse border border-[#7f7f7f] font-sans text-[12px] leading-tight text-black">
        <thead>
          <tr className="bg-[#bfbfbf]">
            <th colSpan={4} className="border border-[#7f7f7f] px-2 py-5 text-center text-[12px] font-bold">
              CRONOGRAMA REVERSO
            </th>
          </tr>
          <tr className="bg-white font-bold">
            <th className={`${celula} w-[18%]`}>COMEÇO</th>
            <th className={`${celula} w-[18%]`}>TÉRMINO</th>
            <th className={celula}>SERVIÇO EXECUTADO</th>
            <th className={`${celula} w-[20%]`}>PRAZO (DIAS ÚTEIS)</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((e, i) => (
            <tr key={e.id} className={DESTAQUE_LINHA[e.situacao] ?? (i % 2 === 1 ? "bg-[#d9d9d9]" : "bg-white")}>
              <td className={celula}>{formatDateBR(e.inicio)}</td>
              <td className={celula}>{formatDateBR(e.termino)}</td>
              <td className={celula}>{e.nome}</td>
              <td className={celula}>{e.prazoPlanilha ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--trilha-navy)]/60">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 bg-[#6fcf7f] align-middle" />concluída</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 bg-[#ffc7ce] align-middle" />em andamento</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 bg-[#ff4d4d] align-middle" />atrasada</span>
      </p>
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

/** Cor da DATA LIMITE DE FECHAMENTO: vermelho vencida, salmão se é esta semana, verde se já fechou. */
const DESTAQUE_LIMITE: Partial<Record<UrgenciaLinha, string>> = {
  atrasado: "bg-[#ff0000] font-bold",
  esta_semana: "bg-[#f8cbad]",
  fechado: "bg-[#6fcf7f]",
};

/**
 * O cronograma de compra e contratação no formato do "Cronograma de
 * fechamento" da Q153: MÊS/ANO, DATA DE ENTREGA (quando a obra precisa),
 * DATA LIMITE DE FECHAMENTO, DESCRIÇÃO e PRAZO DE ENTREGA, com uma faixa
 * por mês (o mês da data limite) e a data mais próxima primeiro.
 */
export function TabelaFechamento({ linhas }: { linhas: LinhaDeCompra[] }) {
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
  const celula = "border border-[#7f7f7f] px-2 py-[3px] text-center";
  return (
    <div className="overflow-x-auto" data-testid="tabela-fechamento">
      <table className="w-full min-w-[720px] border-collapse border border-[#7f7f7f] font-sans text-[12px] leading-tight text-black">
        <thead>
          <tr className="bg-[#bfbfbf]">
            <th colSpan={5} className="border border-[#7f7f7f] px-2 py-5 text-center text-[12px] font-bold">
              CRONOGRAMA DE FECHAMENTO
            </th>
          </tr>
          <tr className="bg-[#d9d9d9] font-bold">
            <th className={`${celula} w-[13%]`}>MÊS / ANO</th>
            <th className={`${celula} w-[16%]`}>DATA DE ENTREGA</th>
            <th className={`${celula} w-[20%]`}>DATA LIMITE DE FECHAMENTO</th>
            <th className={celula}>DESCRIÇÃO</th>
            <th className={`${celula} w-[16%]`}>PRAZO DE ENTREGA</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <Fragment key={g.mes}>
              <tr className="bg-[#d9d9d9] font-bold">
                <td colSpan={5} className={celula}>{g.mes}</td>
              </tr>
              {g.linhas.map((l) => (
                <tr key={l.id} className="bg-white">
                  <td className={celula}>{g.mes}</td>
                  <td className={celula}>{formatDateBR(l.precisaEm)}</td>
                  <td className={`${celula} ${DESTAQUE_LIMITE[l.urgencia] ?? ""}`}>{formatDateBR(l.fecharAte)}</td>
                  <td className={celula}>
                    {l.nome}
                    {l.link && (
                      <a
                        href={l.link}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1.5 inline-block align-middle text-[var(--trilha-terracota)]"
                        aria-label={`Abrir o produto ${l.nome}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                  <td className={celula}>{l.entregaDias ? `${l.entregaDias} dias úteis` : ""}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--trilha-navy)]/60">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 bg-[#ff0000] align-middle" />data limite vencida</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 bg-[#f8cbad] align-middle" />fechar esta semana</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 bg-[#6fcf7f] align-middle" />já fechado</span>
      </p>
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
