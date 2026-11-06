import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  getSession: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: m.getSession },
    storage: { from: () => ({ upload: m.upload, getPublicUrl: () => ({ data: { publicUrl: "https://x/y.png" } }) }) },
    rpc: vi.fn(),
  },
}));

import { describeUploadError, uploadSiteImage } from "@/hooks/useSiteContent";
import { detectImageType, resizeImage } from "@/lib/imageResize";

describe("detectImageType", () => {
  it("usa o MIME quando existe", () => {
    expect(detectImageType({ type: "image/png", name: "a.png" })).toBe("image/png");
  });
  it("cai na extensão quando type vem vazio (HEIC no Chrome)", () => {
    expect(detectImageType({ type: "", name: "IMG_1.HEIC" })).toBe("image/heic");
    expect(detectImageType({ type: "", name: "foto.jpg" })).toBe("image/jpeg");
  });
  it("recusa o que não é imagem", () => {
    expect(detectImageType({ type: "application/pdf", name: "a.pdf" })).toBeNull();
  });
});

describe("resizeImage", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    vi.stubGlobal("Image", class { onerror: (() => void) | null = null; set src(_v: string) { setTimeout(() => this.onerror?.(), 0); } });
  });
  it("arquivo que não é imagem dá mensagem em português", async () => {
    await expect(resizeImage(new File(["x"], "a.txt", { type: "text/plain" }), 1000)).rejects.toThrow(/precisa ser uma imagem/);
  });
  it("jpg ilegível no canvas vai como original se couber no limite", async () => {
    const f = new File(["x"], "a.jpg", { type: "" });
    const r = await resizeImage(f, 1000, 0.85, 1024);
    expect(r.contentType).toBe("image/jpeg");
    expect(r.blob).toBe(f);
  });
  it("jpg ilegível acima do limite falha", async () => {
    const f = new File(["xxxxxxxx"], "a.jpg", { type: "image/jpeg" });
    await expect(resizeImage(f, 1000, 0.85, 2)).rejects.toThrow(/ler a imagem/);
  });
});

describe("describeUploadError", () => {
  it.each([
    [{ message: "Bucket not found", statusCode: "404" }, /não existe no servidor/],
    [{ message: "new row violates row-level security policy", statusCode: "403" }, /Sem permissão/],
    [{ message: "The object exceeded the maximum allowed size", statusCode: "413" }, /grande demais/],
    [{ message: "mime type image/heic is not supported" }, /Formato/],
    [{ message: "Failed to fetch" }, /conexão/],
  ])("%j", (err, re) => {
    expect(describeUploadError(err).message).toMatch(re);
  });
});

describe("uploadSiteImage", () => {
  beforeEach(() => vi.clearAllMocks());
  it("sem sessão avisa antes de enviar", async () => {
    m.getSession.mockResolvedValue({ data: { session: null } });
    await expect(uploadSiteImage(new File(["x"], "a.svg", { type: "image/svg+xml" }), "hero")).rejects.toThrow(/sessão expirou/);
    expect(m.upload).not.toHaveBeenCalled();
  });
  it("erro de RLS do storage vira mensagem clara", async () => {
    m.getSession.mockResolvedValue({ data: { session: {} } });
    m.upload.mockResolvedValue({ error: { message: "new row violates row-level security policy", statusCode: "403" } });
    await expect(uploadSiteImage(new File(["x"], "a.svg", { type: "image/svg+xml" }), "hero")).rejects.toThrow(/Sem permissão/);
  });
  it("sucesso devolve a URL pública", async () => {
    m.getSession.mockResolvedValue({ data: { session: {} } });
    m.upload.mockResolvedValue({ error: null });
    await expect(uploadSiteImage(new File(["x"], "a.svg", { type: "image/svg+xml" }), "hero")).resolves.toBe("https://x/y.png");
  });
});
