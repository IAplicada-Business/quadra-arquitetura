import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { resolveSiteContent, safeFileUrl, SITE_DEFAULTS } from "@/lib/siteContent";

const m = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }));
vi.mock("@/hooks/useSiteLead", () => ({ useSiteLead: () => ({ mutate: m.mutate, isPending: m.isPending }) }));

import { LeadCaptureDialog } from "@/components/landing/LeadCaptureDialog";
import { LeadMagnetSection } from "@/components/landing/LeadMagnetSection";

describe("safeFileUrl / conteúdo", () => {
  it("aceita https e caminho; descarta o resto", () => {
    expect(safeFileUrl("https://x.com/a.pdf")).toBe("https://x.com/a.pdf");
    expect(safeFileUrl("/checklist.pdf")).toBe("/checklist.pdf");
    expect(safeFileUrl("javascript:alert(1)")).toBe("");
    expect(safeFileUrl("http://x.com/a.pdf")).toBe("");
    expect(safeFileUrl("//evil.com/a.pdf")).toBe("");
    expect(safeFileUrl("data:text/html,x")).toBe("");
    expect(safeFileUrl(42)).toBe("");
  });
  it("o padrão tem fileUrl vazio e um link inválido salvo volta a vazio", () => {
    expect(SITE_DEFAULTS.leadMagnet.fileUrl).toBe("");
    const c = resolveSiteContent([{ key: "leadMagnet.fileUrl", value_json: "javascript:alert(1)" } as never]);
    expect(c.leadMagnet.fileUrl).toBe("");
  });
});

const fill = (nome: string, email: string, whatsapp: string) => {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: nome } });
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: whatsapp } });
};

describe("LeadCaptureDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.isPending = false;
    localStorage.clear();
  });
  const renderDialog = (props: Partial<React.ComponentProps<typeof LeadCaptureDialog>> = {}) =>
    render(<LeadCaptureDialog open onOpenChange={() => {}} fileUrl="https://x.com/check.pdf" {...props} />);

  it("valida nome, e-mail e telefone antes de enviar", () => {
    renderDialog();
    fill("A", "errado", "123");
    fireEvent.click(screen.getByRole("button", { name: "Receber checklist" }));
    expect(screen.getByText("Informe seu nome.")).toBeInTheDocument();
    expect(screen.getByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(screen.getByText("Informe o WhatsApp com DDD.")).toBeInTheDocument();
    expect(m.mutate).not.toHaveBeenCalled();
  });

  it("envia o payload exato e mostra o download no sucesso", async () => {
    m.mutate.mockImplementation((_p, opts) => opts.onSuccess());
    renderDialog();
    fill("Ana Souza", "ana@x.com", "(31) 99999-0000");
    fireEvent.click(screen.getByRole("button", { name: "Receber checklist" }));
    expect(m.mutate.mock.calls[0][0]).toEqual({
      name: "Ana Souza", email: "ana@x.com", phone: "(31) 99999-0000",
      projectType: "outro", message: "Pediu o checklist", sourceDetail: "checklist",
    });
    const link = await screen.findByRole("link", { name: /baixar checklist/i });
    expect(link).toHaveAttribute("href", "https://x.com/check.pdf");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("sem link, o lead é criado e a tela avisa que a equipe envia", async () => {
    m.mutate.mockImplementation((_p, opts) => opts.onSuccess());
    renderDialog({ fileUrl: "" });
    fill("Ana Souza", "ana@x.com", "31999990000");
    fireEvent.click(screen.getByRole("button", { name: "Receber checklist" }));
    expect(await screen.findByText(/equipe da Quadra vai enviar/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /baixar/i })).toBeNull();
  });

  it("erro de rede mantém o que foi digitado e oferece tentar de novo", async () => {
    m.mutate.mockImplementation((_p, opts) => { opts.onError(new Error("Falha de rede")); opts.onSettled(); });
    renderDialog();
    fill("Ana Souza", "ana@x.com", "31999990000");
    fireEvent.click(screen.getByRole("button", { name: "Receber checklist" }));
    expect(await screen.findByText("Falha de rede")).toBeInTheDocument();
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Ana Souza");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("preview não grava lead", async () => {
    renderDialog({ preview: true });
    fill("Ana Souza", "ana@x.com", "31999990000");
    fireEvent.click(screen.getByRole("button", { name: "Receber checklist" }));
    await screen.findByTestId("lead-success");
    expect(m.mutate).not.toHaveBeenCalled();
  });

  it("campo-isca preenchido não grava", async () => {
    renderDialog();
    fill("Ana Souza", "ana@x.com", "31999990000");
    fireEvent.change(document.getElementById("lead-website")!, { target: { value: "http://spam" } });
    fireEvent.click(screen.getByRole("button", { name: "Receber checklist" }));
    await screen.findByTestId("lead-success");
    expect(m.mutate).not.toHaveBeenCalled();
  });

  it("segundo envio em menos de 30s é barrado", async () => {
    m.mutate.mockImplementation((_p, opts) => { opts.onSuccess(); opts.onSettled(); });
    const { unmount } = renderDialog();
    fill("Ana Souza", "ana@x.com", "31999990000");
    fireEvent.click(screen.getByRole("button", { name: "Receber checklist" }));
    await screen.findByTestId("lead-success");
    unmount();
    renderDialog();
    fill("Ana Souza", "ana@x.com", "31999990000");
    fireEvent.click(screen.getByRole("button", { name: "Receber checklist" }));
    expect(await screen.findByText(/Aguarde alguns instantes/)).toBeInTheDocument();
    expect(m.mutate).toHaveBeenCalledTimes(1);
  });
});

describe("LeadMagnetSection", () => {
  it("o botão abre o cartão (não rola para o contato)", async () => {
    render(<LeadMagnetSection content={SITE_DEFAULTS.leadMagnet} />);
    fireEvent.click(screen.getByRole("button", { name: /receber checklist/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });
});
