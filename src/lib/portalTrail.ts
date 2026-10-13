// Trilha do Cliente simplificada: os cinco blocos da tela principal do
// portal — escopos entregues, blocos de construção, saúde do projeto,
// adoção e próximas entregas. Puro (sem React/Supabase) para testar.
import {
  extractPendings,
  type PortalActivity,
  type PortalData,
  type PortalTask,
} from "@/lib/portal";

const DONE = new Set(["concluida", "concluido", "executado"]);
const RUNNING = new Set(["em_andamento", "em_execucao"]);

/** Data local YYYY-MM-DD. */
export function isoToday(today: Date = new Date()): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function day(iso: string | null | undefined): string | null {
  return iso ? iso.slice(0, 10) : null;
}

function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return isoToday(dt);
}

/** Atividades do cronograma; obras sem elas usam as etapas antigas (schedule_tasks). */
export function trailActivities(data: Pick<PortalData, "activities" | "tasks">): PortalActivity[] {
  if (data.activities && data.activities.length > 0) return data.activities;
  return (data.tasks ?? []).map((t: PortalTask) => ({
    id: t.id,
    name: t.task_name,
    discipline: t.discipline,
    status: t.status,
    progress_percent: t.progress_percentage,
    start_date: t.start_date,
    end_date: t.end_date,
  }));
}

/* ------------------------------------------------------------------ */
/* Blocos de construção                                                */
/* ------------------------------------------------------------------ */

export type BlockState = "concluido" | "em_andamento" | "a_iniciar";

export interface ConstructionBlock {
  name: string;
  start: string | null;
  end: string | null;
  total: number;
  done: number;
  /** 0–100 */
  progress: number;
  state: BlockState;
  /** Término já passou e o bloco não foi concluído. */
  late: boolean;
}

/** Cada disciplina vira um bloco, em ordem cronológica. */
export function constructionBlocks(activities: PortalActivity[], today: string = isoToday()): ConstructionBlock[] {
  const groups = new Map<string, PortalActivity[]>();
  for (const a of activities) {
    const key = a.discipline?.trim() || a.name.trim() || "Outros";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const blocks: ConstructionBlock[] = [...groups.entries()].map(([name, acts]) => {
    const starts = acts.map((a) => day(a.start_date)).filter((d): d is string => !!d).sort();
    const ends = acts.map((a) => day(a.end_date) ?? day(a.start_date)).filter((d): d is string => !!d).sort();
    const start = starts[0] ?? null;
    const end = ends[ends.length - 1] ?? null;
    const done = acts.filter((a) => DONE.has(a.status ?? "")).length;
    const progress = Math.round(
      acts.reduce((s, a) => s + (DONE.has(a.status ?? "") ? 100 : Math.max(0, Math.min(100, a.progress_percent ?? 0))), 0) / acts.length,
    );
    let state: BlockState;
    if (done === acts.length) state = "concluido";
    else if (done > 0 || acts.some((a) => RUNNING.has(a.status ?? "")) || (start != null && start <= today)) state = "em_andamento";
    else state = "a_iniciar";
    return { name, start, end, total: acts.length, done, progress: state === "concluido" ? 100 : progress, state, late: state !== "concluido" && end != null && end < today };
  });
  return blocks.sort((a, b) => (a.start ?? "9999").localeCompare(b.start ?? "9999") || a.name.localeCompare(b.name));
}

/** Escopos entregues: blocos concluídos, o mais recente primeiro. */
export function deliveredScopes(blocks: ConstructionBlock[]): ConstructionBlock[] {
  return blocks.filter((b) => b.state === "concluido").sort((a, b) => (b.end ?? "").localeCompare(a.end ?? ""));
}

/* ------------------------------------------------------------------ */
/* Saúde do projeto                                                    */
/* ------------------------------------------------------------------ */

export type HealthLevel = "ok" | "atencao" | "risco";

export interface HealthSignal {
  key: "prazo" | "decisoes" | "pagamentos";
  label: string;
  level: HealthLevel;
  detail: string;
}

export interface ProjectHealth {
  level: HealthLevel;
  label: string;
  signals: HealthSignal[];
}

const LEVEL_ORDER: Record<HealthLevel, number> = { ok: 0, atencao: 1, risco: 2 };
export const HEALTH_LABEL: Record<HealthLevel, string> = { ok: "No ritmo", atencao: "Atenção", risco: "Em risco" };

function worst(levels: HealthLevel[]): HealthLevel {
  return levels.reduce<HealthLevel>((w, l) => (LEVEL_ORDER[l] > LEVEL_ORDER[w] ? l : w), "ok");
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function projectHealth(data: PortalData, blocks: ConstructionBlock[], today: string = isoToday()): ProjectHealth {
  // Prazo: blocos atrasados e término previsto x data de mudança.
  const late = blocks.filter((b) => b.late);
  const projectedEnd = blocks.map((b) => b.end).filter((d): d is string => !!d).sort().pop() ?? null;
  const moveIn = day(data.project.client_move_in_date);
  const passesMoveIn = !!(moveIn && projectedEnd && projectedEnd > moveIn && blocks.some((b) => b.state !== "concluido"));
  const prazoLevel: HealthLevel = passesMoveIn || late.length >= 2 ? "risco" : late.length === 1 ? "atencao" : "ok";
  const prazoDetail = passesMoveIn
    ? "O término previsto passa da data de mudança; a equipe está ajustando o cronograma."
    : late.length > 0
      ? `${plural(late.length, "etapa", "etapas")} além do prazo: ${late.map((b) => b.name).join(", ")}.`
      : blocks.length === 0
        ? "Cronograma em montagem."
        : "Etapas dentro do prazo.";

  // Decisões: pendências abertas e itens de fechamento com data limite vencida.
  const openPendings = extractPendings(data.weekly_reports ?? [], data.pending_responses ?? []).filter((p) => p.isOpen);
  const overdueClosing = (data.closing_items ?? []).filter(
    (c) => c.closing_date && day(c.closing_date)! < today && (c.status === "em_cotacao" || c.status === "aprovado"),
  );
  const decisions = openPendings.length + overdueClosing.length;
  const decisoesLevel: HealthLevel = decisions >= 3 ? "risco" : decisions > 0 ? "atencao" : "ok";
  const decisoesDetail =
    decisions === 0
      ? "Nada aguardando vocês."
      : [
          openPendings.length ? `${plural(openPendings.length, "decisão aguardando", "decisões aguardando")} resposta` : null,
          overdueClosing.length ? `${plural(overdueClosing.length, "item", "itens")} de fechamento com data limite vencida` : null,
        ].filter(Boolean).join(" · ") + ".";

  // Pagamentos em atraso.
  const latePayments = (data.payments ?? []).filter(
    (p) => p.status === "atrasado" || (p.status !== "pago" && p.due_date && day(p.due_date)! < today),
  );
  const pagamentosLevel: HealthLevel = latePayments.length >= 2 ? "risco" : latePayments.length === 1 ? "atencao" : "ok";
  const pagamentosDetail = latePayments.length ? `${plural(latePayments.length, "parcela vencida", "parcelas vencidas")}.` : "Pagamentos em dia.";

  const signals: HealthSignal[] = [
    { key: "prazo", label: "Prazo", level: prazoLevel, detail: prazoDetail },
    { key: "decisoes", label: "Decisões", level: decisoesLevel, detail: decisoesDetail },
    { key: "pagamentos", label: "Pagamentos", level: pagamentosLevel, detail: pagamentosDetail },
  ];
  const level = worst(signals.map((s) => s.level));
  return { level, label: HEALTH_LABEL[level], signals };
}

/* ------------------------------------------------------------------ */
/* Adoção                                                              */
/* ------------------------------------------------------------------ */

export interface AdoptionMetric {
  key: "decisoes" | "fechamento";
  label: string;
  done: number;
  total: number;
}

export interface Adoption {
  /** 0–100, média das métricas que têm itens; null sem nada a medir. */
  score: number | null;
  metrics: AdoptionMetric[];
  /** Tempo médio (dias) entre o resumo publicado e a resposta do cliente. */
  avgResponseDays: number | null;
}

export function clientAdoption(data: PortalData): Adoption {
  const pendings = extractPendings(data.weekly_reports ?? [], data.pending_responses ?? []);
  const answered = pendings.filter((p) => !p.isOpen);
  const closing = data.closing_items ?? [];
  const closingDone = closing.filter((c) => c.status === "comprado" || c.status === "entregue");

  const metrics: AdoptionMetric[] = [
    { key: "decisoes", label: "Decisões respondidas", done: answered.length, total: pendings.length },
    { key: "fechamento", label: "Itens de fechamento resolvidos", done: closingDone.length, total: closing.length },
  ];
  const measurable = metrics.filter((m) => m.total > 0);
  const score = measurable.length ? Math.round((measurable.reduce((s, m) => s + m.done / m.total, 0) / measurable.length) * 100) : null;

  const delays = answered
    .map((p) => {
      const report = (data.weekly_reports ?? []).find((r) => r.id === p.reportId);
      const from = report?.created_at ? new Date(report.created_at).getTime() : null;
      const to = p.response?.responded_at ? new Date(p.response.responded_at).getTime() : null;
      return from != null && to != null && to >= from ? (to - from) / 86400000 : null;
    })
    .filter((d): d is number => d != null);
  const avgResponseDays = delays.length ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10 : null;

  return { score, metrics, avgResponseDays };
}

/* ------------------------------------------------------------------ */
/* Próximas entregas                                                   */
/* ------------------------------------------------------------------ */

export type UpcomingKind = "mudanca" | "fechamento" | "entrega_cliente" | "inicio" | "conclusao" | "visita";

export interface UpcomingItem {
  date: string;
  kind: UpcomingKind;
  title: string;
  /** Depende de ação do cliente. */
  clientAction: boolean;
}

const VISIT_LABEL: Record<string, string> = {
  entrega: "Entrega técnica",
  vistoria: "Vistoria",
  medicao: "Medição",
  reuniao: "Reunião de obra",
};

/** Próximos marcos da obra e do cliente em `horizonDays` (mais a mudança), em ordem de data. */
export function upcomingDeliveries(
  data: PortalData,
  blocks: ConstructionBlock[],
  today: string = isoToday(),
  { horizonDays = 60, limit = 6 }: { horizonDays?: number; limit?: number } = {},
): UpcomingItem[] {
  const until = addDaysIso(today, horizonDays);
  const inWindow = (d: string | null | undefined): d is string => !!d && d >= today && d <= until;
  const items: UpcomingItem[] = [];

  for (const b of blocks) {
    if (b.state === "a_iniciar" && inWindow(b.start)) items.push({ date: b.start, kind: "inicio", title: `Início: ${b.name}`, clientAction: false });
    if (b.state !== "concluido" && inWindow(b.end)) items.push({ date: b.end, kind: "conclusao", title: `Conclusão: ${b.name}`, clientAction: false });
  }
  for (const c of data.closing_items ?? []) {
    const cd = day(c.closing_date);
    const dd = day(c.delivery_date);
    if ((c.status === "em_cotacao" || c.status === "aprovado") && inWindow(cd)) {
      items.push({ date: cd, kind: "fechamento", title: `Fechar: ${c.description}`, clientAction: true });
    }
    if (c.status !== "entregue" && inWindow(dd)) {
      items.push({ date: dd, kind: "entrega_cliente", title: `Chega na obra: ${c.description}`, clientAction: false });
    }
  }
  for (const v of data.visits ?? []) {
    const vd = day(v.visit_date);
    if (inWindow(vd)) items.push({ date: vd, kind: "visita", title: VISIT_LABEL[v.visit_type ?? ""] ?? "Visita técnica", clientAction: false });
  }
  // A mudança é o marco principal: entra sempre que for futura, mesmo fora da janela.
  const moveIn = day(data.project.client_move_in_date);
  if (moveIn && moveIn >= today) items.push({ date: moveIn, kind: "mudanca", title: "Mudança", clientAction: false });

  const sorted = items.sort((a, b) => a.date.localeCompare(b.date) || Number(b.clientAction) - Number(a.clientAction));
  // Com corte, a mudança não pode sumir da lista.
  if (sorted.length > limit) {
    const head = sorted.slice(0, limit);
    const mudanca = sorted.find((i) => i.kind === "mudanca");
    if (mudanca && !head.includes(mudanca)) head[limit - 1] = mudanca;
    return head;
  }
  return sorted;

}

/* ------------------------------------------------------------------ */
/* Linha do tempo da jornada                                           */
/* ------------------------------------------------------------------ */

export interface JourneyPosition {
  /** Índice (0..) da etapa atual em `blocks`; -1 sem etapas. */
  currentIndex: number;
  total: number;
  /** Etapas concluídas sobre o total, 0–100. */
  percent: number;
  /** Todas as etapas concluídas. */
  finished: boolean;
}

/**
 * Onde a obra está na linha do tempo: a primeira etapa em andamento; sem
 * nenhuma em andamento, a próxima a iniciar; tudo concluído, a última.
 */
export function journeyPosition(blocks: ConstructionBlock[]): JourneyPosition {
  const total = blocks.length;
  if (total === 0) return { currentIndex: -1, total: 0, percent: 0, finished: false };
  const done = blocks.filter((b) => b.state === "concluido").length;
  let currentIndex = blocks.findIndex((b) => b.state === "em_andamento");
  if (currentIndex < 0) currentIndex = blocks.findIndex((b) => b.state === "a_iniciar");
  const finished = currentIndex < 0;
  if (finished) currentIndex = total - 1;
  return { currentIndex, total, percent: Math.round((done / total) * 100), finished };
}

/* ------------------------------------------------------------------ */

export interface PortalTrail {
  blocks: ConstructionBlock[];
  delivered: ConstructionBlock[];
  health: ProjectHealth;
  adoption: Adoption;
  upcoming: UpcomingItem[];
  journey: JourneyPosition;
}

export function buildPortalTrail(data: PortalData, today: Date = new Date()): PortalTrail {
  const t = isoToday(today);
  const blocks = constructionBlocks(trailActivities(data), t);
  return {
    blocks,
    delivered: deliveredScopes(blocks),
    health: projectHealth(data, blocks, t),
    adoption: clientAdoption(data),
    upcoming: upcomingDeliveries(data, blocks, t),
    journey: journeyPosition(blocks),
  };
}
