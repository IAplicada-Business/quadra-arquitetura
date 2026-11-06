import { describe, expect, it } from "vitest";
import { buildQuoteInserts, revisionForNewQuotes } from "@/lib/supplierScopeQuotes";

const alvenaria = { id: "a1", name: "Regularização e Emboço de Paredes", discipline: "Alvenaria" };
const demolicao = { id: "a2", name: "Demolição de Pisos Cerâmicos", discipline: "Demolição" };

describe("buildQuoteInserts", () => {
  it("entra na revisão mais recente da obra", () => {
    expect(revisionForNewQuotes([])).toBe(1);
    expect(revisionForNewQuotes([{ revision_number: 1 }, { revision_number: 3 }])).toBe(3);
  });

  it("cria uma cotação pendente por atividade marcada, ligada ao fornecedor", () => {
    const rows = buildQuoteInserts({
      activities: [alvenaria, demolicao],
      supplierId: "forn-1",
      supplierName: "Construtora Silva",
      existingQuotes: [],
      scopeItems: [{ id: "scope-alv", discipline: "alvenaria", scope_type: "contratado" }],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      activity_id: "a1",
      discipline: "Alvenaria",
      supplier_id: "forn-1",
      supplier_name: "Construtora Silva",
      services_description: "Regularização e Emboço de Paredes",
      scope_item_id: "scope-alv",
      status: "pendente",
      revision_number: 1,
      revision: "Rev 1",
      value: null,
    });
    expect(rows[1].scope_item_id).toBeNull();
  });

  it("não duplica atividade que já está no orçamento deste fornecedor", () => {
    const rows = buildQuoteInserts({
      activities: [alvenaria, demolicao],
      supplierId: "forn-1",
      supplierName: "Construtora Silva",
      existingQuotes: [
        { activity_id: "a1", supplier_id: "forn-1", revision_number: 2, services_description: "Regularização e Emboço de Paredes" },
        { activity_id: null, supplier_id: "forn-1", revision_number: 2, services_description: "[Sala] Demolição de Pisos Cerâmicos" },
        { activity_id: "a2", supplier_id: "forn-2", revision_number: 2, services_description: "Demolição de Pisos Cerâmicos" },
      ],
      scopeItems: [],
    });

    expect(rows).toEqual([]);
  });

  it("ignora cotação antiga de outra revisão e a de outro fornecedor", () => {
    const rows = buildQuoteInserts({
      activities: [alvenaria],
      supplierId: "forn-1",
      supplierName: "Construtora Silva",
      existingQuotes: [
        { activity_id: "a1", supplier_id: "forn-1", revision_number: 1 },
        { activity_id: "a1", supplier_id: "forn-2", revision_number: 2 },
      ],
      scopeItems: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].revision_number).toBe(2);
    expect(rows[0].revision).toBe("Rev 2");
  });
});
