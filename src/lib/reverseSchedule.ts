// Lógica do Cronograma Reverso (a planilha Excel que o time usava).
//
// Tudo aqui é determinístico e em dias úteis (calendário brasileiro de
// src/lib/businessCalendar.ts: sem sábado/domingo, feriados nacionais e
// recesso de fim de ano). As colunas da tabela editável saem destas
// funções:
//
//   Prazo (dias úteis)  = dias úteis entre início e término, inclusive
//   Dias trabalhados    = dias úteis do início até hoje, limitado ao prazo
//   Dias faltantes      = prazo − dias trabalhados
//   Atraso              = dias úteis depois do término, quando não concluída
//
// Datas são strings YYYY-MM-DD; o cálculo roda em UTC pra não sofrer com
// fuso horário (mesma convenção do businessCalendar).

import { isBusinessDay, addBusinessDays, type BusinessDayOptions } from "@/lib/businessCalendar";

function parseIso(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextDay(iso: string): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return toIso(d);
}

/** Data de hoje no fuso local, como YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Conta dias úteis entre `from` e `to`, ambos inclusos.
 * Devolve 0 quando `to` é anterior a `from`.
 */
export function countBusinessDays(from: string, to: string, opts: BusinessDayOptions = {}): number {
  if (!from || !to || to < from) return 0;
  let count = 0;
  const cur = parseIso(from);
  const end = parseIso(to).getTime();
  // Limite defensivo: 20 anos de dias corridos.
  let guard = 0;
  while (cur.getTime() <= end && guard++ < 7300) {
    if (isBusinessDay(cur, opts)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

/**
 * Data de término para uma atividade que começa em `start` e dura
 * `businessDays` dias úteis (o próprio dia de início conta, se for útil).
 */
export function endDateFromBusinessDays(start: string, businessDays: number, opts: BusinessDayOptions = {}): string {
  const days = Math.max(1, Math.floor(businessDays));
  return toIso(addBusinessDays(parseIso(start), days - 1, opts));
}

/** Próximo dia útil a partir de `iso` (o próprio, se já for útil). */
export function nextBusinessDay(iso: string, opts: BusinessDayOptions = {}): string {
  return toIso(addBusinessDays(parseIso(iso), 0, opts));
}

/**
 * Prazo como a planilha Q153 calcula: dias de semana entre início e término,
 * sem descontar feriados e sem contar o dia de início (equivale a
 * NETWORKDAYS(início; término) − 1). É só exibição, para o portal bater com
 * a planilha de referência; o resto do sistema usa countBusinessDays, que
 * respeita feriados e recesso (uma obra não anda no Carnaval).
 */
export function sheetBusinessDays(from: string | null, to: string | null): number | null {
  if (!from || !to || to < from) return null;
  let count = 0;
  const cur = parseIso(from);
  const end = parseIso(to).getTime();
  let guard = 0;
  while (cur.getTime() <= end && guard++ < 7300) {
    const wd = cur.getUTCDay();
    if (wd !== 0 && wd !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return Math.max(0, count - 1);
}

export interface ReverseMetricsInput {
  start_date: string | null;
  end_date: string | null;
  status?: string | null;
}

export interface ReverseMetrics {
  /** Dias úteis entre início e término, inclusive. null sem datas. */
  totalDays: number | null;
  /** Dias úteis já decorridos desde o início (até hoje, inclusive). */
  workedDays: number | null;
  /** Dias úteis que ainda faltam trabalhar. */
  remainingDays: number | null;
  /** Dias úteis de atraso (término já passou e não concluiu). */
  overdueDays: number;
  /** Dias úteis até o início, quando ainda não começou. */
  daysToStart: number | null;
  isFinished: boolean;
  isOverdue: boolean;
  hasStarted: boolean;
}

const FINISHED_STATUSES = new Set(["concluida", "concluido", "executado"]);

/**
 * Métricas de uma linha do cronograma reverso na data `today`.
 */
export function computeReverseMetrics(
  a: ReverseMetricsInput,
  today: string = todayIso(),
  opts: BusinessDayOptions = {},
): ReverseMetrics {
  const isFinished = FINISHED_STATUSES.has(a.status ?? "");
  const start = a.start_date;
  const end = a.end_date ?? a.start_date;

  if (!start || !end) {
    return {
      totalDays: null,
      workedDays: null,
      remainingDays: null,
      overdueDays: 0,
      daysToStart: null,
      isFinished,
      isOverdue: false,
      hasStarted: false,
    };
  }

  const totalDays = Math.max(1, countBusinessDays(start, end, opts));

  if (isFinished) {
    return {
      totalDays,
      workedDays: totalDays,
      remainingDays: 0,
      overdueDays: 0,
      daysToStart: null,
      isFinished,
      isOverdue: false,
      hasStarted: true,
    };
  }

  const hasStarted = today >= start;
  const workedDays = hasStarted ? Math.min(totalDays, countBusinessDays(start, today < end ? today : end, opts)) : 0;
  const remainingDays = Math.max(0, totalDays - workedDays);
  const overdueDays = today > end ? countBusinessDays(nextDay(end), today, opts) : 0;
  const daysToStart = hasStarted ? null : countBusinessDays(today, start, opts) - (isBusinessDay(parseIso(today), opts) ? 1 : 0);

  return {
    totalDays,
    workedDays,
    remainingDays,
    overdueDays,
    daysToStart: daysToStart == null ? null : Math.max(0, daysToStart),
    isFinished,
    isOverdue: overdueDays > 0,
    hasStarted,
  };
}

/** Dias úteis de hoje (exclusive) até `date` (inclusive); negativo se já passou. */
export function businessDaysUntil(date: string, today: string = todayIso(), opts: BusinessDayOptions = {}): number {
  if (date > today) return countBusinessDays(nextDay(today), date, opts);
  if (date < today) return -countBusinessDays(nextDay(date), today, opts);
  return 0;
}

export type ReverseEditField = "start_date" | "end_date" | "duration_days";

export interface ReverseDatePatch {
  start_date: string;
  end_date: string;
  /** Prazo em dias úteis, sempre recalculado das datas. */
  duration_days: number;
}

/**
 * Regras de edição inline (o que a planilha fazia com fórmulas):
 *  - editar o início mantém o término; se o início passar do término,
 *    o término acompanha;
 *  - editar o término mantém o início; se o término voltar antes do
 *    início, o início acompanha;
 *  - editar o prazo (dias úteis) recalcula o término a partir do início.
 * duration_days sempre sai coerente com as datas (dias úteis, inclusive),
 * para o Gantt e o "Recalcular Cronograma" enxergarem o mesmo prazo.
 * Devolve null quando o valor não é válido.
 */
export function applyReverseEdit(
  current: { start_date: string | null; end_date: string | null },
  field: ReverseEditField,
  value: string | number,
  opts: BusinessDayOptions = {},
): ReverseDatePatch | null {
  const curStart = current.start_date ?? current.end_date ?? null;
  const curEnd = current.end_date ?? current.start_date ?? null;

  if (field === "duration_days") {
    const days = typeof value === "number" ? value : parseInt(String(value), 10);
    if (!Number.isFinite(days) || days < 1) return null;
    const start = curStart ?? todayIso();
    const end = endDateFromBusinessDays(start, days, opts);
    return { start_date: start, end_date: end, duration_days: countBusinessDays(start, end, opts) };
  }

  const iso = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;

  let start: string;
  let end: string;
  if (field === "start_date") {
    start = iso;
    end = curEnd && curEnd >= iso ? curEnd : iso;
  } else {
    end = iso;
    start = curStart && curStart <= iso ? curStart : iso;
  }
  return { start_date: start, end_date: end, duration_days: Math.max(1, countBusinessDays(start, end, opts)) };
}
