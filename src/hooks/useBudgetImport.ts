import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeActivityCost,
  normalizeKey,
  planBudgetImport,
  quoteActivityId,
  supplierKey,
  quoteTotal,
  type ActivityCost,
  type CostActivity,
  type CostIndex,
  type CostLabor,
  type CostResearch,
  type ImportPlan,
  type QuoteLike,
} from "@/lib/budgetImport";

/**
 * Tudo o que mostra orçamento, escopo, cronograma, materiais ou
 * pagamentos da obra. Invalidado depois de importar, aprovar ou criar
 * revisão, para nenhuma tela ficar com dado velho (o cache global dura
 * 5 minutos e não recarrega ao trocar de aba).
 */
export async function invalidateProjectBudgetData(qc: QueryClient, projectId: string) {
  const keys: unknown[][] = [
    ["budget_quotes", projectId],
    ["scope_items", projectId],
    ["project_activities", projectId],
    ["project_activities_for_prices", projectId],
    ["schedule_tasks", projectId],
    ["material_tracking", projectId],
    ["task-materials", projectId],
    ["payments", projectId],
    ["price_research", projectId],
    ["project", projectId],
    ["projects"],
    ["dash-obras-projects"],
    ["dash-obras-schedule"],
    ["dash-obras-materials"],
    ["dash-obras-payments"],
  ];
  await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export interface FreshImportData {
  activities: CostActivity[];
  quotes: QuoteLike[];
  indices: CostIndex[];
  research: CostResearch[];
  laborCosts: CostLabor[];
}

/**
 * Lê direto do banco (sem cache) o que a importação usa. É a "limpeza de
 * cache antes de reprocessar": o plano nunca é montado em cima de dado
 * que outra pessoa ou outra aba já mudou.
 */
export async function fetchFreshImportData(projectId: string): Promise<FreshImportData> {
  const [acts, quotes, indices, research, labor] = await Promise.all([
    supabase.from("project_activities").select("id, name, discipline, area_m2").eq("project_id", projectId).order("position"),
    supabase.from("budget_quotes").select("*").eq("project_id", projectId),
    supabase.from("material_indices" as never).select("activity_type, material_name, index_per_m2"),
    supabase.from("price_research" as never).select("activity_id, material_name, price_min, price_max, price_avg, searched_at").eq("project_id", projectId),
    supabase.from("labor_costs" as never).select("discipline, activity_type, cost_per_m2"),
  ]);
  for (const r of [acts, quotes, indices, research, labor]) if (r.error) throw r.error;
  return {
    activities: (acts.data ?? []) as unknown as CostActivity[],
    quotes: (quotes.data ?? []) as unknown as QuoteLike[],
    indices: (indices.data ?? []) as unknown as CostIndex[],
    research: (research.data ?? []) as unknown as CostResearch[],
    laborCosts: (labor.data ?? []) as unknown as CostLabor[],
  };
}

export function computeCosts(data: Pick<FreshImportData, "activities" | "indices" | "research" | "laborCosts">): Record<string, ActivityCost> {
  const now = new Date();
  return Object.fromEntries(data.activities.map((a) => [a.id, computeActivityCost(a, data, now)]));
}

export function buildImportPlan(data: FreshImportData, revision: number, overrides: Record<string, string> = {}): ImportPlan {
  return planBudgetImport({
    activities: data.activities,
    quotes: data.quotes.filter((q) => (q.revision_number ?? 1) === revision),
    revision,
    costs: computeCosts(data),
    disciplineOverrides: overrides,
  });
}

/**
 * Executa a importação: grava disciplina nas atividades que não tinham
 * (escopo), cria/atualiza as estimativas (orçamento) e devolve o resumo.
 * O cronograma usa as mesmas atividades, então fica alinhado pelo vínculo
 * activity_id.
 */
export async function runBudgetImport(args: {
  projectId: string;
  userId: string;
  revision: number;
  overrides: Record<string, string>;
  scopeItems: { id: string; discipline: string | null; scope_type?: string | null }[];
}): Promise<{ created: number; updated: number; preserved: number }> {
  const fresh = await fetchFreshImportData(args.projectId);
  const plan = buildImportPlan(fresh, args.revision, args.overrides);

  for (const upd of plan.activityDisciplines) {
    const { error } = await supabase.from("project_activities").update({ discipline: upd.discipline }).eq("id", upd.id);
    if (error) throw error;
  }

  const scopeIdFor = (discipline: string | null) =>
    discipline
      ? args.scopeItems.find((s) => s.scope_type === "contratado" && normalizeKey(s.discipline) === normalizeKey(discipline))?.id ?? null
      : null;

  if (plan.inserts.length > 0) {
    const rows = plan.inserts.map((i) => ({
      ...i,
      project_id: args.projectId,
      user_id: args.userId,
      scope_item_id: scopeIdFor(i.discipline),
      is_current_revision: true,
    }));
    const { error } = await supabase.from("budget_quotes").insert(rows);
    if (error) throw error;
  }
  for (const u of plan.updates) {
    const { error } = await supabase.from("budget_quotes").update(u.patch).eq("id", u.id);
    if (error) throw error;
  }

  return {
    created: plan.inserts.length,
    updated: plan.updates.length,
    preserved: plan.lines.filter((l) => l.action === "aprovada").length,
  };
}

/**
 * Aprova um fornecedor numa disciplina: aprova todas as cotações dele
 * ali, devolve para "cotado" as aprovadas de outros fornecedores na mesma
 * disciplina e leva o fornecedor para as etapas do cronograma do portal
 * (schedule_tasks) das atividades cobertas.
 */
export async function approveSupplierInDiscipline(args: {
  quotes: (QuoteLike & { _discipline: string | null })[];
  quoteId: string;
  activities: CostActivity[];
}): Promise<{ approvedIds: string[]; newlyApproved: QuoteLike[] }> {
  const target = args.quotes.find((q) => q.id === args.quoteId);
  if (!target) return { approvedIds: [], newlyApproved: [] };
  const key = supplierKey(target);
  const disc = target._discipline;

  // Sem disciplina: os fornecedores não competem entre si, aprova só a cotação.
  const sameDiscipline = disc ? args.quotes.filter((q) => q._discipline === disc) : [target];
  // A cotação clicada sempre entra (mesmo se estava rejeitada); as outras rejeitadas ficam como estão.
  const toApprove = sameDiscipline.filter((q) => supplierKey(q) === key && (q.status !== "rejeitado" || q.id === target.id));
  const toUnapprove = disc ? sameDiscipline.filter((q) => supplierKey(q) !== key && q.status === "aprovado") : [];

  if (toUnapprove.length > 0) {
    const { error } = await supabase.from("budget_quotes").update({ status: "cotado" }).in("id", toUnapprove.map((q) => q.id));
    if (error) throw error;
  }
  const approveIds = toApprove.map((q) => q.id);
  const { error } = await supabase.from("budget_quotes").update({ status: "aprovado" }).in("id", approveIds);
  if (error) throw error;

  const supplierName = target.suppliers?.name || target.supplier_name?.trim() || null;
  if (supplierName) {
    const activityIds = [...new Set(toApprove.map((q) => quoteActivityId(q, args.activities)).filter((id): id is string => !!id))];
    if (activityIds.length > 0) {
      const { error: schedErr } = await supabase
        .from("schedule_tasks")
        .update({ supplier_name: supplierName })
        .in("source_activity_id", activityIds);
      if (schedErr) throw schedErr;
    }
  }

  return { approvedIds: approveIds, newlyApproved: toApprove.filter((q) => q.status !== "aprovado" && quoteTotal(q) > 0) };
}
