import { describe, it, expect } from "vitest";
import { buildCotacaoInstallments, createSingleFlight } from "@/lib/cotacaoInstallments";

describe("buildCotacaoInstallments", () => {
  const base = { projectId: "p1", userId: "u1", total: 90000, startDate: new Date(2026, 10, 10) };

  it("gera uma linha por parcela, numeradas e sem repetir número", () => {
    const rows = buildCotacaoInstallments({ ...base, count: 3, interval: "mensal" });
    expect(rows.map((r) => r.installment_number)).toEqual([1, 2, 3]);
    expect(new Set(rows.map((r) => r.installment_number)).size).toBe(3);
    expect(rows.every((r) => r.source === "cotacao" && r.total_installments === 3 && r.value === 30000)).toBe(true);
    expect(rows.map((r) => r.due_date)).toEqual(["2026-11-10", "2026-12-10", "2027-01-09"]);
  });

  it("respeita intervalo semanal e quinzenal; contagem inválida vira 1", () => {
    expect(buildCotacaoInstallments({ ...base, count: 2, interval: "semanal" }).map((r) => r.due_date)).toEqual(["2026-11-10", "2026-11-17"]);
    expect(buildCotacaoInstallments({ ...base, count: 2, interval: "quinzenal" }).map((r) => r.due_date)).toEqual(["2026-11-10", "2026-11-25"]);
    expect(buildCotacaoInstallments({ ...base, count: NaN, interval: "mensal" })).toHaveLength(1);
  });
});

describe("createSingleFlight", () => {
  it("duas chamadas simultâneas (duplo clique) executam a ação uma única vez", async () => {
    const run = createSingleFlight();
    let calls = 0;
    const action = () => run(async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return "ok";
    });
    const [a, b] = await Promise.all([action(), action()]);
    expect(calls).toBe(1);
    expect([a, b]).toEqual(["ok", undefined]);
    await action();
    expect(calls).toBe(2); // liberado depois de terminar
  });

  it("libera a trava mesmo se a ação falhar", async () => {
    const run = createSingleFlight();
    await expect(run(async () => { throw new Error("x"); })).rejects.toThrow("x");
    await expect(run(async () => 1)).resolves.toBe(1);
  });
});
