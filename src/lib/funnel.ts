import { format, startOfMonth, startOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Funil e janelas de período compartilhados pelo dashboard comercial e
 * pelo de parceiros (indicações) — os dois leem `leads.status`, então a
 * mesma régua de etapas serve para ambos.
 */

export type DashboardPeriod = "mes_atual" | "mes_passado" | "trimestre" | "semestre" | "ano" | "tudo";

export interface FunnelStageCount {
  label: string;
  count: number;
}

export interface FunnelResult {
  stages: FunnelStageCount[];
  /** Conversão de cada etapa a partir da anterior (length = stages - 1). */
  rates: number[];
  /** Fechados / topo, em %. */
  total: number;
}

/** Status que contam como "chegou pelo menos até" cada etapa. */
const REACHED_CONTATO = new Set(["em_contato", "contato_feito", "reuniao_agendada", "proposta_enviada", "fechado"]);
const REACHED_REUNIAO = new Set(["reuniao_agendada", "proposta_enviada", "fechado"]);
const REACHED_PROPOSTA = new Set(["proposta_enviada", "fechado"]);

export const convRate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function computeFunnel(leads: { status: string }[], topLabel = "Leads"): FunnelResult {
  const top = leads.length;
  const contato = leads.filter((l) => REACHED_CONTATO.has(l.status)).length;
  const reuniao = leads.filter((l) => REACHED_REUNIAO.has(l.status)).length;
  const proposta = leads.filter((l) => REACHED_PROPOSTA.has(l.status)).length;
  const fechado = leads.filter((l) => l.status === "fechado").length;
  const stages = [
    { label: topLabel, count: top },
    { label: "Contato", count: contato },
    { label: "Reunião", count: reuniao },
    { label: "Proposta", count: proposta },
    { label: "Fechado", count: fechado },
  ];
  return {
    stages,
    rates: stages.slice(1).map((s, i) => convRate(s.count, stages[i].count)),
    total: convRate(fechado, top),
  };
}

export interface PeriodFunnelLead {
  status: string;
  created_at: string;
  converted_at?: string | null;
  updated_at?: string | null;
}

/** Quando o lead fechou: `converted_at`, ou `updated_at` (contratos antigos não gravam o primeiro). */
export function closedAt(l: PeriodFunnelLead): string {
  return l.converted_at ?? l.updated_at ?? l.created_at;
}

export type PeriodBounds = { start: Date | null; end: Date | null };

/**
 * Funil de um período.
 *
 * - Topo: leads CRIADOS no período.
 * - Fechado: leads fechados NO período, não importa quando foram criados.
 *   Antes só entravam leads criados no período, então um lead criado em
 *   outubro e fechado em novembro sumia do "mês atual" e a conversão
 *   ficava em 0%.
 * - Quem fechou no período mas foi criado antes já passou por contato,
 *   reunião e proposta: entra nessas etapas também, para o funil não
 *   ficar com mais fechados do que propostas.
 */
export function computeFunnelByPeriod<T extends PeriodFunnelLead>(
  leads: T[],
  bounds: PeriodBounds,
  topLabel = "Leads",
): FunnelResult & { created: T[]; closed: T[] } {
  const created = leads.filter((l) => inPeriod(l.created_at, bounds));
  const closed = leads.filter((l) => l.status === "fechado" && inPeriod(closedAt(l), bounds));
  const createdSet = new Set(created);
  const carryOver = closed.filter((l) => !createdSet.has(l)).length;

  const base = computeFunnel(created, topLabel);
  const stages = base.stages.map((s, i) => (i === 0 ? s : { ...s, count: s.count + carryOver }));
  stages[4] = { ...stages[4], count: closed.length };
  const top = stages[0].count;
  return {
    stages,
    rates: stages.slice(1).map((s, i) => convRate(s.count, stages[i].count)),
    total: convRate(stages[4].count, top),
    created,
    closed,
  };
}

/** Janela [start, end) do período; null = sem limite. */
export function periodBounds(period: DashboardPeriod, today: Date): { start: Date | null; end: Date | null } {
  switch (period) {
    case "mes_atual":   return { start: startOfMonth(today), end: null };
    case "mes_passado": return { start: startOfMonth(subMonths(today, 1)), end: startOfMonth(today) };
    case "trimestre":   return { start: startOfMonth(subMonths(today, 2)), end: null };
    case "semestre":    return { start: startOfMonth(subMonths(today, 5)), end: null };
    case "ano":         return { start: startOfYear(today), end: null };
    case "tudo":        return { start: null, end: null };
  }
}

export function inPeriod(dateStr: string, bounds: { start: Date | null; end: Date | null }) {
  const d = new Date(dateStr);
  if (bounds.start && d < bounds.start) return false;
  if (bounds.end && d >= bounds.end) return false;
  return true;
}

/** Últimos 6 meses (mais antigo primeiro): chave yyyy-MM e rótulo "Out". */
export function lastSixMonths(today: Date): { key: string; label: string }[] {
  return Array.from({ length: 6 }, (_, idx) => {
    const m = subMonths(today, 5 - idx);
    const label = format(m, "MMM", { locale: ptBR }).replace(".", "");
    return { key: format(m, "yyyy-MM"), label: label.charAt(0).toUpperCase() + label.slice(1) };
  });
}

export interface PipelineMonthCount {
  month: string;
  fechados: number;
  propostas: number;
  em_andamento: number;
}

/** Mês yyyy-MM no fuso local, a mesma régua de `inPeriod`. */
const monthKey = (dateStr: string) => format(new Date(dateStr), "yyyy-MM");

/**
 * Pipeline dos últimos 6 meses. Fechados entram no mês de `closedAt`
 * (o mesmo critério do funil); propostas e em andamento, no mês em que
 * o lead foi criado.
 */
export function pipelineByMonth(leads: PeriodFunnelLead[], today: Date): PipelineMonthCount[] {
  return lastSixMonths(today).map(({ key, label }) => ({
    month: label,
    fechados: leads.filter((l) => l.status === "fechado" && monthKey(closedAt(l)) === key).length,
    propostas: leads.filter((l) => l.status === "proposta_enviada" && monthKey(l.created_at) === key).length,
    em_andamento: leads.filter((l) => ["contato_feito", "reuniao_agendada"].includes(l.status) && monthKey(l.created_at) === key).length,
  }));
}

export interface ConversionRow {
  key: string;
  total: number;
  fechados: number;
  rate: number;
}

/**
 * Conversão por grupo (origem, tipo de projeto…) com a mesma régua do
 * funil: total = leads criados no período; fechados = fechados no
 * período (por `closedAt`). Ordena pela taxa, depois pelo volume.
 */
export function conversionBy<T extends PeriodFunnelLead>(
  leads: T[],
  keyOf: (l: T) => string | null | undefined,
  bounds: PeriodBounds,
): ConversionRow[] {
  const rows = new Map<string, ConversionRow>();
  const row = (k: string) => rows.get(k) ?? rows.set(k, { key: k, total: 0, fechados: 0, rate: 0 }).get(k)!;
  for (const l of leads) {
    const k = keyOf(l) || "outro";
    if (inPeriod(l.created_at, bounds)) row(k).total++;
    if (l.status === "fechado" && inPeriod(closedAt(l), bounds)) row(k).fechados++;
  }
  return [...rows.values()]
    .map((r) => ({ ...r, rate: convRate(r.fechados, r.total) }))
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
}

const LOST_STATUSES = new Set(["perdido", "perdido_definitivo"]);

/** Motivos de perda dos leads perdidos criados no período (só os que têm motivo). */
export function lostReasons<T extends PeriodFunnelLead & { lost_reason?: string | null }>(
  leads: T[],
  bounds: PeriodBounds,
): { reason: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const l of leads) {
    const reason = l.lost_reason?.trim();
    if (!reason || !LOST_STATUSES.has(l.status) || !inPeriod(l.created_at, bounds)) continue;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "pt-BR"));
}

/** Largura mínima da fatia, em % — etapa com 0 ainda aparece como bico. */
const FUNNEL_MIN_WIDTH = 24;

export function funnelWidths(counts: number[]): number[] {
  const top = Math.max(...counts, 1);
  return counts.map((c) => FUNNEL_MIN_WIDTH + (100 - FUNNEL_MIN_WIDTH) * (c / top));
}
