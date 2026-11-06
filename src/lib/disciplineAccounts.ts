/**
 * Prestação de contas por disciplina: normalização de nomes, filtro
 * multi-seleção e agregação (previsto × executado) para o gráfico de pizza.
 *
 * Compras guardam a disciplina em `category` (texto livre, ex.: "Obra Civil",
 * "Revestimentos"); pagamentos chegam a ela via
 * `budget_quotes → scope_items.discipline`. Os dois lados passam por
 * `normalizeDiscipline` para virarem a mesma chave.
 */

export const NO_DISCIPLINE = "Sem disciplina";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Aliases (já sem acento/minúsculos) → nome canônico exibido. */
const ALIASES: [RegExp, string][] = [
  [/^(obras? )?civil$|^alvenaria/, "Civil"],
  [/^revestimentos?$/, "Revestimento"],
  [/^eletric/, "Elétrica"],
  [/^hidraulic/, "Hidráulica"],
  [/^pintura/, "Pintura"],
  [/^(forro|gesso)/, "Forro/Gesso"],
  [/^marcenaria/, "Marcenaria"],
  [/^vidro/, "Vidros"],
  [/^iluminacao/, "Iluminação"],
];

export function normalizeDiscipline(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return NO_DISCIPLINE;
  const k = strip(t);
  for (const [re, label] of ALIASES) if (re.test(k)) return label;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

type Embedded = { discipline?: string | null } | { discipline?: string | null }[] | null | undefined;

/** Disciplina de um pagamento, via cotação → escopo (objeto ou array do PostgREST). */
export function paymentDiscipline(p: { budget_quotes?: { scope_items?: Embedded } | null }): string {
  const si = p.budget_quotes?.scope_items;
  const d = Array.isArray(si) ? si[0]?.discipline : si?.discipline;
  return normalizeDiscipline(d);
}

export const purchaseDiscipline = (p: { category?: string | null }) => normalizeDiscipline(p.category);

/** Lista vazia = sem filtro (tudo passa). */
export function filterByDisciplines<T>(items: T[], selected: string[], getDiscipline: (item: any) => string): T[] {
  if (selected.length === 0) return items;
  const set = new Set(selected);
  return items.filter((i) => set.has(getDiscipline(i)));
}

export interface DisciplineSlice {
  discipline: string;
  value: number;
}

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/** Texto da fatia no tooltip e na legenda: valor absoluto e % do total. */
export function sliceLabel(value: number, total: number): string {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
  return `${brl(value)} · ${pct}%`;
}

function toSlices(map: Map<string, number>): DisciplineSlice[] {
  return [...map.entries()]
    .filter(([, v]) => v > 0)
    .map(([discipline, value]) => ({ discipline, value }))
    .sort((a, b) => b.value - a.value);
}

const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

interface PaymentLike {
  value: number;
  status?: string | null;
  source?: string | null;
  description?: string | null;
  budget_quotes?: { scope_items?: Embedded } | null;
}
interface PurchaseLike {
  value?: number | null;
  status?: string | null;
  category?: string | null;
}
interface ScopeLike {
  discipline?: string | null;
  estimated_value?: number | null;
}

/** Executado: despesas de obra pagas + compras já feitas (comprado/entregue/instalado). */
export function aggregateExecuted(payments: PaymentLike[], purchases: PurchaseLike[]): DisciplineSlice[] {
  const m = new Map<string, number>();
  for (const p of payments) {
    const isExpense = (p.source === "obra" || p.source === "cotacao") && !p.description?.toLowerCase().includes("receita");
    if (isExpense && p.status === "pago") add(m, paymentDiscipline(p), p.value || 0);
  }
  for (const c of purchases) {
    if (c.status && c.status !== "pendente") add(m, purchaseDiscipline(c), c.value || 0);
  }
  return toSlices(m);
}

/** Previsto: valor estimado do escopo + compras ainda a comprar, por disciplina. */
export function aggregatePlanned(scopeItems: ScopeLike[], purchases: PurchaseLike[]): DisciplineSlice[] {
  const m = new Map<string, number>();
  for (const s of scopeItems) add(m, normalizeDiscipline(s.discipline), s.estimated_value || 0);
  for (const c of purchases) {
    if (!c.status || c.status === "pendente") add(m, purchaseDiscipline(c), c.value || 0);
  }
  return toSlices(m);
}
