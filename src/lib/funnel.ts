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

/** Largura mínima da fatia, em % — etapa com 0 ainda aparece como bico. */
const FUNNEL_MIN_WIDTH = 24;

export function funnelWidths(counts: number[]): number[] {
  const top = Math.max(...counts, 1);
  return counts.map((c) => FUNNEL_MIN_WIDTH + (100 - FUNNEL_MIN_WIDTH) * (c / top));
}
