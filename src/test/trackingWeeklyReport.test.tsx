import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WeeklyReportRecord } from "@/lib/weeklyReport";

/** Estado simulado do banco: relatórios salvos desta obra. */
const db = vi.hoisted(() => ({ reports: [] as Record<string, unknown>[] }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toastMock) }));
vi.mock("@/hooks/useVoiceInput", () => ({ useVoiceInput: () => ({ isRecording: false, isSupported: false, toggle: vi.fn() }) }));
vi.mock("@/components/ui/voice-input-button", () => ({ VoiceInputButton: () => null }));
vi.mock("@/components/messages/SendMessageModal", () => ({ SendMessageModal: () => null }));
vi.mock("@/components/construction/SupplierRatingDialog", () => ({ SupplierRatingDialog: () => null }));
vi.mock("@/hooks/useSiteDiary", () => ({
  useSiteDiary: () => ({
    entries: [{ id: "e1", entry_date: "2026-10-13", weather: "ensolarado", workers_count: 4, summary: "Forro da recepção", observations: null, disciplines_active: [] }],
    isLoading: false,
    create: { mutate: vi.fn(), isPending: false },
    remove: { mutate: vi.fn() },
  }),
}));
vi.mock("@/hooks/useScopeItems", () => ({ useScopeItems: () => ({ items: [] }) }));
vi.mock("@/hooks/useProjectDisciplines", () => ({ useProjectDisciplines: () => ({ disciplines: [] }) }));
vi.mock("@/hooks/useScheduleTasks", () => ({ useScheduleTasks: () => ({ items: [{ id: "t1", task_name: "Pintura", progress_percentage: 50, status: "em_execucao" }] }) }));
vi.mock("@/hooks/useSupplierAllocations", () => ({ useSupplierAllocations: () => ({ allocations: [] }) }));
vi.mock("@/hooks/useProjectAI", () => ({ useProjectAI: () => ({ callAction: vi.fn(), loading: false }) }));
vi.mock("@/hooks/useClientPortalToken", () => ({ useClientPortalToken: () => ({ activeToken: { token: "tok-salon" } }) }));
vi.mock("@/lib/generateWeeklyReportPdf", () => ({ generateWeeklyReportPdf: vi.fn() }));

vi.mock("@/hooks/useWeeklyReports", async () => {
  const { useState } = await import("react");
  return {
    useWeeklyReports: () => {
      const [reports, setReports] = useState(db.reports);
      const mk = (fn: (input: Record<string, unknown>) => Record<string, unknown> | void) => ({
        isPending: false,
        mutate: (input: Record<string, unknown>, opts?: { onSuccess?: (d: unknown) => void }) => {
          const res = fn(input);
          setReports([...db.reports]);
          opts?.onSuccess?.(res);
        },
      });
      return {
        reports,
        isLoading: false,
        create: mk((input) => {
          const row = { id: `r${db.reports.length + 1}`, created_at: "2026-10-13T18:00:00Z", created_by: "camilla@quadra.com", photo_urls: input.keep_photo_urls ?? [], client_pending: input.client_pending ?? null, ...input };
          db.reports = [row, ...db.reports];
          return row;
        }),
        update: mk((input) => {
          db.reports = db.reports.map((r) => (r.id === input.id ? { ...r, ...input } : r));
        }),
        remove: mk((id) => {
          db.reports = db.reports.filter((r) => r.id !== (id as unknown as string));
        }),
      };
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) },
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
  },
}));

import { ProjectTrackingTab } from "@/components/projects/ProjectTrackingTab";

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProjectTrackingTab projectId="p-salon" projectName="Salon Chéri" clientName="Ana Souza" clientPhone="31999990000" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  db.reports = [];
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Acompanhamento → resumo com IA → relatório salvo e visível", () => {
  it("o resumo da IA preenche o relatório e, salvo, ele aparece em Relatórios semanais", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ summary: "Forro de gesso da recepção concluído.", next_steps: "Pintura e iluminação.", client_pending: "Aprovar cor da parede" }),
      })),
    );
    renderTab();
    expect(screen.getByText("Nenhum relatório semanal ainda.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Gerar Resumo com IA/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Resumo do período *")).toHaveValue("Forro de gesso da recepção concluído.");
    expect(within(dialog).getByLabelText("Próximas etapas *")).toHaveValue("Pintura e iluminação.");
    expect(within(dialog).getByLabelText("Pendências do cliente (opcional)")).toHaveValue("Aprovar cor da parede");

    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar relatório" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const section = screen.getByTestId("weekly-reports-section");
    expect(within(section).getByText("Forro de gesso da recepção concluído.")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: /Baixar PDF/ })).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: /Enviar no WhatsApp/ })).toBeEnabled();
    expect(within(section).getByText("Todos os relatórios já aparecem no portal do cliente.")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("IA sem resumo mostra erro em vez de abrir formulário vazio", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Gerar Resumo com IA/ }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Não foi possível gerar o resumo", expect.anything()));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("editar um relatório salvo atualiza o texto na lista", async () => {
    db.reports = [
      { id: "r1", week_start: "2026-10-12", summary: "Texto antigo", next_steps: "Passos", completion_percent: 50, client_pending: null, photo_urls: [], created_at: "2026-10-13T10:00:00Z" } satisfies WeeklyReportRecord,
    ];
    renderTab();
    const section = screen.getByTestId("weekly-reports-section");
    fireEvent.click(within(section).getByRole("button", { name: /Editar/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Resumo do período *"), { target: { value: "Texto corrigido" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(within(screen.getByTestId("weekly-reports-section")).getByText("Texto corrigido")).toBeInTheDocument());
  });
});
