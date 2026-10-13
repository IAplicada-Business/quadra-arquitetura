import { describe, it, expect } from "vitest";
import { buildWeeklyAIContext } from "@/lib/weeklyAIContext";

// Quarta-feira, 14/10/2026: semana de 12 a 18/10.
const TODAY = new Date(2026, 9, 14);

describe("contexto semanal da IA", () => {
  it("com registro nesta semana, manda só a semana", () => {
    const ctx = buildWeeklyAIContext(
      { entries: [{ entry_date: "2026-10-13", summary: "Reboco" }, { entry_date: "2026-10-02", summary: "Antigo" }], tasks: [], reports: [] },
      TODAY,
    )!;
    expect(ctx.diary_scope).toBe("semana");
    expect(ctx.diary_entries.map((e) => e.summary)).toEqual(["Reboco"]);
    expect(ctx.week_start).toBe("12/10/2026");
    expect(ctx.week_end).toBe("18/10/2026");
  });

  it("sem registro nesta semana não recusa: usa os últimos 14 dias", () => {
    const ctx = buildWeeklyAIContext({ entries: [{ entry_date: "2026-10-05", summary: "Elétrica" }], tasks: [], reports: [] }, TODAY)!;
    expect(ctx.diary_scope).toBe("ultimos_14_dias");
    expect(ctx.diary_entries).toHaveLength(1);
  });

  it("sem diário recente, usa os últimos registros que existirem", () => {
    const ctx = buildWeeklyAIContext({ entries: [{ entry_date: "2026-08-01", summary: "Demolição" }], tasks: [], reports: [] }, TODAY)!;
    expect(ctx.diary_scope).toBe("ultimos_registros");
  });

  it("sem diário nenhum, ainda gera a partir do cronograma", () => {
    const ctx = buildWeeklyAIContext(
      {
        entries: [],
        tasks: [
          { task_name: "Marcenaria", status: "em_execucao", start_date: "2026-10-01", end_date: "2026-10-30", progress_percentage: 40 },
          { task_name: "Pintura", status: "pendente", start_date: "2026-10-20", end_date: "2026-11-05" },
          { task_name: "Paisagismo", status: "pendente", start_date: "2026-12-10" }, // longe demais
          { task_name: "Demolição", status: "concluida", start_date: "2026-06-01", end_date: "2026-06-20" }, // concluída há muito
          { task_name: "Elétrica", status: "concluida", start_date: "2026-09-20", end_date: "2026-10-08" }, // concluída recente
        ],
        reports: [],
      },
      TODAY,
    )!;
    expect(ctx.diary_scope).toBe("nenhum");
    // Em andamento, próxima (até 2 semanas) e concluída recente, por data de início.
    expect(ctx.schedule.map((t) => t.name)).toEqual(["Elétrica", "Marcenaria", "Pintura"]);
  });

  it("inclui o último relatório semanal", () => {
    const ctx = buildWeeklyAIContext(
      {
        entries: [],
        tasks: [],
        reports: [
          { week_start: "2026-09-28", summary: "velho" },
          { week_start: "2026-10-05", summary: "último", next_steps: "pintura", completion_percent: 40 },
        ],
      },
      TODAY,
    )!;
    expect(ctx.last_report).toMatchObject({ week_start: "2026-10-05", summary: "último", completion_percent: 40 });
  });

  it("obra sem nada para resumir devolve null", () => {
    expect(buildWeeklyAIContext({ entries: [], tasks: [], reports: [] }, TODAY)).toBeNull();
  });
});
