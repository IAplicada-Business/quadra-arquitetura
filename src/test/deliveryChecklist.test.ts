import { describe, it, expect } from "vitest";
import { buildPendingSummary, checklistProgress, groupChecklistByActivity } from "@/lib/deliveryChecklist";
import type { DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";

function chk(partial: Partial<DeliveryChecklistItem> & { id: string; description: string }): DeliveryChecklistItem {
  return {
    project_id: "p1", user_id: "u1", activity_id: null, discipline: null, responsible: null, due_date: null,
    priority: "media", resolved: false, resolved_at: null, photo_paths: [], created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z",
    ...partial,
  };
}

const activities = [{ id: "a1", name: "Bancada de granito" }];

describe("checklist de entrega (dentro do Cronograma Reverso)", () => {
  it("progresso conta resolvidas e pendentes, sem dividir por zero", () => {
    expect(checklistProgress([])).toEqual({ total: 0, resolved: 0, pending: 0, percent: 0 });
    const p = checklistProgress([chk({ id: "1", description: "a", resolved: true }), chk({ id: "2", description: "b" }), chk({ id: "3", description: "c" })]);
    expect(p).toEqual({ total: 3, resolved: 1, pending: 2, percent: 33 });
  });

  it("agrupa por atividade, com null para as pendências gerais", () => {
    const g = groupChecklistByActivity([
      chk({ id: "1", description: "a", activity_id: "a1" }),
      chk({ id: "2", description: "b" }),
      chk({ id: "3", description: "c", activity_id: "a1" }),
    ]);
    expect(g.get("a1")?.map((i) => i.id)).toEqual(["1", "3"]);
    expect(g.get(null)?.map((i) => i.id)).toEqual(["2"]);
  });

  it("resumo para WhatsApp lista só pendentes, agrupadas por atividade e Gerais", () => {
    const text = buildPendingSummary(
      [
        chk({ id: "1", description: "Rejunte na pedra", activity_id: "a1", responsible: "João", due_date: "2026-10-03" }),
        chk({ id: "2", description: "PU da soleira", activity_id: "a1", resolved: true }),
        chk({ id: "3", description: "Limpeza final" }),
      ],
      activities,
    );
    expect(text).toBe(
      [
        "*Pendências para entrega da obra*",
        "",
        "_Bancada de granito_",
        "• Rejunte na pedra — João (até 03/10/2026)",
        "",
        "_Gerais_",
        "• Limpeza final",
      ].join("\n"),
    );
  });

  it("sem pendência em aberto devolve null", () => {
    expect(buildPendingSummary([chk({ id: "1", description: "x", resolved: true })], activities)).toBeNull();
    expect(buildPendingSummary([], activities)).toBeNull();
  });
});
