/**
 * Relatório semanal da obra: utilitários puros (sem React/Supabase).
 *
 * - normalizeAISummary: aceita a resposta da IA em formatos ligeiramente
 *   diferentes (campos aninhados em `data`, listas em vez de texto) e
 *   devolve os três campos do formulário, ou null se não veio nada útil.
 * - buildWeeklyReportMessage: texto pronto para WhatsApp / copiar.
 */
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface WeeklyReportFields {
  summary: string;
  next_steps: string;
  client_pending?: string;
}

export interface WeeklyReportRecord {
  id: string;
  week_start: string;
  summary: string;
  next_steps: string;
  completion_percent: number;
  client_pending: string | null;
  photo_urls: unknown;
  created_at: string;
  created_by?: string | null;
}

function asText(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    return v
      .map((item) => (typeof item === "string" ? item : item && typeof item === "object" ? Object.values(item as Record<string, unknown>).filter((x) => typeof x === "string").join(" — ") : ""))
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith("-") || s.startsWith("•") ? s : `• ${s}`))
      .join("\n");
  }
  return "";
}

/** Resposta da IA -> campos do formulário. null quando não há resumo. */
export function normalizeAISummary(raw: unknown): WeeklyReportFields | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const src = (obj.data && typeof obj.data === "object" ? obj.data : obj.result && typeof obj.result === "object" ? obj.result : obj) as Record<string, unknown>;
  const summary = asText(src.summary ?? src.resumo);
  const next_steps = asText(src.next_steps ?? src.nextSteps ?? src.proximas_etapas);
  const client_pending = asText(src.client_pending ?? src.clientPending ?? src.pendencias);
  if (!summary && !next_steps) return null;
  return { summary, next_steps, client_pending };
}

/** photo_urls é jsonb no banco: garante lista de strings. */
export function reportPhotoUrls(r: Pick<WeeklyReportRecord, "photo_urls">): string[] {
  return Array.isArray(r.photo_urls) ? r.photo_urls.filter((u): u is string => typeof u === "string" && u.length > 0) : [];
}

function parseDay(iso: string): Date {
  return new Date(iso.slice(0, 10) + "T00:00:00");
}

/** "Semana de 13 a 19 de outubro" */
export function weekRangeLabel(weekStart: string): string {
  const s = parseDay(weekStart);
  const e = addDays(s, 6);
  const sameMonth = s.getMonth() === e.getMonth();
  const start = sameMonth ? format(s, "dd", { locale: ptBR }) : format(s, "dd 'de' MMMM", { locale: ptBR });
  return `Semana de ${start} a ${format(e, "dd 'de' MMMM", { locale: ptBR })}`;
}

/** Texto do relatório para enviar ao cliente (WhatsApp) ou copiar. */
export function buildWeeklyReportMessage(
  r: Pick<WeeklyReportRecord, "week_start" | "summary" | "next_steps" | "completion_percent" | "client_pending">,
  opts: { projectName?: string | null; clientName?: string | null; portalUrl?: string | null } = {},
): string {
  const lines: string[] = [];
  const hello = opts.clientName?.trim() ? `Olá, ${opts.clientName.trim().split(/\s+/)[0]}!` : "Olá!";
  lines.push(hello);
  lines.push("");
  lines.push(`*Relatório semanal${opts.projectName ? ` · ${opts.projectName}` : ""}*`);
  lines.push(weekRangeLabel(r.week_start));
  lines.push(`Conclusão geral: ${r.completion_percent}%`);
  lines.push("");
  lines.push("*O que andou*");
  lines.push(r.summary.trim());
  lines.push("");
  lines.push("*Próximas etapas*");
  lines.push(r.next_steps.trim());
  if (r.client_pending?.trim()) {
    lines.push("");
    lines.push("*Precisamos de você*");
    lines.push(r.client_pending.trim());
  }
  if (opts.portalUrl) {
    lines.push("");
    lines.push(`Fotos e detalhes no seu portal: ${opts.portalUrl}`);
  }
  lines.push("");
  lines.push("Equipe Quadra Arquitetura");
  return lines.join("\n");
}

/** Só dígitos, com DDI 55 quando vier sem. null se não der um telefone válido. */
export function whatsappPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
}

/** Nome do arquivo PDF: relatorio-semanal-salon-cheri-2026-10-13.pdf */
export function weeklyReportFileName(projectName: string | null | undefined, weekStart: string): string {
  const slug = (projectName ?? "obra")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `relatorio-semanal-${slug || "obra"}-${weekStart.slice(0, 10)}.pdf`;
}
