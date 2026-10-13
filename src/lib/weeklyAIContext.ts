/**
 * Contexto da obra enviado à IA no Acompanhamento ("Gerar Resumo com IA" e
 * "Insights da semana").
 *
 * Antes a IA só recebia os registros do diário desta semana e recusava sem
 * eles, mesmo com cronograma e histórico preenchidos. Agora vai o que a
 * obra tem: diário da semana (ou o mais recente), etapas do cronograma em
 * andamento / próximas / recém-concluídas e o último relatório semanal.
 */
import { format, startOfWeek, endOfWeek, subDays, addDays } from "date-fns";

export interface DiaryEntryLike {
  entry_date: string;
  weather?: string | null;
  workers_count?: number | null;
  summary?: string | null;
  observations?: string | null;
  disciplines_active?: string[] | null;
}

export interface ScheduleTaskLike {
  task_name?: string | null;
  discipline?: string | null;
  status?: string | null;
  progress_percentage?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface WeeklyReportLike {
  week_start: string;
  summary?: string | null;
  next_steps?: string | null;
  client_pending?: string | null;
  completion_percent?: number | null;
}

export type DiaryScope = "semana" | "ultimos_14_dias" | "ultimos_registros" | "nenhum";

export interface WeeklyAIContext {
  week_start: string;
  week_end: string;
  /** De onde vieram os registros do diário enviados. */
  diary_scope: DiaryScope;
  diary_entries: {
    date: string;
    weather: string | null;
    workers: number | null;
    summary: string | null;
    observations: string | null;
    disciplines: string[] | null;
  }[];
  schedule: {
    name: string;
    discipline: string | null;
    status: string | null;
    progress: number | null;
    start: string | null;
    end: string | null;
  }[];
  last_report: { week_start: string; summary: string | null; next_steps: string | null; client_pending: string | null; completion_percent: number | null } | null;
  progress_percent: number | null;
}

const DONE = new Set(["executado", "concluido", "concluida"]);
const MAX_TASKS = 25;
const MAX_ENTRIES = 15;

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const day = (s: string | null | undefined) => (s ?? "").slice(0, 10);

/**
 * Monta o contexto. Devolve null quando a obra não tem nada para resumir
 * (nem diário, nem cronograma, nem relatório anterior).
 */
export function buildWeeklyAIContext(
  input: { entries: DiaryEntryLike[]; tasks: ScheduleTaskLike[]; reports: WeeklyReportLike[]; progressPercent?: number | null },
  today: Date = new Date(),
): WeeklyAIContext | null {
  const ws = startOfWeek(today, { weekStartsOn: 1 });
  const we = endOfWeek(today, { weekStartsOn: 1 });
  const wsIso = iso(ws);
  const weIso = iso(we);

  const sorted = [...input.entries].sort((a, b) => day(b.entry_date).localeCompare(day(a.entry_date)));
  let scope: DiaryScope = "semana";
  let picked = sorted.filter((e) => day(e.entry_date) >= wsIso && day(e.entry_date) <= weIso);
  if (picked.length === 0) {
    scope = "ultimos_14_dias";
    const from = iso(subDays(today, 14));
    picked = sorted.filter((e) => day(e.entry_date) >= from);
  }
  if (picked.length === 0) {
    scope = "ultimos_registros";
    picked = sorted.slice(0, 5);
  }
  if (picked.length === 0) scope = "nenhum";

  // Etapas relevantes: em andamento, começando nas próximas 2 semanas,
  // ou concluídas nas últimas 2 semanas.
  const soon = iso(addDays(today, 14));
  const recent = iso(subDays(today, 14));
  const relevant = input.tasks.filter((t) => {
    const start = day(t.start_date);
    const end = day(t.end_date);
    const done = DONE.has(t.status ?? "") || t.progress_percentage === 100;
    if (done) return !!end && end >= recent;
    // Em andamento ou a iniciar: fica, a menos que comece depois de 2 semanas.
    return !(start && start > soon);
  });
  const schedule = relevant
    .sort((a, b) => day(a.start_date || "9999").localeCompare(day(b.start_date || "9999")))
    .slice(0, MAX_TASKS)
    .map((t) => ({
      name: t.task_name || t.discipline || "Etapa",
      discipline: t.discipline ?? null,
      status: t.status ?? null,
      progress: t.progress_percentage ?? null,
      start: t.start_date ? day(t.start_date) : null,
      end: t.end_date ? day(t.end_date) : null,
    }));

  const lastReport = [...input.reports].sort((a, b) => b.week_start.localeCompare(a.week_start))[0] ?? null;

  if (picked.length === 0 && schedule.length === 0 && !lastReport) return null;

  return {
    week_start: format(ws, "dd/MM/yyyy"),
    week_end: format(we, "dd/MM/yyyy"),
    diary_scope: scope,
    diary_entries: picked.slice(0, MAX_ENTRIES).map((e) => ({
      date: day(e.entry_date),
      weather: e.weather ?? null,
      workers: e.workers_count ?? null,
      summary: e.summary ?? null,
      observations: e.observations ?? null,
      disciplines: e.disciplines_active ?? null,
    })),
    schedule,
    last_report: lastReport
      ? {
          week_start: lastReport.week_start,
          summary: lastReport.summary ?? null,
          next_steps: lastReport.next_steps ?? null,
          client_pending: lastReport.client_pending ?? null,
          completion_percent: lastReport.completion_percent ?? null,
        }
      : null,
    progress_percent: input.progressPercent ?? null,
  };
}
