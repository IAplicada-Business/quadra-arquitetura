// Escopo do fornecedor → cotações. Puro (sem Supabase/React): decide
// quais atividades marcadas ainda não existem no orçamento da revisão
// atual e devolve as linhas a inserir em budget_quotes.

import { normalizeKey } from "@/lib/budgetImport";

export interface ScopeActivityPick {
  id: string;
  name: string;
  discipline: string | null;
}

export interface ExistingQuoteRef {
  activity_id?: string | null;
  supplier_id?: string | null;
  revision_number?: number | null;
  services_description?: string | null;
}

export interface ScopeItemRef {
  id: string;
  discipline: string | null;
  scope_type?: string | null;
}

export interface QuoteInsertPlan {
  activity_id: string;
  discipline: string | null;
  supplier_id: string;
  supplier_name: string;
  services_description: string;
  scope_item_id: string | null;
  status: "pendente";
  revision_number: number;
  revision: string;
  is_current_revision: boolean;
  value: null;
}

function activityNameKey(name: string | null | undefined): string {
  return normalizeKey((name ?? "").replace(/^\s*\[[^\]]*\]\s*/, ""));
}

/** Revisão em que a cotação nova entra: a mais recente da obra, ou 1. */
export function revisionForNewQuotes(existing: { revision_number?: number | null }[]): number {
  if (existing.length === 0) return 1;
  return Math.max(...existing.map((q) => q.revision_number ?? 1));
}

function scopeItemForDiscipline(discipline: string | null, scopeItems: ScopeItemRef[]): string | null {
  const key = normalizeKey(discipline);
  if (!key) return null;
  const same = scopeItems.filter((s) => normalizeKey(s.discipline) === key);
  return (same.find((s) => s.scope_type === "contratado") ?? same[0])?.id ?? null;
}

/**
 * Atividades marcadas que ainda não têm cotação deste fornecedor na
 * revisão atual. Cotação já gravada (pelo id da atividade ou pelo nome)
 * não é duplicada.
 */
export function buildQuoteInserts(args: {
  activities: ScopeActivityPick[];
  supplierId: string;
  supplierName: string;
  existingQuotes: ExistingQuoteRef[];
  scopeItems: ScopeItemRef[];
}): QuoteInsertPlan[] {
  const rev = revisionForNewQuotes(args.existingQuotes);
  const onRev = args.existingQuotes.filter((q) => (q.revision_number ?? 1) === rev && q.supplier_id === args.supplierId);

  return args.activities.filter((a) => {
    const nameKey = activityNameKey(a.name);
    return !onRev.some(
      (q) => q.activity_id === a.id || (nameKey !== "" && activityNameKey(q.services_description) === nameKey),
    );
  }).map((a) => ({
    activity_id: a.id,
    discipline: a.discipline,
    supplier_id: args.supplierId,
    supplier_name: args.supplierName,
    services_description: a.name,
    scope_item_id: scopeItemForDiscipline(a.discipline, args.scopeItems),
    status: "pendente" as const,
    revision_number: rev,
    revision: `Rev ${rev}`,
    is_current_revision: true,
    value: null,
  }));
}
