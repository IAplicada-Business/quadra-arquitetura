import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { WeeklyReportRecord } from "@/lib/weeklyReport";

const pdfMock = vi.fn(async (_report: unknown, _opts: unknown) => new Blob(["%PDF"], { type: "application/pdf" }));
vi.mock("@/lib/generateWeeklyReportPdf", () => ({ generateWeeklyReportPdf: (r: unknown, o: unknown) => pdfMock(r, o) }));
vi.mock("@/hooks/useVoiceInput", () => ({ useVoiceInput: () => ({ isRecording: false, isSupported: false, toggle: vi.fn() }) }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { WeeklyReportsSection } from "@/components/projects/WeeklyReportsSection";
import { WeeklyReportModal } from "@/components/projects/WeeklyReportModal";

const report = (p: Partial<WeeklyReportRecord> & { id: string }): WeeklyReportRecord => ({
  week_start: "2026-10-12",
  summary: "Forro de gesso concluído.",
  next_steps: "Pintura e emassamento.",
  completion_percent: 64,
  client_pending: "Liberar o desenho da marmoraria",
  photo_urls: ["https://cdn/f1.jpg"],
  created_at: "2026-10-13T15:00:00Z",
  created_by: "camilla@quadra.com",
  ...p,
});

beforeEach(() => {
  pdfMock.mockClear();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

describe("Relatórios semanais (lista)", () => {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onNew: vi.fn() };

  it("lista os relatórios salvos, o mais recente aberto", () => {
    render(
      <WeeklyReportsSection
        reports={[report({ id: "r2" }), report({ id: "r1", week_start: "2026-10-05", summary: "Contrapiso." })]}
        projectName="Salon Chéri"
        {...handlers}
      />,
    );
    const section = screen.getByTestId("weekly-reports-section");
    expect(within(section).getByText("Semana de 12 a 18 de outubro")).toBeInTheDocument();
    expect(within(section).getByText("Semana de 05 a 11 de outubro")).toBeInTheDocument();
    expect(within(section).getByText("Forro de gesso concluído.")).toBeInTheDocument(); // aberto
    expect(within(section).queryByText("Contrapiso.")).not.toBeInTheDocument(); // fechado
    expect(within(section).getAllByText("Aguardando cliente")).toHaveLength(2);
  });

  it("vazio oferece gerar o primeiro", () => {
    render(<WeeklyReportsSection reports={[]} {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: /Gerar Relatório Semanal/ }));
    expect(handlers.onNew).toHaveBeenCalled();
  });

  it("baixa o PDF com nome da obra", async () => {
    const createObjectURL = vi.fn(() => "blob:x");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<WeeklyReportsSection reports={[report({ id: "r1" })]} projectName="Salon Chéri" clientName="Ana" {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: /Baixar PDF/ }));
    await vi.waitFor(() => expect(pdfMock).toHaveBeenCalled());
    expect(pdfMock.mock.calls[0][1]).toEqual({ projectName: "Salon Chéri", clientName: "Ana" });
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    expect(toastMock.success).toHaveBeenCalledWith("PDF do relatório baixado");
    click.mockRestore();
  });

  it("envia pelo WhatsApp do cliente com o texto pronto e o link do portal", () => {
    const open = vi.spyOn(window, "open").mockImplementation((() => null) as typeof window.open);
    render(<WeeklyReportsSection reports={[report({ id: "r1" })]} projectName="Salon Chéri" clientName="Ana" clientPhone="(31) 99999-0000" portalUrl="https://app/client/tok" {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: /Enviar no WhatsApp/ }));
    const url = String(open.mock.calls[0][0]);
    expect(url.startsWith("https://wa.me/5531999990000?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1]);
    expect(text).toContain("Forro de gesso concluído.");
    expect(text).toContain("https://app/client/tok");
    open.mockRestore();
  });

  it("sem telefone, WhatsApp fica desligado e copiar continua", async () => {
    const writeText = vi.fn(async (_text: string) => undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<WeeklyReportsSection reports={[report({ id: "r1" })]} {...handlers} />);
    expect(screen.getByRole("button", { name: /Enviar no WhatsApp/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Copiar texto/ }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(String(writeText.mock.calls[0][0])).toContain("Pintura e emassamento.");
  });

  it("editar e excluir (com confirmação)", () => {
    render(<WeeklyReportsSection reports={[report({ id: "r1" })]} {...handlers} />);
    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    expect(handlers.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "r1" }));
    fireEvent.click(screen.getByRole("button", { name: /^Excluir$/ }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Excluir" }));
    expect(handlers.onDelete).toHaveBeenCalledWith("r1");
  });

  it("mostra quando o cliente já aprovou a pendência", () => {
    render(
      <WeeklyReportsSection
        reports={[report({ id: "r1" })]}
        responses={[{ weekly_report_id: "r1", pending_item: "Liberar o desenho da marmoraria", status: "aprovado" }]}
        {...handlers}
      />,
    );
    expect(screen.getByText("Cliente aprovou")).toBeInTheDocument();
  });
});

describe("Formulário do relatório", () => {
  it("vem preenchido com o resumo da IA e envia esses textos", () => {
    const onSubmit = vi.fn();
    render(
      <WeeklyReportModal
        open
        onOpenChange={vi.fn()}
        avgProgress={40}
        isPending={false}
        prefill={{ summary: "Texto da IA", next_steps: "Próximos da IA", client_pending: "Pendência da IA" }}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByTestId("ai-prefill-note")).toBeInTheDocument();
    expect(screen.getByLabelText("Resumo do período *")).toHaveValue("Texto da IA");
    expect(screen.getByLabelText("Próximas etapas *")).toHaveValue("Próximos da IA");
    expect(screen.getByLabelText("Pendências do cliente (opcional)")).toHaveValue("Pendência da IA");
    fireEvent.click(screen.getByRole("button", { name: "Salvar relatório" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ summary: "Texto da IA", next_steps: "Próximos da IA", client_pending: "Pendência da IA", completion_percent: 40 }));
    // Não apaga o texto ao enviar: se salvar falhar, nada se perde.
    expect(screen.getByLabelText("Resumo do período *")).toHaveValue("Texto da IA");
  });

  it("edição mantém a semana, permite tirar foto e salva alterações", () => {
    const onSubmit = vi.fn();
    render(
      <WeeklyReportModal
        open
        onOpenChange={vi.fn()}
        avgProgress={0}
        isPending={false}
        editing={report({ id: "r1", week_start: "2026-10-05", photo_urls: ["https://cdn/a.jpg", "https://cdn/b.jpg"] })}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText("Semana de 05 a 11 de outubro")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover foto 1" }));
    fireEvent.change(screen.getByLabelText("Resumo do período *"), { target: { value: "Corrigido" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ week_start: "2026-10-05", summary: "Corrigido", keep_photo_urls: ["https://cdn/b.jpg"], completion_percent: 64 }));
  });
});
