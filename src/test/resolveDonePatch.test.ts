import { describe, it, expect } from "vitest";
import { doneToastMessage, resolveDonePatch } from "@/hooks/useProjectActivities";

const HOJE = "2026-09-29";

describe("resolveDonePatch", () => {
  it.each([
    ["pendente (sem data)", null],
    ["em andamento (começou)", "2026-09-20"],
    ["atrasada (começou e passou do prazo)", "2026-08-01"],
  ])("entregar %s → concluída com 100%%", (_label, start) => {
    expect(resolveDonePatch({ start_date: start }, true, HOJE)).toEqual({ status: "concluida", progress_percent: 100 });
  });

  it("reabrir sem data volta para pendente", () => {
    expect(resolveDonePatch({ start_date: null }, false, HOJE)).toEqual({ status: "pendente", progress_percent: 0 });
  });

  it("reabrir atividade que já começou volta para em andamento", () => {
    expect(resolveDonePatch({ start_date: "2026-09-29" }, false, HOJE)).toEqual({ status: "em_andamento", progress_percent: 0 });
    expect(resolveDonePatch({ start_date: "2026-08-01" }, false, HOJE)).toEqual({ status: "em_andamento", progress_percent: 0 });
  });

  it("reabrir atividade futura volta para pendente", () => {
    expect(resolveDonePatch({ start_date: "2026-10-15" }, false, HOJE)).toEqual({ status: "pendente", progress_percent: 0 });
  });
});

describe("doneToastMessage", () => {
  it("confirma a entrega com o nome da atividade", () => {
    expect(doneToastMessage({ name: "Demolição" }, true)).toEqual({
      title: "Atividade entregue",
      description: '"Demolição" foi marcada como entregue (100%).',
    });
  });

  it("confirma a reabertura com o nome da atividade", () => {
    expect(doneToastMessage({ name: "Demolição" }, false)).toEqual({
      title: "Atividade reaberta",
      description: '"Demolição" voltou a ficar em aberto.',
    });
  });
});
