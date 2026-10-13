// Importação de orçamentos (aba Orçamentos da obra): composição de custo
// por atividade, plano de importação (cria / atualiza / preserva),
// disciplina de cada cotação, agrupamento por fornecedor e totais.
// Tudo puro (sem Supabase/React) para ser testável.
//
// Causa dos valores zerados que isto corrige: a importação gravava
// value = 0 e material_estimate = área em m² (não em R$), e os totais só
// somavam cotações aprovadas — então a tela mostrava R$ 0 logo depois de
// importar, e "R$ <área>" como material.

export interface CostActivity {
  id: string;
  name: string;
  discipline: string | null;
  area_m2: number | null;
}

export interface CostIndex {
  activity_type: string;
  material_name: string;
  index_per_m2: number;
}

export interface CostResearch {
  activity_id: string;
  material_name: string;
  price_min: number | null;
  price_max: number | null;
  price_avg: number | null;
  searched_at: string | null;
}

export interface CostLabor {
  discipline: string | null;
  activity_type: string | null;
  cost_per_m2: number | null;
}

export type CostConfidence = "green" | "yellow" | "grey";

export interface ActivityCost {
  materialCost: number;
  laborCost: number;
  total: number;
  confidence: CostConfidence;
}

const DAY = 24 * 60 * 60 * 1000;

/** Chave de comparação: sem acento, minúscula, espaços únicos. */
export function normalizeKey(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Nome da atividade sem o prefixo de ambiente ("[Cozinha] Pintura" → "pintura"). */
function activityNameKey(name: string | null | undefined): string {
  return normalizeKey((name ?? "").replace(/^\s*\[[^\]]*\]\s*/, ""));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** O índice/mão de obra vale para a atividade se o tipo aparece no nome ou na disciplina. */
function typeMatches(type: string | null | undefined, activity: CostActivity): boolean {
  const t = normalizeKey(type);
  if (!t) return false; // tipo vazio não casa com tudo (antes: "".includes → todas)
  return normalizeKey(activity.name).includes(t) || normalizeKey(activity.discipline).includes(t);
}

/**
 * Custo estimado de uma atividade: material (índice × área × preço
 * pesquisado nos últimos 30 dias) + mão de obra (custo/m² × área).
 */
export function computeActivityCost(
  activity: CostActivity,
  data: { indices: CostIndex[]; research: CostResearch[]; laborCosts: CostLabor[] },
  now: Date = new Date(),
): ActivityCost {
  const area = activity.area_m2 && activity.area_m2 > 0 ? activity.area_m2 : 0;
  let materialCost = 0;
  let confidence: CostConfidence = "grey";

  if (area > 0) {
    for (const idx of data.indices.filter((i) => typeMatches(i.activity_type, activity))) {
      const latest = data.research
        .filter((r) => r.activity_id === activity.id && normalizeKey(r.material_name) === normalizeKey(idx.material_name))
        .sort((a, b) => (b.searched_at ?? "").localeCompare(a.searched_at ?? ""))[0];
      if (!latest?.searched_at) continue;
      const age = now.getTime() - new Date(latest.searched_at).getTime();
      if (age > 30 * DAY) continue;
      const price = latest.price_avg ?? ((latest.price_min ?? 0) + (latest.price_max ?? 0)) / 2;
      if (!(price > 0)) continue;
      materialCost += idx.index_per_m2 * area * price;
      if (age <= 7 * DAY) {
        if (confidence !== "yellow") confidence = "green";
      } else {
        confidence = "yellow";
      }
    }
  }

  let laborCost = 0;
  if (area > 0) {
    const labor =
      data.laborCosts.find((l) => typeMatches(l.activity_type, activity)) ??
      data.laborCosts.find((l) => !normalizeKey(l.activity_type) && normalizeKey(l.discipline) && normalizeKey(l.discipline) === normalizeKey(activity.discipline));
    if (labor?.cost_per_m2 && labor.cost_per_m2 > 0) laborCost = labor.cost_per_m2 * area;
  }

  materialCost = round2(materialCost);
  laborCost = round2(laborCost);
  return { materialCost, laborCost, total: round2(materialCost + laborCost), confidence };
}

/* ------------------------------------------------------------------ */
/* Cotações                                                            */
/* ------------------------------------------------------------------ */

export interface QuoteLike {
  id: string;
  activity_id?: string | null;
  discipline?: string | null;
  scope_item_id?: string | null;
  services_description?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  suppliers?: { name: string } | null;
  value?: number | null;
  material_estimate?: number | null;
  status?: string | null;
  revision_number?: number | null;
}

/** Linha de estimativa (gerada pela importação), não cotação de fornecedor. */
export function isEstimateQuote(q: QuoteLike): boolean {
  return !q.supplier_id && !normalizeKey(q.supplier_name);
}

/**
 * Disciplina de uma cotação: a gravada nela; senão a do item de escopo;
 * senão a da atividade vinculada; por último, o nome igual ao de uma
 * atividade (cotações antigas, sem vínculo).
 */
export function quoteDiscipline(
  q: QuoteLike,
  ctx: { scopeItems: { id: string; discipline: string | null }[]; activities: CostActivity[] },
): string | null {
  if (q.discipline?.trim()) return q.discipline.trim();
  if (q.scope_item_id) {
    const d = ctx.scopeItems.find((s) => s.id === q.scope_item_id)?.discipline;
    if (d?.trim()) return d.trim();
  }
  if (q.activity_id) {
    const d = ctx.activities.find((a) => a.id === q.activity_id)?.discipline;
    if (d?.trim()) return d.trim();
  }
  const key = activityNameKey(q.services_description);
  if (!key) return null;
  return ctx.activities.find((a) => activityNameKey(a.name) === key)?.discipline?.trim() || null;
}

/** Atividade de uma cotação (vínculo gravado ou, em cotação antiga, pelo nome). */
export function quoteActivityId(q: QuoteLike, activities: CostActivity[]): string | null {
  if (q.activity_id) return q.activity_id;
  const key = activityNameKey(q.services_description);
  return key ? activities.find((a) => activityNameKey(a.name) === key)?.id ?? null : null;
}

export const NO_SUPPLIER_KEY = "__sem_fornecedor__";

export function supplierKey(q: QuoteLike): string {
  if (q.supplier_id) return `id:${q.supplier_id}`;
  const name = normalizeKey(q.supplier_name);
  return name ? `nome:${name}` : NO_SUPPLIER_KEY;
}

export function supplierLabel(q: QuoteLike): string {
  return q.suppliers?.name || q.supplier_name?.trim() || "Estimativa (fornecedor a definir)";
}

export function quoteTotal(q: QuoteLike): number {
  return (q.value ?? 0) + (q.material_estimate ?? 0);
}

export interface SupplierGroup<Q extends QuoteLike> {
  key: string;
  label: string;
  quotes: Q[];
  subtotal: number;
  allApproved: boolean;
}

/** Agrupa as cotações de uma disciplina por fornecedor (estimativas por último). */
export function groupBySupplier<Q extends QuoteLike>(quotes: Q[]): SupplierGroup<Q>[] {
  const map = new Map<string, SupplierGroup<Q>>();
  for (const q of quotes) {
    const key = supplierKey(q);
    if (!map.has(key)) map.set(key, { key, label: supplierLabel(q), quotes: [], subtotal: 0, allApproved: true });
    const g = map.get(key)!;
    g.quotes.push(q);
    if (q.status !== "rejeitado") g.subtotal = round2(g.subtotal + quoteTotal(q));
    if (q.status !== "aprovado") g.allApproved = false;
  }
  return [...map.values()].sort((a, b) => {
    if (a.key === NO_SUPPLIER_KEY) return 1;
    if (b.key === NO_SUPPLIER_KEY) return -1;
    return a.label.localeCompare(b.label);
  });
}

/**
 * Totais de uma disciplina. Aprovado = soma do que foi aprovado.
 * Estimado = o aprovado, ou, sem aprovação, o fornecedor mais barato com
 * valor (estimativas da importação contam como um "fornecedor").
 */
export function disciplineTotals(quotes: QuoteLike[]): { approved: number; estimated: number } {
  const approved = round2(quotes.filter((q) => q.status === "aprovado").reduce((s, q) => s + quoteTotal(q), 0));
  if (approved > 0) return { approved, estimated: approved };
  const candidates = groupBySupplier(quotes).map((g) => g.subtotal).filter((v) => v > 0);
  return { approved, estimated: candidates.length ? Math.min(...candidates) : 0 };
}

/* ------------------------------------------------------------------ */
/* Plano de importação                                                 */
/* ------------------------------------------------------------------ */

export type ImportAction = "criar" | "atualizar" | "sem_mudanca" | "aprovada";

export interface ImportPlanLine {
  activity: CostActivity;
  discipline: string | null;
  cost: ActivityCost;
  action: ImportAction;
  quoteId: string | null;
}

export interface QuoteInsertPlan {
  activity_id: string;
  discipline: string | null;
  services_description: string;
  value: number | null;
  material_estimate: number | null;
  status: "pendente" | "cotado";
  revision_number: number;
  revision: string;
  supplier_name: null;
}

export interface QuoteUpdatePlan {
  id: string;
  patch: Partial<Pick<QuoteInsertPlan, "activity_id" | "discipline" | "services_description" | "value" | "material_estimate" | "status">>;
}

export interface ImportPlan {
  lines: ImportPlanLine[];
  inserts: QuoteInsertPlan[];
  updates: QuoteUpdatePlan[];
  /** Atividades sem disciplina que ganham a escolhida na importação (escopo ↔ orçamento). */
  activityDisciplines: { id: string; discipline: string }[];
}

/**
 * Cria a estimativa de cada atividade que ainda não tem uma na revisão,
 * atualiza as estimativas não aprovadas cujo valor/disciplina mudou e
 * preserva as aprovadas e as cotações de fornecedores.
 */
export function planBudgetImport(input: {
  activities: CostActivity[];
  /** Cotações da revisão em que se está importando. */
  quotes: QuoteLike[];
  revision: number;
  costs: Record<string, ActivityCost>;
  /** Disciplina escolhida no diálogo para atividades sem disciplina. */
  disciplineOverrides?: Record<string, string>;
}): ImportPlan {
  const { activities, quotes, revision, costs, disciplineOverrides = {} } = input;
  const estimates = quotes.filter(isEstimateQuote);
  const lines: ImportPlanLine[] = [];
  const inserts: QuoteInsertPlan[] = [];
  const updates: QuoteUpdatePlan[] = [];
  const activityDisciplines: { id: string; discipline: string }[] = [];
  const claimed = new Set<string>();

  for (const activity of activities) {
    const override = disciplineOverrides[activity.id]?.trim();
    const discipline = activity.discipline?.trim() || override || null;
    if (!activity.discipline?.trim() && override) activityDisciplines.push({ id: activity.id, discipline: override });

    const cost = costs[activity.id] ?? { materialCost: 0, laborCost: 0, total: 0, confidence: "grey" as const };
    const value = cost.laborCost > 0 ? cost.laborCost : null;
    const material = cost.materialCost > 0 ? cost.materialCost : null;
    const status = cost.total > 0 ? ("cotado" as const) : ("pendente" as const);

    const existing =
      estimates.find((q) => !claimed.has(q.id) && q.activity_id === activity.id) ??
      estimates.find((q) => !claimed.has(q.id) && !q.activity_id && activityNameKey(q.services_description) === activityNameKey(activity.name));

    if (!existing) {
      inserts.push({
        activity_id: activity.id,
        discipline,
        services_description: activity.name,
        value,
        material_estimate: material,
        status,
        revision_number: revision,
        revision: `Rev ${revision}`,
        supplier_name: null,
      });
      lines.push({ activity, discipline, cost, action: "criar", quoteId: null });
      continue;
    }
    claimed.add(existing.id);

    if (existing.status === "aprovado") {
      lines.push({ activity, discipline, cost, action: "aprovada", quoteId: existing.id });
      continue;
    }

    const patch: QuoteUpdatePlan["patch"] = {};
    if (existing.activity_id !== activity.id) patch.activity_id = activity.id;
    if ((existing.discipline ?? null) !== discipline && discipline) patch.discipline = discipline;
    if ((existing.services_description ?? "") !== activity.name) patch.services_description = activity.name;
    // Linha gravada pela importação antiga: serviço = 0 e material = área
    // em m² (não em R$). Essa é substituída inteira pelo cálculo novo.
    const legacyZeroed =
      existing.value === 0 &&
      (existing.material_estimate == null || (activity.area_m2 != null && existing.material_estimate === activity.area_m2));
    if (legacyZeroed) {
      if ((existing.value ?? null) !== value) patch.value = value;
      if ((existing.material_estimate ?? null) !== material) patch.material_estimate = material;
    } else {
      // Só sobrescreve quando há cálculo; não apaga valor digitado à mão.
      if (value != null && (existing.value ?? null) !== value) patch.value = value;
      if (material != null && (existing.material_estimate ?? null) !== material) patch.material_estimate = material;
    }
    if (existing.status === "pendente" && quoteTotal({ ...existing, ...patch } as QuoteLike) > 0) patch.status = "cotado";

    if (Object.keys(patch).length > 0) {
      updates.push({ id: existing.id, patch });
      lines.push({ activity, discipline, cost, action: "atualizar", quoteId: existing.id });
    } else {
      lines.push({ activity, discipline, cost, action: "sem_mudanca", quoteId: existing.id });
    }
  }

  return { lines, inserts, updates, activityDisciplines };
}
