import {
  addDays,
  differenceInDays,
  eachMonthOfInterval,
  format,
  getISOWeek,
  getISOWeekYear,
  max as dateMax,
  min as dateMin,
  parseISO,
  startOfMonth,
  startOfISOWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Cálculos da visão Multi-obras do Dashboard Obras: ritmo de cada obra
 * (real x esperado pelo calendário), linha do tempo comparativa e
 * agenda dos fornecedores que atendem mais de uma obra.
 */

export interface MOProject {
  id: string;
  name: string | null;
  project_number?: string | null;
  status: string | null;
}

export interface MOTask {
  project_id: string;
  task_name?: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  supplier_name?: string | null;
}

export type Ritmo = "no_ritmo" | "atencao" | "atrasada" | "sem_cronograma";

export interface ObraRitmo {
  projectId: string;
  name: string;
  number: string;
  /** % das atividades concluídas. */
  progress: number;
  /** % do prazo já decorrido (onde a obra "deveria" estar). */
  expected: number;
  ritmo: Ritmo;
  start: Date | null;
  end: Date | null;
  nextDelivery: string | null;
  /** Posição na linha do tempo, em % da janela global. */
  leftPct: number;
  widthPct: number;
}

export interface ConflitoFornecedor {
  supplier: string;
  /** Semanas (rótulo "S41") com o fornecedor em mais de uma obra. */
  weeks: string[];
  projectNames: string[];
}

export interface CargaFornecedor {
  supplier: string;
  obras: number;
  semanas: number;
  conflito: boolean;
}

export interface MatrixCell {
  weeks: string[];
  conflict: boolean;
}

export interface MultiObrasData {
  obras: ObraRitmo[];
  activeProjects: MOProject[];
  suppliers: string[];
  matrix: Record<string, Record<string, MatrixCell>>;
  conflitos: ConflitoFornecedor[];
  carga: CargaFornecedor[];
  progressoMedio: number;
  contagemRitmo: Record<Ritmo, number>;
  timeline: {
    start: Date | null;
    end: Date | null;
    /** Marcas de mês ao longo da linha do tempo. */
    months: { label: string; leftPct: number }[];
    /** Posição de hoje, em %, ou null se fora da janela. */
    todayPct: number | null;
  };
}

const DONE = new Set(["executado", "concluido"]);
export const ACTIVE_OBRA_STATUSES = new Set(["execucao", "mobilizacao", "planejamento"]);

export function classifyRitmo(progress: number, expected: number, hasSchedule: boolean): Ritmo {
  if (!hasSchedule) return "sem_cronograma";
  if (progress < expected - 20) return "atrasada";
  if (progress < expected - 5) return "atencao";
  return "no_ritmo";
}

const weekKey = (d: Date) => `${getISOWeekYear(d)}-${String(getISOWeek(d)).padStart(2, "0")}`;
const weekLabel = (key: string) => `S${Number(key.slice(5))}`;

export function buildMultiObras(projects: MOProject[], tasks: MOTask[], today: Date): MultiObrasData {
  const todayStr = format(today, "yyyy-MM-dd");
  const activeProjects = projects.filter((p) => ACTIVE_OBRA_STATUSES.has(p.status ?? ""));
  const activeIds = new Set(activeProjects.map((p) => p.id));
  const nameOf = new Map(activeProjects.map((p) => [p.id, p.name ?? "Obra"]));

  // ── Ritmo e datas de cada obra ──
  const base = activeProjects.map((proj) => {
    const projTasks = tasks.filter((t) => t.project_id === proj.id);
    const starts = projTasks.filter((t) => t.start_date).map((t) => parseISO(t.start_date!));
    const ends = projTasks.filter((t) => t.end_date).map((t) => parseISO(t.end_date!));
    const start = starts.length ? dateMin(starts) : null;
    const end = ends.length ? dateMax(ends) : null;
    const total = projTasks.length;
    const done = projTasks.filter((t) => DONE.has(t.status ?? "")).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    let expected = 0;
    if (start && end) {
      const span = differenceInDays(end, start) || 1;
      expected = Math.min(100, Math.max(0, Math.round((differenceInDays(today, start) / span) * 100)));
    }
    const next = projTasks
      .filter((t) => t.start_date && t.start_date >= todayStr && !DONE.has(t.status ?? ""))
      .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""))[0];
    return {
      projectId: proj.id,
      name: proj.name ?? "Obra",
      number: proj.project_number ?? "",
      progress,
      expected,
      ritmo: classifyRitmo(progress, expected, !!(start && end)),
      start,
      end,
      nextDelivery: next?.task_name ?? null,
    };
  });

  const dated = base.filter((o) => o.start && o.end);
  const allDates = dated.flatMap((o) => [o.start!, o.end!]);
  const gStart = allDates.length ? startOfMonth(dateMin(allDates)) : null;
  const gEnd = allDates.length ? dateMax(allDates) : null;
  const range = gStart && gEnd ? differenceInDays(gEnd, gStart) || 1 : 1;
  const pct = (d: Date) => (gStart ? (differenceInDays(d, gStart) / range) * 100 : 0);

  const ritmoOrder: Record<Ritmo, number> = { atrasada: 0, atencao: 1, no_ritmo: 2, sem_cronograma: 3 };
  const obras: ObraRitmo[] = base
    .map((o) => ({
      ...o,
      leftPct: o.start ? pct(o.start) : 0,
      widthPct: o.start && o.end ? Math.max(pct(o.end) - pct(o.start), 1.5) : 0,
    }))
    .sort((a, b) => ritmoOrder[a.ritmo] - ritmoOrder[b.ritmo] || a.name.localeCompare(b.name));

  const months =
    gStart && gEnd
      ? eachMonthOfInterval({ start: gStart, end: gEnd }).map((m) => {
          const label = format(m, "MMM/yy", { locale: ptBR }).replace(".", "");
          return { label: label.charAt(0).toUpperCase() + label.slice(1), leftPct: pct(m) };
        })
      : [];
  const todayPct = gStart && gEnd && today >= gStart && today <= gEnd ? pct(today) : null;

  // ── Agenda dos fornecedores (semanas ISO, com ano) ──
  const weeksBySupplierProject = new Map<string, Map<string, Set<string>>>();
  tasks
    .filter((t) => activeIds.has(t.project_id) && t.supplier_name && t.start_date && t.end_date)
    .forEach((t) => {
      const s = t.supplier_name!.trim();
      if (!weeksBySupplierProject.has(s)) weeksBySupplierProject.set(s, new Map());
      const byProject = weeksBySupplierProject.get(s)!;
      if (!byProject.has(t.project_id)) byProject.set(t.project_id, new Set());
      const set = byProject.get(t.project_id)!;
      const end = parseISO(t.end_date!);
      for (let d = startOfISOWeek(parseISO(t.start_date!)); d <= end; d = addDays(d, 7)) set.add(weekKey(d));
    });

  const suppliers = [...weeksBySupplierProject.keys()].sort((a, b) => a.localeCompare(b));
  const matrix: MultiObrasData["matrix"] = {};
  const conflitos: ConflitoFornecedor[] = [];
  const carga: CargaFornecedor[] = [];

  suppliers.forEach((s) => {
    const byProject = weeksBySupplierProject.get(s)!;
    const projectsPerWeek = new Map<string, Set<string>>();
    byProject.forEach((weeks, pid) => weeks.forEach((w) => {
      if (!projectsPerWeek.has(w)) projectsPerWeek.set(w, new Set());
      projectsPerWeek.get(w)!.add(pid);
    }));
    const clashWeeks = [...projectsPerWeek.entries()].filter(([, ps]) => ps.size > 1).map(([w]) => w).sort();
    const clashProjects = new Set(clashWeeks.flatMap((w) => [...projectsPerWeek.get(w)!]));

    matrix[s] = {};
    activeProjects.forEach((p) => {
      const weeks = [...(byProject.get(p.id) ?? [])].sort();
      matrix[s][p.id] = { weeks: weeks.map(weekLabel), conflict: weeks.some((w) => clashWeeks.includes(w)) };
    });

    if (clashWeeks.length) {
      conflitos.push({
        supplier: s,
        weeks: clashWeeks.map(weekLabel),
        projectNames: [...clashProjects].map((id) => nameOf.get(id) ?? "Obra"),
      });
    }
    carga.push({ supplier: s, obras: byProject.size, semanas: projectsPerWeek.size, conflito: clashWeeks.length > 0 });
  });

  carga.sort((a, b) => b.obras - a.obras || b.semanas - a.semanas || a.supplier.localeCompare(b.supplier));
  conflitos.sort((a, b) => b.weeks.length - a.weeks.length);

  const contagemRitmo: Record<Ritmo, number> = { no_ritmo: 0, atencao: 0, atrasada: 0, sem_cronograma: 0 };
  obras.forEach((o) => { contagemRitmo[o.ritmo] += 1; });
  const comCrono = obras.filter((o) => o.ritmo !== "sem_cronograma");
  const progressoMedio = comCrono.length ? Math.round(comCrono.reduce((s, o) => s + o.progress, 0) / comCrono.length) : 0;

  return {
    obras,
    activeProjects,
    suppliers,
    matrix,
    conflitos,
    carga,
    progressoMedio,
    contagemRitmo,
    timeline: { start: gStart, end: gEnd, months, todayPct },
  };
}
