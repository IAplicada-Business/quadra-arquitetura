import { describe, it, expect } from "vitest";
import {
  normalizeAISummary,
  reportPhotoUrls,
  weekRangeLabel,
  buildWeeklyReportMessage,
  whatsappPhone,
  weeklyReportFileName,
} from "@/lib/weeklyReport";

describe("normalizeAISummary", () => {
  it("aceita a resposta direta da edge function", () => {
    expect(normalizeAISummary({ summary: "Pintura avançou.", next_steps: "Bancada.", client_pending: "" })).toEqual({
      summary: "Pintura avançou.",
      next_steps: "Bancada.",
      client_pending: "",
    });
  });

  it("aceita campos aninhados e listas", () => {
    expect(normalizeAISummary({ data: { summary: "Ok", next_steps: ["Bancada", "Esquadrias"], client_pending: ["Liberar mármore"] } })).toEqual({
      summary: "Ok",
      next_steps: "• Bancada\n• Esquadrias",
      client_pending: "• Liberar mármore",
    });
  });

  it("resposta vazia ou sem resumo vira null", () => {
    expect(normalizeAISummary({})).toBeNull();
    expect(normalizeAISummary(null)).toBeNull();
    expect(normalizeAISummary({ error: "x" })).toBeNull();
  });
});

describe("formatação", () => {
  it("semana e fotos", () => {
    expect(weekRangeLabel("2026-10-12")).toBe("Semana de 12 a 18 de outubro");
    expect(weekRangeLabel("2026-09-28")).toBe("Semana de 28 de setembro a 04 de outubro");
    expect(reportPhotoUrls({ photo_urls: ["a.jpg", 3, ""] })).toEqual(["a.jpg"]);
    expect(reportPhotoUrls({ photo_urls: null })).toEqual([]);
  });

  it("mensagem para o cliente com pendência e link do portal", () => {
    const msg = buildWeeklyReportMessage(
      { week_start: "2026-10-12", summary: "Forro concluído.", next_steps: "Pintura.", completion_percent: 64, client_pending: "Liberar marmoraria" },
      { projectName: "Salon Chéri", clientName: "Ana Paula Souza", portalUrl: "https://app/client/tok" },
    );
    expect(msg).toContain("Olá, Ana!");
    expect(msg).toContain("*Relatório semanal · Salon Chéri*");
    expect(msg).toContain("Conclusão geral: 64%");
    expect(msg).toContain("*Precisamos de você*\nLiberar marmoraria");
    expect(msg).toContain("https://app/client/tok");
  });

  it("sem pendência não mostra o bloco", () => {
    const msg = buildWeeklyReportMessage({ week_start: "2026-10-12", summary: "a", next_steps: "b", completion_percent: 10, client_pending: null });
    expect(msg).not.toContain("Precisamos de você");
    expect(msg.startsWith("Olá!")).toBe(true);
  });

  it("telefone para o WhatsApp e nome do arquivo", () => {
    expect(whatsappPhone("(31) 97264-1970")).toBe("5531972641970");
    expect(whatsappPhone("+55 31 97264-1970")).toBe("5531972641970");
    expect(whatsappPhone("123")).toBeNull();
    expect(whatsappPhone(null)).toBeNull();
    expect(weeklyReportFileName("Salon Chéri", "2026-10-12")).toBe("relatorio-semanal-salon-cheri-2026-10-12.pdf");
  });
});

describe("generateWeeklyReportPdf", () => {
  it("gera um PDF mesmo quando as fotos não carregam", async () => {
    const { generateWeeklyReportPdf } = await import("@/lib/generateWeeklyReportPdf");
    const original = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: false })) as unknown as typeof fetch;
    const blob = await generateWeeklyReportPdf(
      {
        id: "r1",
        week_start: "2026-10-12",
        summary: "Forro concluído. ".repeat(60),
        next_steps: "Pintura.",
        completion_percent: 64,
        client_pending: "Aprovar cor",
        photo_urls: ["https://cdn/quebrada.jpg"],
        created_at: "2026-10-13T10:00:00Z",
      },
      { projectName: "Salon Chéri", clientName: "Ana" },
    );
    globalThis.fetch = original;
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);
  });
});
