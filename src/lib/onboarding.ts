/**
 * Onboarding do cliente: modelo das seções, parse de vídeo e regras de
 * cópia template -> obra. Tudo puro (sem Supabase) pra ser testável.
 */

export interface OnboardingSection {
  /** uuid; nas seções do template é o id da linha, no override é gerado no cliente. */
  id: string;
  title: string;
  /** Rich text simples: **negrito**, *itálico*, quebra de linha. */
  body: string;
  video_url: string | null;
  image_urls: string[];
  cta_label: string | null;
  cta_url: string | null;
  is_active: boolean;
  /** Id da seção do template de onde esta cópia veio (só no override). */
  source_section_id?: string | null;
}

/** Linha de onboarding_sections. */
export interface OnboardingSectionRow {
  id: string;
  team_id: string;
  user_id: string;
  template_id: string;
  title: string;
  body: string;
  video_url: string | null;
  image_urls: string[] | null;
  cta_label: string | null;
  cta_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingTemplateRow {
  id: string;
  team_id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingOverrideRow {
  id: string;
  team_id: string;
  user_id: string;
  project_id: string;
  source_template_id: string | null;
  /** Modelo que a obra segue ao vivo (null = modelo padrão do time). */
  template_id?: string | null;
  is_enabled: boolean;
  /** Lista = cópia personalizada da obra; null = segue o modelo em template_id. */
  sections_json: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * Como a obra resolve o onboarding a partir do override (mesma regra da
 * edge function get-client-portal-data):
 *   hidden   -> is_enabled = false
 *   custom   -> sections_json é uma lista (cópia da obra)
 *   template -> segue o modelo em template_id (null = padrão do time)
 */
export type OnboardingMode = "hidden" | "custom" | "template";

export function onboardingMode(override: Pick<OnboardingOverrideRow, "is_enabled" | "sections_json"> | null | undefined): OnboardingMode {
  if (!override) return "template";
  if (!override.is_enabled) return "hidden";
  return Array.isArray(override.sections_json) ? "custom" : "template";
}

export function newSectionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fallback (ambientes sem crypto.randomUUID): uuid v4 simples.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function emptySection(partial: Partial<OnboardingSection> = {}): OnboardingSection {
  return {
    id: newSectionId(),
    title: "",
    body: "",
    video_url: null,
    image_urls: [],
    cta_label: null,
    cta_url: null,
    is_active: true,
    source_section_id: null,
    ...partial,
  };
}

/**
 * Sugestão inicial quando o time ainda não montou o template. Segue a
 * Tela 0 do mockup "Trilha do Cliente": a primeira seção é a capa (vídeo
 * de boas-vindas) e as seguintes viram os passos numerados 01, 02, 03.
 * Os passos espelham a aba Cronograma da obra: Contagem Regressiva
 * (quanto falta até a mudança) e Fechamento Cliente (o que depende dele).
 */
export function starterSections(): OnboardingSection[] {
  return [
    emptySection({
      title: "{cliente} — esse é o acompanhamento do projeto de vocês",
      body: "Um vídeo rápido da Mariana explicando como usar esse espaço ao longo do projeto.",
    }),
    emptySection({
      title: "Veja quanto falta",
      body: "Uma contagem regressiva mostra, do fim para o começo, o que falta até a mudança, o que já foi entregue e em que etapa a obra está.",
    }),
    emptySection({
      title: "Feche o que depende de vocês",
      body: "O que só vocês podem decidir ou contratar (marcenaria, mármores, eletros) aparece em destaque, com a data limite para fechar sem atrasar a obra.",
    }),
    emptySection({
      title: "Entenda cada decisão",
      body: "Vídeos curtos explicam o porquê de cada escolha técnica, sem jargão.",
    }),
  ];
}

/* ------------------------------------------------------------------ */
/* Placeholders e título da capa                                        */
/* ------------------------------------------------------------------ */

export interface OnboardingPlaceholders {
  cliente?: string | null;
  projeto?: string | null;
}

/** Nomes usados no preview do editor (mesmos do mockup). */
export const SAMPLE_PLACEHOLDERS: OnboardingPlaceholders = {
  cliente: "Madalena & João",
  projeto: "Anteprojeto residencial",
};

/** Troca {cliente} e {projeto} pelo nome real; sem nome, cai num genérico. */
export function fillPlaceholders(text: string, p: OnboardingPlaceholders = {}): string {
  const cliente = p.cliente?.trim() || "Bem-vindos";
  const projeto = p.projeto?.trim() || "seu projeto";
  return (text ?? "").replace(/\{\s*cliente\s*\}/gi, cliente).replace(/\{\s*projeto\s*\}/gi, projeto);
}

export function applyOnboardingPlaceholders(sections: OnboardingSection[], p: OnboardingPlaceholders = {}): OnboardingSection[] {
  return sections.map((s) => ({
    ...s,
    title: fillPlaceholders(s.title, p),
    body: fillPlaceholders(s.body, p),
    cta_label: s.cta_label ? fillPlaceholders(s.cta_label, p) : s.cta_label,
  }));
}

/**
 * Título da capa no estilo do mockup: "Madalena & João — esse é o
 * acompanhamento..." vira nome em peso normal + resto em itálico.
 */
export function splitHeroTitle(title: string): { lead: string; rest: string | null } {
  const m = (title ?? "").match(/^(.*?)\s+[—–-]\s+(.+)$/s);
  if (!m) return { lead: title ?? "", rest: null };
  return { lead: m[1], rest: m[2] };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function nullableStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Sanitiza uma seção vinda do banco/JSON; devolve null se não for uma seção. */
export function sanitizeSection(raw: unknown): OnboardingSection | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id);
  if (!id) return null;
  return {
    id,
    title: str(r.title),
    body: str(r.body),
    video_url: nullableStr(r.video_url),
    image_urls: Array.isArray(r.image_urls) ? r.image_urls.filter((u): u is string => typeof u === "string" && u.trim() !== "") : [],
    cta_label: nullableStr(r.cta_label),
    cta_url: nullableStr(r.cta_url),
    is_active: r.is_active !== false,
    source_section_id: nullableStr(r.source_section_id),
  };
}

/** Lista de seções a partir de sections_json (override). */
export function sectionsFromJson(json: unknown): OnboardingSection[] {
  if (!Array.isArray(json)) return [];
  return json.map(sanitizeSection).filter((s): s is OnboardingSection => s !== null);
}

/** Seções do template (linhas do banco) em ordem. */
export function sectionsFromRows(rows: OnboardingSectionRow[] | null | undefined): OnboardingSection[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at))
    .map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body ?? "",
      video_url: r.video_url ?? null,
      image_urls: r.image_urls ?? [],
      cta_label: r.cta_label ?? null,
      cta_url: r.cta_url ?? null,
      is_active: r.is_active !== false,
      source_section_id: null,
    }));
}

/**
 * Copia as seções do template para uma obra: ids novos (o override não
 * compartilha linhas com o template) e source_section_id apontando pra
 * origem, pra dar pra saber de onde veio.
 */
export function cloneSectionsForProject(templateSections: OnboardingSection[]): OnboardingSection[] {
  return templateSections.map((s) => ({
    ...s,
    id: newSectionId(),
    image_urls: [...s.image_urls],
    source_section_id: s.source_section_id ?? s.id,
  }));
}

export function moveSection(sections: OnboardingSection[], from: number, to: number): OnboardingSection[] {
  if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) return sections;
  const next = [...sections];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Seções que o cliente vê: ativas, com algum conteúdo. */
export function visibleSections(sections: OnboardingSection[]): OnboardingSection[] {
  return sections.filter(
    (s) => s.is_active && (s.title.trim() || s.body.trim() || s.video_url || s.image_urls.length > 0),
  );
}

export function sectionsEqual(a: OnboardingSection[], b: OnboardingSection[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ------------------------------------------------------------------ */
/* Vídeo                                                               */
/* ------------------------------------------------------------------ */

export type VideoKind = "youtube" | "vimeo" | "drive" | "file" | "unknown";

export interface VideoEmbed {
  kind: VideoKind;
  /** URL para iframe (youtube/vimeo/drive) ou para <video> (file). */
  src: string;
}

/**
 * Reconhece links do YouTube (watch, youtu.be, shorts, embed, live — vale
 * para vídeo não listado, que tem o mesmo formato), Google Drive
 * (/file/d/<id>/..., open?id=, uc?id=), Vimeo e arquivos de vídeo
 * (upload do bucket ou link direto). É tolerante: serve para exibir.
 * Para validar antes de salvar, use validateVideoUrl.
 */
export function parseVideoUrl(url: string | null | undefined): VideoEmbed | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id ? { kind: "youtube", src: `https://www.youtube.com/embed/${id}` } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    let id = u.searchParams.get("v");
    if (!id && parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1];
    return id ? { kind: "youtube", src: `https://www.youtube.com/embed/${id}` } : null;
  }
  const driveId = googleDriveFileId(u, host);
  if (driveId) return { kind: "drive", src: `https://drive.google.com/file/d/${driveId}/preview` };
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    return id ? { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(u.pathname + u.search)) {
    return { kind: "file", src: raw };
  }
  return { kind: "unknown", src: raw };
}

function googleDriveFileId(u: URL, host: string): string | null {
  if (host !== "drive.google.com" && host !== "docs.google.com") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const fileIdx = parts.indexOf("file");
  if (fileIdx >= 0 && parts[fileIdx + 1] === "d" && parts[fileIdx + 2]) return parts[fileIdx + 2];
  if (parts[0] === "open" || parts[0] === "uc") return u.searchParams.get("id");
  return null;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const DRIVE_ID = /^[A-Za-z0-9_-]{20,}$/;

/**
 * Valida o link de vídeo antes de salvar o onboarding. Devolve null quando
 * está ok (ou vazio) e, senão, a mensagem para a pessoa corrigir.
 * Principal: YouTube (inclusive não listado). Secundário: Google Drive.
 */
export function validateVideoUrl(url: string | null | undefined): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "Isso não é um link. Cole o endereço completo do vídeo, começando com https://";
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return "Isso não é um link. Cole o endereço completo do vídeo, começando com https://";
  }
  const host = u.hostname.replace(/^www\.|^m\./, "").toLowerCase();

  if (host === "youtube.com" && u.pathname.startsWith("/playlist")) {
    return "Esse é o link de uma playlist. Abra o vídeo e copie o link dele (Compartilhar → Copiar).";
  }
  if (host === "studio.youtube.com") {
    return "Esse é o link do YouTube Studio. Use o link do vídeo: no Studio, em Detalhes, copie o \"Link do vídeo\".";
  }
  if (host === "drive.google.com" && u.pathname.includes("/folders/")) {
    return "Esse é o link de uma pasta do Drive. Abra o vídeo e use Compartilhar → Copiar link.";
  }

  const video = parseVideoUrl(raw);
  if (!video || video.kind === "unknown") {
    return "Link não reconhecido. Use um link do YouTube (pode ser não listado) ou do Google Drive.";
  }
  if (video.kind === "youtube") {
    const id = video.src.split("/embed/")[1] ?? "";
    if (!YOUTUBE_ID.test(id)) return "Link do YouTube incompleto. Confira se copiou o endereço inteiro.";
  }
  if (video.kind === "drive") {
    const id = video.src.split("/file/d/")[1]?.split("/")[0] ?? "";
    if (!DRIVE_ID.test(id)) return "Link do Google Drive incompleto. Confira se copiou o endereço inteiro.";
  }
  return null;
}

/** Seções com link de vídeo inválido (para bloquear o salvar e apontar onde corrigir). */
export function invalidVideoSections(sections: OnboardingSection[]): { index: number; id: string; title: string; message: string }[] {
  return sections.flatMap((s, index) => {
    const message = validateVideoUrl(s.video_url);
    return message ? [{ index, id: s.id, title: s.title.trim() || `Seção ${index + 1}`, message }] : [];
  });
}
