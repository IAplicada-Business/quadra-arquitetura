/**
 * Os dois cronogramas da Trilha do Cliente.
 *
 * O **cronograma reverso** é o que a equipe já mantém em
 * `project_activities`, com a conta em dias úteis de
 * `src/lib/reverseSchedule.ts`. A trilha mostrava essas atividades
 * agrupadas em blocos de obra — útil para "em que fase estamos", inútil
 * para "o que atrasou e quanto". Aqui elas aparecem como cronograma
 * mesmo: prazo, decorrido, faltante e atraso, linha a linha.
 *
 * O **cronograma de compra e contratação** não existe como tabela, e é
 * de propósito: ele é derivado. A pergunta que ele responde não é "o
 * que falta comprar" (isso a lista de compras já diz), é *quando* cada
 * coisa precisa estar fechada para não segurar a obra. Essa data sai de
 * duas coisas que o sistema já tem — quando a disciplina começa no
 * cronograma reverso, e quanto o fornecedor leva para entregar — e por
 * isso ela se move sozinha quando a obra se move.
 *
 * Puro: sem React e sem Supabase.
 */

import { businessDaysUntil, computeReverseMetrics, todayIso, type ReverseMetrics } from "@/lib/reverseSchedule";
import { isBusinessDay } from "@/lib/businessCalendar";
import { normalizaDisciplina, type Proposta } from "@/lib/portalScenarios";
import type { PortalActivity, PortalPurchase } from "@/lib/portal";

/* ------------------------------------------------------------------ */
/* Cronograma reverso                                                  */
/* ------------------------------------------------------------------ */

export type SituacaoEtapa = "concluida" | "em_andamento" | "atrasada" | "a_iniciar";

export interface EtapaCronograma {
  id: string;
  nome: string;
  disciplina: string;
  inicio: string | null;
  termino: string | null;
  progresso: number;
  situacao: SituacaoEtapa;
  metricas: ReverseMetrics;
}

/**
 * Se a etapa está concluída.
 *
 * Vem do progresso, não do status: no banco há atividades com
 * `progress_percent = 100` e `status = 'pendente'`, porque o status só
 * é mexido quando alguém lembra e o progresso é atualizado na medição.
 * Confiar no status mostraria obra pronta como pendente.
 */
export function etapaConcluida(a: PortalActivity): boolean {
  if ((a.progress_percent ?? 0) >= 100) return true;
  const s = (a.status ?? "").toLowerCase();
  return s === "concluida" || s === "concluído" || s === "concluida" || s === "executado";
}

function situacaoDaEtapa(a: PortalActivity, m: ReverseMetrics): SituacaoEtapa {
  if (etapaConcluida(a)) return "concluida";
  if (m.isOverdue) return "atrasada";
  if (m.hasStarted) return "em_andamento";
  return "a_iniciar";
}

/**
 * As etapas na ordem em que acontecem.
 *
 * Ordena por data de início e usa `position` só para desempatar: o
 * banco tem várias atividades com a mesma posição (duas "position: 1",
 * duas "position: 4"), então posição sozinha embaralharia a leitura.
 */
export function cronogramaReverso(
  atividades: PortalActivity[] = [],
  hoje: string = todayIso(),
): EtapaCronograma[] {
  return [...atividades]
    .map((a) => {
      const metricas = computeReverseMetrics(
        { start_date: a.start_date, end_date: a.end_date, status: etapaConcluida(a) ? "concluida" : a.status },
        hoje,
      );
      return {
        id: a.id,
        nome: a.name,
        disciplina: normalizaDisciplina(a.discipline),
        inicio: a.start_date,
        termino: a.end_date,
        progresso: Math.max(0, Math.min(100, a.progress_percent ?? 0)),
        situacao: situacaoDaEtapa(a, metricas),
        metricas,
      };
    })
    .sort((a, b) => {
      if (a.inicio && b.inicio && a.inicio !== b.inicio) return a.inicio < b.inicio ? -1 : 1;
      if (a.inicio && !b.inicio) return -1;
      if (!a.inicio && b.inicio) return 1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

export interface ResumoCronograma {
  total: number;
  concluidas: number;
  emAndamento: number;
  atrasadas: number;
  aIniciar: number;
  /** Fração concluída, de 0 a 1, pela média do progresso. */
  avanco: number;
  primeiroInicio: string | null;
  ultimoTermino: string | null;
  /** Maior atraso em dias úteis entre as etapas atrasadas. */
  maiorAtraso: number;
}

export function resumoDoCronograma(etapas: EtapaCronograma[]): ResumoCronograma {
  const datas = (sel: (e: EtapaCronograma) => string | null) =>
    etapas.map(sel).filter((d): d is string => !!d).sort();
  const inicios = datas((e) => e.inicio);
  const terminos = datas((e) => e.termino);
  return {
    total: etapas.length,
    concluidas: etapas.filter((e) => e.situacao === "concluida").length,
    emAndamento: etapas.filter((e) => e.situacao === "em_andamento").length,
    atrasadas: etapas.filter((e) => e.situacao === "atrasada").length,
    aIniciar: etapas.filter((e) => e.situacao === "a_iniciar").length,
    avanco: etapas.length === 0 ? 0 : etapas.reduce((s, e) => s + e.progresso, 0) / (etapas.length * 100),
    primeiroInicio: inicios[0] ?? null,
    ultimoTermino: terminos[terminos.length - 1] ?? null,
    maiorAtraso: etapas.reduce((m, e) => Math.max(m, e.metricas.overdueDays), 0),
  };
}

/* ------------------------------------------------------------------ */
/* Prazo de entrega do fornecedor                                      */
/* ------------------------------------------------------------------ */

/**
 * Lê os dias úteis de entrega de um texto livre.
 *
 * `delivery_time` é digitado à mão ("15 dias", "3 semanas", "45 dias
 * corridos"). Semana vira 5 dias úteis e "corridos" vira o equivalente
 * aproximado em úteis (5/7), porque o cronograma inteiro corre em dias
 * úteis e misturar as duas contas atrasaria a data de compra. Texto que
 * não diz número nenhum devolve null, e aí a linha aparece sem data em
 * vez de com uma data inventada.
 */
export function diasDeEntrega(texto: string | null | undefined): number | null {
  const t = (texto ?? "").toLowerCase().trim();
  if (!t) return null;

  const semanas = t.match(/(\d{1,3})\s*semanas?/);
  if (semanas) return Number(semanas[1]) * 5;

  const meses = t.match(/(\d{1,2})\s*(?:mês|meses|mes|meses)/);
  if (meses) return Number(meses[1]) * 21;

  const dias = t.match(/(\d{1,3})\s*dias?/);
  if (dias) {
    const n = Number(dias[1]);
    if (/corrid/.test(t)) return Math.max(1, Math.round((n * 5) / 7));
    return n;
  }

  const soNumero = t.match(/^(\d{1,3})$/);
  if (soNumero) return Number(soNumero[1]);

  return null;
}

/**
 * Recua `dias` úteis a partir de `data`.
 *
 * Escrito aqui porque o `addBusinessDays` do calendário só anda para a
 * frente (o laço dele para em `remaining > 0`), e o cronograma de
 * compras é todo para trás: parte da data em que a obra precisa do
 * item e volta o prazo de entrega.
 */
export function recuaDiasUteis(data: string, dias: number): string {
  const cur = new Date(data + "T00:00:00Z");
  let restantes = Math.max(0, Math.floor(dias));
  /* Teto defensivo: cronograma de obra não recua anos, e sem ele um
     prazo absurdo digitado no banco travaria a tela. */
  for (let guard = 0; restantes > 0 && guard < 3650; guard++) {
    cur.setUTCDate(cur.getUTCDate() - 1);
    if (isBusinessDay(cur)) restantes--;
  }
  return cur.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Compra e contratação                                                */
/* ------------------------------------------------------------------ */

export type TipoLinha = "contratacao" | "compra";
export type UrgenciaLinha = "fechado" | "atrasado" | "esta_semana" | "proximo" | "sem_data";

export interface LinhaDeCompra {
  id: string;
  tipo: TipoLinha;
  nome: string;
  disciplina: string;
  fornecedor: string | null;
  valor: number | null;
  condicao: string | null;
  /** Quando a obra precisa do item: início da disciplina no cronograma. */
  precisaEm: string | null;
  /** Último dia para fechar sem segurar a obra (precisaEm − entrega). */
  fecharAte: string | null;
  /** Dias úteis de entrega que entraram na conta. */
  entregaDias: number | null;
  urgencia: UrgenciaLinha;
  /** Dias úteis até a data limite; negativo se já passou. */
  diasAteLimite: number | null;
  status: string;
  link: string | null;
}

/** Primeira data de obra de cada disciplina. */
export function inicioPorDisciplina(etapas: EtapaCronograma[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of etapas) {
    if (!e.inicio) continue;
    const atual = m.get(e.disciplina);
    if (!atual || e.inicio < atual) m.set(e.disciplina, e.inicio);
  }
  return m;
}

function urgenciaDe(fecharAte: string | null, dias: number | null, fechado: boolean): UrgenciaLinha {
  if (fechado) return "fechado";
  if (!fecharAte || dias === null) return "sem_data";
  if (dias < 0) return "atrasado";
  if (dias <= 5) return "esta_semana";
  return "proximo";
}

/**
 * As contratações pendentes, com a data limite para fechar cada uma.
 *
 * Só entram disciplinas que ainda não foram contratadas; a já fechada
 * aparece marcada, sem data de cobrança, porque cobrar prazo de algo
 * assinado é ruído.
 */
export function linhasDeContratacao(
  disciplinas: { nome: string; contratada: boolean; aprovada: Proposta | null; maisBarata: Proposta }[],
  inicios: Map<string, string>,
  hoje: string,
): LinhaDeCompra[] {
  return disciplinas.map((d) => {
    const p = d.aprovada ?? d.maisBarata;
    const precisaEm = inicios.get(d.nome) ?? null;
    const entregaDias = diasDeEntrega(p.prazoEntrega);
    const fecharAte = precisaEm && entregaDias !== null ? recuaDiasUteis(precisaEm, entregaDias) : precisaEm;
    const diasAteLimite = fecharAte ? businessDaysUntil(fecharAte, hoje) : null;
    return {
      id: `contratacao-${d.nome}`,
      tipo: "contratacao" as const,
      nome: d.nome,
      disciplina: d.nome,
      fornecedor: p.fornecedor,
      valor: p.total,
      condicao: p.condicao,
      precisaEm,
      fecharAte,
      entregaDias,
      urgencia: urgenciaDe(fecharAte, diasAteLimite, d.contratada),
      diasAteLimite: d.contratada ? null : diasAteLimite,
      status: d.contratada ? "Contratado" : "A contratar",
      link: null,
    };
  });
}

const COMPRADO = new Set(["comprado", "entregue", "instalado"]);

/**
 * As compras do cliente, com a data limite de cada uma.
 *
 * Quando a compra tem prazo próprio cadastrado (`deadline`), ele manda:
 * foi alguém da equipe que o definiu olhando o caso. Só quando não tem
 * é que a data sai da categoria casada com o cronograma.
 */
export function linhasDeCompra(
  compras: PortalPurchase[],
  inicios: Map<string, string>,
  hoje: string,
): LinhaDeCompra[] {
  return compras.map((c) => {
    const disciplina = normalizaDisciplina(c.category);
    const precisaEm = inicios.get(disciplina) ?? null;
    const fechado = COMPRADO.has((c.status ?? "").toLowerCase());
    const fecharAte = c.deadline ?? precisaEm;
    const diasAteLimite = fecharAte ? businessDaysUntil(fecharAte, hoje) : null;
    return {
      id: c.id,
      tipo: "compra" as const,
      nome: c.name,
      disciplina,
      fornecedor: (c.supplier_name ?? "").trim() || null,
      valor: c.value,
      condicao: (c.payment_info ?? "").trim() || null,
      precisaEm,
      fecharAte,
      entregaDias: null,
      urgencia: urgenciaDe(fecharAte, diasAteLimite, fechado),
      diasAteLimite: fechado ? null : diasAteLimite,
      status: rotuloDeCompra(c.status),
      link: (c.product_link ?? "").trim() || null,
    };
  });
}

function rotuloDeCompra(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "comprado":
      return "Comprado";
    case "entregue":
      return "Entregue";
    case "instalado":
      return "Instalado";
    default:
      return "A comprar";
  }
}

export interface CronogramaDeCompras {
  linhas: LinhaDeCompra[];
  atrasadas: number;
  estaSemana: number;
  pendentes: number;
  /** Quanto ainda falta desembolsar nas linhas em aberto. */
  aDesembolsar: number;
}

/**
 * Compra e contratação numa lista só, pela ordem da cobrança.
 *
 * Contratar marcenaria e comprar o porcelanato são a mesma pergunta
 * para quem está fazendo a obra — "o que eu preciso resolver primeiro
 * para não parar" — e separar em duas listas obriga o cliente a cruzar
 * as datas de cabeça.
 */
export function cronogramaDeCompras(linhas: LinhaDeCompra[]): CronogramaDeCompras {
  const peso: Record<UrgenciaLinha, number> = {
    atrasado: 0,
    esta_semana: 1,
    proximo: 2,
    sem_data: 3,
    fechado: 4,
  };
  const ordenadas = [...linhas].sort((a, b) => {
    if (peso[a.urgencia] !== peso[b.urgencia]) return peso[a.urgencia] - peso[b.urgencia];
    if (a.fecharAte && b.fecharAte && a.fecharAte !== b.fecharAte) return a.fecharAte < b.fecharAte ? -1 : 1;
    if (a.fecharAte && !b.fecharAte) return -1;
    if (!a.fecharAte && b.fecharAte) return 1;
    return (b.valor ?? 0) - (a.valor ?? 0);
  });
  const abertas = ordenadas.filter((l) => l.urgencia !== "fechado");
  return {
    linhas: ordenadas,
    atrasadas: ordenadas.filter((l) => l.urgencia === "atrasado").length,
    estaSemana: ordenadas.filter((l) => l.urgencia === "esta_semana").length,
    pendentes: abertas.length,
    aDesembolsar: abertas.reduce((s, l) => s + (l.valor ?? 0), 0),
  };
}
