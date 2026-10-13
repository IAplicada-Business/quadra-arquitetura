import { describe, it, expect } from "vitest";
import { buildMultiObras, classifyRitmo } from "@/lib/multiObras";

const today = new Date(2026, 9, 13, 12);
const projects = [
  { id: "a", name: "Casa A", project_number: "Q01", status: "execucao" },
  { id: "b", name: "Casa B", project_number: "Q02", status: "execucao" },
  { id: "c", name: "Casa C", project_number: null, status: "planejamento" },
  { id: "z", name: "Concluída", project_number: null, status: "concluido" },
];
const tasks = [
  // A: metade do prazo decorrido, 1 de 2 concluída → no ritmo
  { project_id: "a", task_name: "Alvenaria", start_date: "2026-10-01", end_date: "2026-10-12", status: "concluido", supplier_name: "João" },
  { project_id: "a", task_name: "Elétrica", start_date: "2026-10-14", end_date: "2026-10-25", status: "pendente", supplier_name: "Luz Ltda" },
  // B: prazo quase todo decorrido, nada concluído → atrasada; João na mesma semana que em A
  { project_id: "b", task_name: "Demolição", start_date: "2026-10-05", end_date: "2026-10-09", status: "pendente", supplier_name: "João" },
  { project_id: "b", task_name: "Pintura", start_date: "2026-10-10", end_date: "2026-10-15", status: "pendente", supplier_name: null },
  { project_id: "z", task_name: "x", start_date: "2026-01-01", end_date: "2026-01-02", status: "concluido", supplier_name: "João" },
];

describe("classifyRitmo", () => {
  it("usa folga de 5 e 20 pontos", () => {
    expect(classifyRitmo(50, 54, true)).toBe("no_ritmo");
    expect(classifyRitmo(40, 54, true)).toBe("atencao");
    expect(classifyRitmo(20, 54, true)).toBe("atrasada");
    expect(classifyRitmo(0, 0, false)).toBe("sem_cronograma");
  });
});

describe("buildMultiObras", () => {
  const d = buildMultiObras(projects, tasks, today);

  it("considera só obras ativas e ordena as atrasadas primeiro", () => {
    expect(d.activeProjects.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(d.obras.map((o) => [o.projectId, o.ritmo])).toEqual([
      ["b", "atrasada"],
      ["a", "no_ritmo"],
      ["c", "sem_cronograma"],
    ]);
    expect(d.contagemRitmo).toEqual({ no_ritmo: 1, atencao: 0, atrasada: 1, sem_cronograma: 1 });
    expect(d.progressoMedio).toBe(25);
  });

  it("acha o fornecedor em duas obras na mesma semana", () => {
    expect(d.suppliers).toEqual(["João", "Luz Ltda"]);
    expect(d.conflitos).toHaveLength(1);
    expect(d.conflitos[0].supplier).toBe("João");
    expect(d.conflitos[0].weeks).toEqual(["S41"]);
    expect(d.conflitos[0].projectNames.sort()).toEqual(["Casa A", "Casa B"]);
    expect(d.matrix["João"]["a"]).toEqual({ weeks: ["S40", "S41", "S42"], conflict: true });
    expect(d.matrix["Luz Ltda"]["b"].weeks).toEqual([]);
    expect(d.carga[0]).toEqual({ supplier: "João", obras: 2, semanas: 3, conflito: true });
  });

  it("monta a régua de meses e marca hoje", () => {
    expect(d.timeline.months.map((m) => m.label)).toEqual(["Out/26"]);
    expect(d.timeline.todayPct).not.toBeNull();
    const a = d.obras.find((o) => o.projectId === "a")!;
    const b = d.obras.find((o) => o.projectId === "b")!;
    expect(a.leftPct).toBe(0); // começa no 1º dia da janela
    expect(b.leftPct).toBeGreaterThan(0);
    expect(a.leftPct + a.widthPct).toBeCloseTo(100);
  });
});
