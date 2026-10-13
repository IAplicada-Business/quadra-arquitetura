import { describe, it, expect } from "vitest";
import {
  computeActivityCost,
  disciplineTotals,
  groupBySupplier,
  normalizeKey,
  planBudgetImport,
  quoteDiscipline,
  supplierKey,
  type CostActivity,
  type QuoteLike,
} from "@/lib/budgetImport";

const NOW = new Date("2026-10-13T12:00:00Z");
const pintura: CostActivity = { id: "a1", name: "Pintura sala", discipline: "Pintura", area_m2: 40 };
const eletrica: CostActivity = { id: "a2", name: "Pontos de tomada", discipline: "Elétrica", area_m2: null };
const semDisc: CostActivity = { id: "a3", name: "Bancada", discipline: null, area_m2: 3 };

const data = {
  indices: [
    { activity_type: "pintura", material_name: "Tinta acrílica", index_per_m2: 0.2 },
    { activity_type: "piso", material_name: "Argamassa", index_per_m2: 5 },
  ],
  research: [
    { activity_id: "a1", material_name: "Tinta acrílica", price_min: 80, price_max: 120, price_avg: 100, searched_at: "2026-10-10T00:00:00Z" },
  ],
  laborCosts: [
    { discipline: "Pintura", activity_type: "pintura", cost_per_m2: 25 },
    // activity_type vazio NÃO pode casar com toda atividade (bug antigo do includes("")).
    { discipline: "Geral", activity_type: "", cost_per_m2: 999 },
  ],
};

describe("custo por atividade (sem R$ 0 falso)", () => {
  it("material = índice × área × preço pesquisado; mão de obra = custo/m² × área", () => {
    expect(computeActivityCost(pintura, data, NOW)).toEqual({ materialCost: 800, laborCost: 1000, total: 1800, confidence: "green" });
  });

  it("sem área ou sem referência fica 0 (e a importação grava vazio, não R$ 0)", () => {
    expect(computeActivityCost(eletrica, data, NOW).total).toBe(0);
    expect(computeActivityCost({ ...pintura, id: "x" }, data, NOW)).toMatchObject({ materialCost: 0, laborCost: 1000 });
  });

  it("pesquisa com mais de 30 dias não entra no material", () => {
    const old = { ...data, research: [{ ...data.research[0], searched_at: "2026-08-01T00:00:00Z" }] };
    expect(computeActivityCost(pintura, old, NOW).materialCost).toBe(0);
  });
});

describe("plano de importação", () => {
  const costs = {
    a1: { materialCost: 800, laborCost: 1000, total: 1800, confidence: "green" as const },
    a2: { materialCost: 0, laborCost: 0, total: 0, confidence: "grey" as const },
    a3: { materialCost: 0, laborCost: 300, total: 300, confidence: "grey" as const },
  };

  it("cria estimativa com valores em R$ (nunca área no material) e vínculo com a atividade", () => {
    const plan = planBudgetImport({ activities: [pintura, eletrica], quotes: [], revision: 2, costs });
    expect(plan.inserts).toEqual([
      { activity_id: "a1", discipline: "Pintura", services_description: "Pintura sala", value: 1000, material_estimate: 800, status: "cotado", revision_number: 2, revision: "Rev 2", supplier_name: null },
      { activity_id: "a2", discipline: "Elétrica", services_description: "Pontos de tomada", value: null, material_estimate: null, status: "pendente", revision_number: 2, revision: "Rev 2", supplier_name: null },
    ]);
  });

  it("reprocessar corrige a linha zerada da importação antiga (value 0 + área no material)", () => {
    const antiga: QuoteLike = { id: "q1", services_description: "Pintura sala", value: 0, material_estimate: 40, status: "pendente", supplier_name: null };
    const plan = planBudgetImport({ activities: [pintura], quotes: [antiga], revision: 1, costs });
    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toEqual([{ id: "q1", patch: { activity_id: "a1", discipline: "Pintura", value: 1000, material_estimate: 800, status: "cotado" } }]);
  });

  it("linha zerada sem custo de referência vira vazio em vez de R$ 0 / m²", () => {
    const antiga: QuoteLike = { id: "q2", activity_id: "a2", discipline: "Elétrica", services_description: "Pontos de tomada", value: 0, material_estimate: null, status: "pendente" };
    const plan = planBudgetImport({ activities: [eletrica], quotes: [antiga], revision: 1, costs });
    expect(plan.updates).toEqual([{ id: "q2", patch: { value: null } }]);
  });

  it("não mexe em aprovada, em cotação de fornecedor nem em valor digitado à mão", () => {
    const aprovada: QuoteLike = { id: "q3", activity_id: "a1", services_description: "Pintura sala", value: 5000, status: "aprovado" };
    const fornecedor: QuoteLike = { id: "q4", activity_id: "a1", services_description: "Pintura sala", supplier_name: "Pinturas BH", value: 2500, status: "cotado" };
    let plan = planBudgetImport({ activities: [pintura], quotes: [aprovada, fornecedor], revision: 1, costs });
    expect(plan.updates).toHaveLength(0);
    expect(plan.inserts).toHaveLength(0);
    expect(plan.lines[0].action).toBe("aprovada");

    const manual: QuoteLike = { id: "q5", activity_id: "a2", discipline: "Elétrica", services_description: "Pontos de tomada", value: 750, status: "cotado" };
    plan = planBudgetImport({ activities: [eletrica], quotes: [manual], revision: 1, costs });
    expect(plan.lines[0].action).toBe("sem_mudanca");
  });

  it("reimportar sem mudanças não duplica nada", () => {
    const first = planBudgetImport({ activities: [pintura], quotes: [], revision: 1, costs });
    const saved: QuoteLike[] = first.inserts.map((i, n) => ({ id: `n${n}`, ...i }));
    const again = planBudgetImport({ activities: [pintura], quotes: saved, revision: 1, costs });
    expect(again.inserts).toHaveLength(0);
    expect(again.updates).toHaveLength(0);
  });

  it("disciplina escolhida no diálogo vai para a atividade (escopo) e para a cotação", () => {
    const plan = planBudgetImport({ activities: [semDisc], quotes: [], revision: 1, costs, disciplineOverrides: { a3: "Marmoraria" } });
    expect(plan.activityDisciplines).toEqual([{ id: "a3", discipline: "Marmoraria" }]);
    expect(plan.inserts[0]).toMatchObject({ discipline: "Marmoraria", value: 300 });
  });
});

describe("agrupamento por fornecedor dentro da disciplina", () => {
  const quotes: QuoteLike[] = [
    { id: "1", supplier_name: "Pinturas BH", value: 1000, material_estimate: 200, status: "cotado" },
    { id: "2", supplier_name: " pinturas bh ", value: 500, status: "cotado" },
    { id: "3", supplier_id: "s9", suppliers: { name: "Cores & Cia" }, value: 1400, status: "cotado" },
    { id: "4", supplier_name: null, value: 1800, status: "cotado" },
    { id: "5", supplier_name: "Barato Demais", value: 100, status: "rejeitado" },
  ];

  it("junta as cotações do mesmo fornecedor (nome sem diferenciar maiúscula/espaço) e soma", () => {
    const groups = groupBySupplier(quotes);
    expect(groups.map((g) => [g.label, g.quotes.length, g.subtotal])).toEqual([
      ["Barato Demais", 1, 0],
      ["Cores & Cia", 1, 1400],
      ["Pinturas BH", 2, 1700],
      ["Estimativa (fornecedor a definir)", 1, 1800],
    ]);
    expect(supplierKey(quotes[0])).toBe(supplierKey(quotes[1]));
  });

  it("estimado = menor fornecedor com valor; com aprovação, o aprovado", () => {
    expect(disciplineTotals(quotes)).toEqual({ approved: 0, estimated: 1400 });
    const aprovado = quotes.map((q) => (supplierKey(q) === supplierKey(quotes[0]) ? { ...q, status: "aprovado" } : q));
    expect(disciplineTotals(aprovado)).toEqual({ approved: 1700, estimated: 1700 });
  });
});

describe("disciplina da cotação", () => {
  const ctx = { scopeItems: [{ id: "s1", discipline: "Hidráulica" }], activities: [pintura, { ...eletrica, name: "[Cozinha] Pontos de tomada" }] };
  it("usa o vínculo gravado, depois escopo, atividade e por fim o nome (sem prefixo de ambiente)", () => {
    expect(quoteDiscipline({ id: "1", discipline: "Marcenaria", scope_item_id: "s1" }, ctx)).toBe("Marcenaria");
    expect(quoteDiscipline({ id: "2", scope_item_id: "s1" }, ctx)).toBe("Hidráulica");
    expect(quoteDiscipline({ id: "3", activity_id: "a1" }, ctx)).toBe("Pintura");
    expect(quoteDiscipline({ id: "4", services_description: "pontos de tomada" }, ctx)).toBe("Elétrica");
    expect(quoteDiscipline({ id: "5", services_description: "Outra coisa" }, ctx)).toBeNull();
  });

  it("normalizeKey ignora acento, maiúscula e espaços", () => {
    expect(normalizeKey("  Elétrica  Geral ")).toBe(normalizeKey("eletrica geral"));
  });
});
