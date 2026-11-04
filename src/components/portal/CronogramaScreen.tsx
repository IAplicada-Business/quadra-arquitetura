import { useMemo } from "react";
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

function TabelaReversa({ etapas }: { etapas: EtapaCronograma[] }) {
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

/** Uma linha do cronograma de compra e contratação. */
function LinhaCompra({ linha }: { linha: LinhaDeCompra }) {
  const prazo =
    linha.urgencia === "fechado"
      ? linha.status
      : linha.diasAteLimite === null
        ? "sem data"
        : linha.diasAteLimite < 0
          ? `${Math.abs(linha.diasAteLimite)} dias atrás`
          : linha.diasAteLimite === 0
            ? "hoje"
            : `em ${linha.diasAteLimite} dias úteis`;

  return (
    <li className="grid grid-cols-1 items-start gap-x-4 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-[var(--trilha-navy)]">{linha.nome}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${CORES_URGENCIA[linha.urgencia]}`}>
            {linha.tipo === "contratacao" ? "contratar" : "comprar"}
          </span>
          {linha.link && (
            <a
              href={linha.link}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[var(--trilha-terracota)] hover:underline"
              aria-label={`Abrir o produto ${linha.nome}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--trilha-navy)]/50">
          {[
            linha.fornecedor,
            linha.condicao,
            /* Por que a data é essa: é a parte que o cliente não
               adivinha e a que justifica a urgência. */
            linha.precisaEm && linha.entregaDias
              ? `obra precisa em ${formatDateBR(linha.precisaEm)} · ${linha.entregaDias} dias de entrega`
              : linha.precisaEm
                ? `obra precisa em ${formatDateBR(linha.precisaEm)}`
                : null,
          ]
            .filter(Boolean)
            .join(" · ") || linha.disciplina}
        </p>
      </div>
      <div className="sm:text-right">
        {linha.valor !== null && (
          <p className="text-sm font-medium tabular-nums text-[var(--trilha-navy)]">{formatCurrencyBRL(linha.valor)}</p>
        )}
        <p
          className={`text-xs ${
            linha.urgencia === "atrasado" ? "font-medium text-[#8c4a36]" : "text-[var(--trilha-navy)]/55"
          }`}
        >
          {linha.fecharAte && linha.urgencia !== "fechado" ? `fechar até ${formatDateBR(linha.fecharAte)}` : prazo}
        </p>
      </div>
    </li>
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

            <Card className="border-[var(--trilha-areia)] bg-white/95">
              <CardContent className="p-0">
                <ul className="divide-y divide-[var(--trilha-areia)] px-5">
                  {compras.linhas.map((l) => (
                    <LinhaCompra key={l.id} linha={l} />
                  ))}
                </ul>
              </CardContent>
            </Card>
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
