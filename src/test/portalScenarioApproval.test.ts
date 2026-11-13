import { describe, it, expect } from "vitest";
import {
  checkCanApprove,
  checkItemInScenario,
  checkScenarioOpen,
  isScenarioAction,
  scenarioTotal,
  validateClientName,
} from "@/lib/portalScenarioApproval";

const scenario = { id: "s1", project_id: "p1", is_locked: false, approved_at: null };

describe("aprovação de cenário pelo cliente: regras puras", () => {
  it("valida o nome de quem aprova (tamanho, espaços e marcação)", () => {
    expect(validateClientName("  Madalena   Souza ")).toEqual({ ok: true, name: "Madalena Souza" });
    expect(validateClientName("A")).toMatchObject({ ok: false });
    expect(validateClientName("")).toMatchObject({ ok: false });
    expect(validateClientName(undefined)).toMatchObject({ ok: false });
    expect(validateClientName("x".repeat(81))).toMatchObject({ ok: false });
    expect(validateClientName("<script>alert(1)</script>")).toMatchObject({ ok: false });
  });

  it("só aceita ação em cenário do projeto do token e ainda aberto", () => {
    expect(checkScenarioOpen(scenario, "p1")).toEqual({ ok: true });
    expect(checkScenarioOpen(scenario, "outro-projeto")).toMatchObject({ ok: false, status: 404 });
    expect(checkScenarioOpen(null, "p1")).toMatchObject({ ok: false, status: 404 });
    expect(checkScenarioOpen({ ...scenario, is_locked: true }, "p1")).toMatchObject({ ok: false, status: 409 });
    expect(checkScenarioOpen({ ...scenario, approved_at: "2026-11-13T10:00:00Z" }, "p1")).toMatchObject({ ok: false, status: 409 });
  });

  it("item precisa pertencer ao cenário informado", () => {
    const item = { id: "i1", scenario_id: "s1", estimated_value: 10, is_included: true };
    expect(checkItemInScenario(item, "s1")).toEqual({ ok: true });
    expect(checkItemInScenario(item, "s2")).toMatchObject({ ok: false, status: 404 });
    expect(checkItemInScenario(undefined, "s1")).toMatchObject({ ok: false, status: 404 });
  });

  it("recalcula o total só com itens incluídos e ignora valor nulo", () => {
    expect(
      scenarioTotal([
        { estimated_value: 1000, is_included: true },
        { estimated_value: 500, is_included: false },
        { estimated_value: null, is_included: true },
        { estimated_value: 250.5, is_included: true },
      ]),
    ).toBe(1250.5);
    expect(scenarioTotal([])).toBe(0);
  });

  it("não deixa aprovar sem nenhum item marcado", () => {
    expect(checkCanApprove([{ estimated_value: 1, is_included: false }])).toMatchObject({ ok: false, status: 422 });
    expect(checkCanApprove([])).toMatchObject({ ok: false, status: 422 });
    expect(checkCanApprove([{ estimated_value: 1, is_included: true }])).toEqual({ ok: true });
  });

  it("reconhece só as ações permitidas", () => {
    expect(isScenarioAction("toggle_item")).toBe(true);
    expect(isScenarioAction("approve")).toBe(true);
    expect(isScenarioAction("unlock")).toBe(false);
    expect(isScenarioAction(undefined)).toBe(false);
  });
});
