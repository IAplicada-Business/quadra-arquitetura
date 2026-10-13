/**
 * Trilha do Cliente (portal /client/:token): tipos do payload da edge
 * function get-client-portal-data e cálculos puros das telas.
 * Sem React e sem Supabase, pra ser testável.
 */

export interface PortalProject {
  name: string;
  address: string | null;
  city: string | null;
  estimated_budget: number | null;
  ideal_budget: number | null;
  start_date?: string | null;
  expected_end_date?: string | null;
  client_move_in_date?: string | null;
  client_name?: string | null;
}

export interface PortalTask {
  id: string;
  task_name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  discipline: string | null;
  color: string | null;
  progress_percentage: number | null;
}

export interface PortalPayment {
  id: string;
  value: number | null;
  due_date: string | null;
  paid_date: string | null;
  status: string | null;
  description: string | null;
  payment_method: string | null;
}

export interface PortalInvoice {
  id: string;
  value: number | null;
  date: string | null;
  store_name: string | null;
  description: string | null;
  invoice_number: string | null;
}

export interface PortalPhoto {
  url: string;
  date: string;
}

export interface PortalWeeklyReport {
  id: string;
  week_start: string;
  summary: string;
  next_steps: string;
  completion_percent: number;
  photo_urls: string[];
  client_pending: string | null;
  created_at: string;
}

export interface PortalPendingResponse {
  id: string;
  weekly_report_id: string;
  pending_item: string;
  response_text: string | null;
  status: string;
  responded_at: string | null;
  client_name: string | null;
  created_at: string;
}

/** Atividade do cronograma (project_activities), base dos blocos da trilha. */
export interface PortalActivity {
  id: string;
  name: string;
  discipline: string | null;
  status: string | null;
  progress_percent: number | null;
  start_date: string | null;
  end_date: string | null;
}

/** Item do Fechamento Cliente (o que o cliente precisa fechar/comprar). */
export interface PortalClosingItem {
  id: string;
  description: string;
  closing_date: string | null;
  delivery_date: string | null;
  status: string;
}

/** Visita técnica agendada (só tipo e data). */
export interface PortalVisit {
  id: string;
  visit_date: string;
  visit_type: string | null;
}

export interface PortalData {
  project: PortalProject;
  tasks: PortalTask[];
  /** Atividades do Cronograma Reverso (edge function nova; antiga não manda). */
  activities?: PortalActivity[];
  closing_items?: PortalClosingItem[];
  visits?: PortalVisit[];
  payments: PortalPayment[];
  invoices: PortalInvoice[];
  photos: PortalPhoto[];
  weekly_reports: PortalWeeklyReport[];
  pending_responses: PortalPendingResponse[];
  /** Seções de onboarding configuradas pela equipe (template ou por obra). */
  onboarding?: { sections: unknown[] } | null;
}

/* ------------------------------------------------------------------ */
/* Navegação                                                           */
/* ------------------------------------------------------------------ */

export type PortalTab = "inicio" | "pendencias" | "galeria" | "orcamento" | "resumos";

export interface PortalTabDef {
  key: PortalTab;
  label: string;
  /** Rótulo curto da barra inferior no celular. */
  short: string;
}

export const PORTAL_TABS: PortalTabDef[] = [
  { key: "inicio", label: "Trilha", short: "Trilha" },
  { key: "pendencias", label: "Minhas pendências", short: "Pendências" },
  { key: "galeria", label: "Galeria", short: "Galeria" },
  { key: "orcamento", label: "Orçamento", short: "Orçamento" },
  { key: "resumos", label: "Resumo semanal", short: "Resumos" },
];

export function isPortalTab(v: string): v is PortalTab {
  return PORTAL_TABS.some((t) => t.key === v);
}

/**
 * Aba a partir do hash da URL (#pendencias). Desconhecido => trilha.
 * Links antigos para #cronograma caem na trilha, que agora mostra os
 * blocos de construção e as próximas entregas.
 */
export function tabFromHash(hash: string | null | undefined): PortalTab {
  const key = (hash ?? "").replace(/^#/, "").trim().toLowerCase();
  return isPortalTab(key) ? key : "inicio";
}

/** Chave do localStorage que marca que o cliente já passou pelas boas-vindas. */
export function onboardingSeenKey(token: string): string {
  return `trilha:onboarding-seen:${token}`;
}

export const WHATSAPP_URL = "https://wa.me/5531972641970";

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_PT_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** dd/mm/aaaa */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseLocalDate(iso);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** "09 de setembro" */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseLocalDate(iso);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")} de ${MONTHS_PT[d.getMonth()]}`;
}

/** "03 jul" */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseLocalDate(iso);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_PT_SHORT[d.getMonth()]}`;
}

/** "Semana de 10 a 15 de agosto" a partir da segunda-feira. */
export function formatWeekLabel(weekStart: string): string {
  const s = parseLocalDate(weekStart);
  if (!s) return weekStart;
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
  const sameMonth = s.getMonth() === e.getMonth();
  const startTxt = sameMonth ? String(s.getDate()).padStart(2, "0") : `${String(s.getDate()).padStart(2, "0")} de ${MONTHS_PT[s.getMonth()]}`;
  return `Semana de ${startTxt} a ${String(e.getDate()).padStart(2, "0")} de ${MONTHS_PT[e.getMonth()]}`;
}

/** Dias corridos de hoje até a data (negativo se já passou). null sem data. */
export function daysUntil(iso: string | null | undefined, today: Date = new Date()): number | null {
  if (!iso) return null;
  const d = parseLocalDate(iso);
  if (!d) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

export function describeCountdown(days: number | null): string {
  if (days == null) return "data a definir";
  if (days < 0) return `há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "é hoje";
  return `faltam ${days} dia${days === 1 ? "" : "s"}`;
}

/* ------------------------------------------------------------------ */
/* Progresso, fase e pendências                                        */
/* ------------------------------------------------------------------ */

const DONE_STATUSES = new Set(["executado", "concluido", "concluida"]);
const RUNNING_STATUSES = new Set(["em_execucao", "em_andamento"]);

/**
 * Progresso físico: o último relatório semanal manda; sem relatório,
 * proporção de etapas executadas do cronograma.
 */
export function computeProgress(reports: PortalWeeklyReport[], tasks: PortalTask[]): number | null {
  const latest = [...reports].sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
  if (latest && typeof latest.completion_percent === "number") return Math.max(0, Math.min(100, latest.completion_percent));
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => DONE_STATUSES.has(t.status ?? "")).length;
  return Math.round((done / tasks.length) * 100);
}

export interface PortalPhase {
  label: string;
  discipline: string | null;
  state: "em_execucao" | "a_iniciar" | "concluido";
  start_date: string | null;
  end_date: string | null;
}

/**
 * "Estamos em": a etapa em execução com término mais próximo; sem
 * nenhuma em execução, a próxima a iniciar; tudo executado => última.
 */
export function currentPhase(tasks: PortalTask[], today: Date = new Date()): PortalPhase | null {
  if (tasks.length === 0) return null;
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const toPhase = (t: PortalTask, state: PortalPhase["state"]): PortalPhase => ({
    label: t.discipline || t.task_name,
    discipline: t.discipline,
    state,
    start_date: t.start_date,
    end_date: t.end_date,
  });

  const running = tasks
    .filter((t) => RUNNING_STATUSES.has(t.status ?? "") || (!DONE_STATUSES.has(t.status ?? "") && t.start_date && t.start_date <= todayIso && (!t.end_date || t.end_date >= todayIso)))
    .sort((a, b) => (a.end_date ?? "9999").localeCompare(b.end_date ?? "9999"));
  if (running[0]) return toPhase(running[0], "em_execucao");

  const upcoming = tasks
    .filter((t) => !DONE_STATUSES.has(t.status ?? "") && (!t.start_date || t.start_date > todayIso))
    .sort((a, b) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"));
  if (upcoming[0]) return toPhase(upcoming[0], "a_iniciar");

  const done = [...tasks].sort((a, b) => (b.end_date ?? "").localeCompare(a.end_date ?? ""));
  return toPhase(done[0], "concluido");
}

export interface PortalPending {
  reportId: string;
  item: string;
  weekStart: string;
  response: PortalPendingResponse | null;
  isOpen: boolean;
}

/** Pendências do cliente: abertas primeiro (semana mais recente no topo), depois resolvidas. */
export function extractPendings(reports: PortalWeeklyReport[], responses: PortalPendingResponse[]): PortalPending[] {
  const list: PortalPending[] = reports
    .filter((r) => r.client_pending && r.client_pending.trim() !== "")
    .map((r) => {
      const response =
        responses.find((x) => x.weekly_report_id === r.id && x.pending_item === r.client_pending && x.status !== "aguardando") ?? null;
      return { reportId: r.id, item: r.client_pending!, weekStart: r.week_start, response, isOpen: !response };
    });
  return list.sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    return b.weekStart.localeCompare(a.weekStart);
  });
}

export interface PhotoGroup {
  date: string;
  urls: string[];
}

/** Fotos agrupadas por data, mais recentes primeiro. */
export function groupPhotosByDate(photos: PortalPhoto[]): PhotoGroup[] {
  const map = new Map<string, string[]>();
  for (const p of photos) {
    const key = (p.date || "").slice(0, 10) || "sem-data";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p.url);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, urls]) => ({ date, urls }));
}

export function formatCurrencyBRL(v: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}
