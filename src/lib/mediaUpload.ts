import { supabase } from "@/integrations/supabase/client";
import { detectImageType, resizeImage } from "@/lib/imageResize";

export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

/** Traduz o erro do storage para uma mensagem em que a equipe consegue agir. */
export function describeUploadError(err: unknown): Error {
  const raw = err as { message?: string; statusCode?: string | number; status?: number } | null;
  const msg = (raw?.message ?? "").toLowerCase();
  const code = String(raw?.statusCode ?? raw?.status ?? "");
  if (msg.includes("bucket not found") || code === "404") return new Error("O espaço de arquivos não existe no servidor. Avise o suporte.");
  if (msg.includes("row-level security") || msg.includes("not authorized") || code === "403" || code === "401") return new Error("Sem permissão para enviar arquivos. Saia e entre de novo; se persistir, avise o suporte.");
  if (msg.includes("exceeded") || msg.includes("too large") || code === "413") return new Error("Arquivo grande demais. Reduza a foto e tente de novo.");
  if (msg.includes("mime") || msg.includes("not supported") || code === "415") return new Error("Formato de arquivo não aceito. Use JPG, PNG ou WebP.");
  if (msg.includes("failed to fetch") || msg.includes("network")) return new Error("Falha de conexão ao enviar. Verifique a internet e tente de novo.");
  return new Error(raw?.message ? `Não foi possível enviar: ${raw.message}` : "Não foi possível enviar o arquivo.");
}

async function requireSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data?.session) throw new Error("Sua sessão expirou. Entre de novo para enviar o arquivo.");
}

export interface ImageUploadOptions {
  bucket: string;
  /** Pasta/prefixo dentro do bucket, sem barra no fim. */
  folder: string;
  maxWidth?: number;
  maxBytes?: number;
}

/**
 * Redimensiona (convertendo HEIC) e sobe uma imagem. Retorna a URL pública.
 * Valida sessão e tamanho e devolve erros em português.
 */
export async function uploadImage(file: File, { bucket, folder, maxWidth = 1600, maxBytes = DEFAULT_MAX_BYTES }: ImageUploadOptions): Promise<string> {
  await requireSession();
  const { blob, contentType, ext } = await resizeImage(file, maxWidth, 0.85, maxBytes);
  if (blob.size > maxBytes) throw new Error(`Arquivo grande demais (máx. ${Math.round(maxBytes / 1024 / 1024)} MB). Reduza a foto e tente de novo.`);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType });
  if (error) throw describeUploadError(error);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const VIDEO_EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

/** Sobe um arquivo sem redimensionar (vídeo). Extensão pelo tipo ou nome; nunca ".bin". */
export async function uploadRawFile(file: File, { bucket, folder, maxBytes }: { bucket: string; folder: string; maxBytes?: number }): Promise<string> {
  await requireSession();
  if (maxBytes && file.size > maxBytes) throw new Error(`Arquivo grande demais (máx. ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  const nameExt = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const ext = VIDEO_EXT[file.type] ?? nameExt;
  if (!ext) throw new Error("Não foi possível identificar o tipo do arquivo. Renomeie com a extensão (ex.: .mp4).");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) throw describeUploadError(error);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export { detectImageType };
