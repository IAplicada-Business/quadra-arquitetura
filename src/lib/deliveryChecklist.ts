// Checklist de entrega da obra: funções puras usadas pelo Cronograma
// Reverso (a coluna "Entrega" de cada atividade) e pelo bloco de
// pendências gerais. Sem React e sem Supabase, pra ser testável.
import type { DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";

export const DELIVERY_PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const DELIVERY_PRIORITY_CLASSES: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-primary/10 text-primary border-primary/30",
  alta: "bg-warning/15 text-warning-ink border-warning/30",
  urgente: "bg-destructive/15 text-destructive border-destructive/30",
};

export interface ChecklistProgress {
  total: number;
  resolved: number;
  pending: number;
  /** 0–100, arredondado. 0 quando não há itens. */
  percent: number;
}

export function checklistProgress(items: DeliveryChecklistItem[]): ChecklistProgress {
  const total = items.length;
  const resolved = items.filter((i) => i.resolved).length;
  return {
    total,
    resolved,
    pending: total - resolved,
    percent: total > 0 ? Math.round((resolved / total) * 100) : 0,
  };
}

/** Itens do checklist agrupados por atividade; a chave null é "Pendências gerais". */
export function groupChecklistByActivity(items: DeliveryChecklistItem[]): Map<string | null, DeliveryChecklistItem[]> {
  const map = new Map<string | null, DeliveryChecklistItem[]>();
  for (const item of items) {
    const key = item.activity_id ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

/**
 * Texto das pendências em aberto para colar no WhatsApp, agrupado por
 * atividade (ou "Gerais"). Devolve null quando não há pendência.
 */
export function buildPendingSummary(
  items: DeliveryChecklistItem[],
  activities: { id: string; name: string }[],
): string | null {
  const pending = items.filter((i) => !i.resolved);
  if (pending.length === 0) return null;
  const nameOf = new Map(activities.map((a) => [a.id, a.name]));
  const byGroup = new Map<string, DeliveryChecklistItem[]>();
  for (const p of pending) {
    const key = (p.activity_id && nameOf.get(p.activity_id)) || "Gerais";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(p);
  }
  const lines: string[] = ["*Pendências para entrega da obra*", ""];
  for (const [group, arr] of byGroup) {
    lines.push(`_${group}_`);
    for (const p of arr) {
      lines.push(
        `• ${p.description}${p.responsible ? ` — ${p.responsible}` : ""}${p.due_date ? ` (até ${fmtDate(p.due_date)})` : ""}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}
