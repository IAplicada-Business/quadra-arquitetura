import { describe, it, expect } from "vitest";
import {
  NO_DISCIPLINE,
  aggregateExecuted,
  aggregatePlanned,
  filterByDisciplines,
  normalizeDiscipline,
  paymentDiscipline,
  purchaseDiscipline,
} from "@/lib/disciplineAccounts";

describe("normalizeDiscipline", () => {
  it("unifica variações de compras e escopo", () => {
    expect(normalizeDiscipline("Obra Civil")).toBe("Civil");
    expect(normalizeDiscipline("civil")).toBe("Civil");
    expect(normalizeDiscipline("Revestimentos")).toBe("Revestimento");
    expect(normalizeDiscipline("Elétrica")).toBe("Elétrica");
    expect(normalizeDiscipline("eletrica")).toBe("Elétrica");
    expect(normalizeDiscipline("Hidráulica")).toBe("Hidráulica");
  });
  it("vazio vira 'Sem disciplina' e desconhecidos mantêm o nome", () => {
    expect(normalizeDiscipline(null)).toBe(NO_DISCIPLINE);
    expect(normalizeDiscipline("  ")).toBe(NO_DISCIPLINE);
    expect(normalizeDiscipline("paisagismo")).toBe("Paisagismo");
  });
});

describe("paymentDiscipline", () => {
  it("lê scope_items como objeto ou array", () => {
    expect(paymentDiscipline({ budget_quotes: { scope_items: { discipline: "Elétrica" } } })).toBe("Elétrica");
    expect(paymentDiscipline({ budget_quotes: { scope_items: [{ discipline: "Hidráulica" }] } })).toBe("Hidráulica");
    expect(paymentDiscipline({ budget_quotes: null })).toBe(NO_DISCIPLINE);
  });
});

describe("filtro multi-disciplina em obra com muitas compras", () => {
  const CATS = ["Obra Civil", "Revestimentos", "Elétrica", "Hidráulica", "Pintura"];
  const purchases = Array.from({ length: 2000 }, (_, i) => ({
    id: `c${i}`,
    category: CATS[i % CATS.length],
    value: 100,
    status: i % 4 === 0 ? "pendente" : "comprado",
  }));
  const payments = Array.from({ length: 1000 }, (_, i) => ({
    id: `p${i}`,
    value: 50,
    status: "pago",
    source: "obra",
    description: "Fornecedor",
    budget_quotes: { scope_items: { discipline: CATS[i % CATS.length] } },
  }));

  it("sem seleção, tudo passa; com várias, só as escolhidas (compras e pagamentos)", () => {
    expect(filterByDisciplines(purchases, [], purchaseDiscipline)).toHaveLength(2000);
    const sel = ["Civil", "Elétrica"];
    expect(filterByDisciplines(purchases, sel, purchaseDiscipline)).toHaveLength(800);
    expect(filterByDisciplines(payments, sel, paymentDiscipline)).toHaveLength(400);
  });

  it("executado soma pagos + compras feitas; previsto soma escopo + a comprar", () => {
    const sel = ["Civil", "Elétrica"];
    const exec = aggregateExecuted(
      filterByDisciplines(payments, sel, paymentDiscipline),
      filterByDisciplines(purchases, sel, purchaseDiscipline),
    );
    const civil = exec.find((s) => s.discipline === "Civil")!;
    // 200 pagamentos x 50 + compras não-pendentes (400 civis, 1/4 pendentes = 100)
    expect(civil.value).toBe(200 * 50 + 300 * 100);
    expect(exec.map((s) => s.discipline).sort()).toEqual(["Civil", "Elétrica"]);

    const planned = aggregatePlanned(
      [{ discipline: "Obra Civil", estimated_value: 1000 }, { discipline: "Pintura", estimated_value: 500 }],
      filterByDisciplines(purchases, ["Civil"], purchaseDiscipline),
    );
    expect(planned.find((s) => s.discipline === "Civil")!.value).toBe(1000 + 100 * 100);
    expect(planned.find((s) => s.discipline === "Pintura")!.value).toBe(500);
  });

  it("ignora receitas e pagamentos não pagos no executado", () => {
    const exec = aggregateExecuted(
      [
        { value: 10, status: "pago", source: "escritorio", budget_quotes: null },
        { value: 20, status: "pendente", source: "obra", budget_quotes: null },
        { value: 30, status: "pago", source: "obra", description: "Receita extra", budget_quotes: null },
        { value: 40, status: "pago", source: "cotacao", budget_quotes: null },
      ],
      [],
    );
    expect(exec).toEqual([{ discipline: NO_DISCIPLINE, value: 40 }]);
  });
});
