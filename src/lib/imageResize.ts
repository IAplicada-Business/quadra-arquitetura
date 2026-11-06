/**
 * Redimensiona uma imagem no navegador antes do upload.
 *
 * Fotos de celular chegam com 4000px+ e vários MB; o site não precisa disso.
 * Reduz para no máximo `maxWidth` de largura (mantendo proporção) e recomprime:
 * PNG continua PNG (logo com transparência), o resto vira JPEG. SVG e GIF
 * passam direto (vetor / animação).
 */
export interface ResizeResult {
  blob: Blob;
  contentType: string;
  ext: string;
  width: number;
  height: number;
}

export function targetSize(width: number, height: number, maxWidth: number): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };
  return { width: maxWidth, height: Math.round((height * maxWidth) / width) };
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
};

/** Tipo da imagem pelo MIME ou, quando o navegador entrega `type` vazio (comum com HEIC), pela extensão. */
export function detectImageType(file: Pick<File, "type" | "name">): string | null {
  if (file.type?.startsWith("image/")) return file.type;
  const ext = file.name?.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? null;
}

export const isHeic = (type: string | null) => type === "image/heic" || type === "image/heif";

/** Converte HEIC/HEIF para JPEG. A biblioteca só é carregada quando precisa. */
async function heicToJpeg(file: File): Promise<File> {
  try {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(out) ? out[0] : out;
    return new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
  } catch {
    throw new Error("Não foi possível converter a foto HEIC. Converta para JPG ou PNG e tente de novo.");
  }
}

export async function resizeImage(file: File, maxWidth: number, quality = 0.85, maxBytes?: number): Promise<ResizeResult> {
  let type = detectImageType(file);
  if (!type) throw new Error("O arquivo precisa ser uma imagem (JPG, PNG, WebP ou HEIC)");
  if (type === "image/svg+xml" || type === "image/gif") {
    return { blob: file, contentType: type, ext: type === "image/gif" ? "gif" : "svg", width: 0, height: 0 };
  }
  if (isHeic(type)) {
    file = await heicToJpeg(file);
    type = "image/jpeg";
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch (e) {
    // Não leu no canvas: manda o original se já for um formato web e couber no limite.
    const webType = ["image/jpeg", "image/png", "image/webp"].includes(type);
    if (webType && (maxBytes === undefined || file.size <= maxBytes)) {
      return {
        blob: file,
        contentType: type,
        ext: type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg",
        width: 0,
        height: 0,
      };
    }
    throw e;
  }
  const { width, height } = targetSize(img.naturalWidth, img.naturalHeight, maxWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Navegador sem suporte a redimensionar imagem");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const keepPng = type === "image/png";
  const contentType = keepPng ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao comprimir a imagem"))), contentType, quality),
  );
  return { blob, contentType, ext: keepPng ? "png" : "jpg", width, height };
}
