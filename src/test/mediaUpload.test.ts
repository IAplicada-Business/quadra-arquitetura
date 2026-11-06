import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ getSession: vi.fn(), upload: vi.fn(), bucket: "" }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: m.getSession },
    storage: { from: (b: string) => { m.bucket = b; return { upload: m.upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn/${b}/${p}` } }) }; } },
  },
}));

import { uploadImage, uploadRawFile } from "@/lib/mediaUpload";
import { uploadOnboardingMedia } from "@/hooks/useOnboardingTemplate";

const svg = () => new File(["<svg/>"], "a.svg", { type: "image/svg+xml" });

describe("uploadImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.getSession.mockResolvedValue({ data: { session: {} } });
    m.upload.mockResolvedValue({ error: null });
  });

  it("sem sessão avisa antes de enviar", async () => {
    m.getSession.mockResolvedValue({ data: { session: null } });
    await expect(uploadImage(svg(), { bucket: "b", folder: "f" })).rejects.toThrow(/sessão expirou/);
    expect(m.upload).not.toHaveBeenCalled();
  });
  it("não-imagem é recusada em português", async () => {
    await expect(uploadImage(new File(["x"], "a.txt", { type: "text/plain" }), { bucket: "b", folder: "f" })).rejects.toThrow(/precisa ser uma imagem/);
  });
  it("sobe no bucket e pasta pedidos e devolve a URL pública", async () => {
    const url = await uploadImage(svg(), { bucket: "project-files", folder: "reports/p/2026-11-02" });
    expect(url).toMatch(/^https:\/\/cdn\/project-files\/reports\/p\/2026-11-02\/.+\.svg$/);
  });
  it("erro de RLS vira mensagem clara", async () => {
    m.upload.mockResolvedValue({ error: { message: "new row violates row-level security policy", statusCode: "403" } });
    await expect(uploadImage(svg(), { bucket: "b", folder: "f" })).rejects.toThrow(/Sem permissão/);
  });
  it("imagem acima do limite é barrada", async () => {
    const big = new File([new Uint8Array(20)], "a.svg", { type: "image/svg+xml" });
    await expect(uploadImage(big, { bucket: "b", folder: "f", maxBytes: 10 })).rejects.toThrow(/grande demais/);
  });
});

describe("uploadRawFile / uploadOnboardingMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.getSession.mockResolvedValue({ data: { session: {} } });
    m.upload.mockResolvedValue({ error: null });
  });
  it("vídeo sobe sem redimensionar, com extensão pelo tipo", async () => {
    const url = await uploadOnboardingMedia(new File(["v"], "video-sem-ext", { type: "video/mp4" }), "tpl/videos");
    expect(url).toMatch(/onboarding-media\/tpl\/videos\/.+\.mp4$/);
    expect(m.upload.mock.calls[0][2]).toEqual({ contentType: "video/mp4" });
  });
  it("arquivo sem tipo e sem extensão não vira .bin: pede extensão", async () => {
    await expect(uploadRawFile(new File(["v"], "semnome", { type: "" }), { bucket: "b", folder: "f" })).rejects.toThrow(/extensão/);
  });
  it("imagem do onboarding passa pelo helper e erro do storage sai em português", async () => {
    m.upload.mockResolvedValue({ error: { message: "Bucket not found", statusCode: "404" } });
    await expect(uploadOnboardingMedia(svg(), "tpl/images")).rejects.toThrow(/não existe no servidor/);
  });
});
