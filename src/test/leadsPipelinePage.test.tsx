import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const canViewPath = vi.fn();

vi.mock("@/hooks/useLeads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useLeads")>();
  const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };
  return {
    ...actual,
    useLeads: () => ({
      leads: [
        { id: "1", name: "Camilla Paula", phone: "11", email: null, status: "fechado", origin: "indicacao", project_type: "residencial", created_at: "2026-10-01T10:00:00", channel_id: null },
        { id: "2", name: "Condomínio Azul", phone: "22", email: null, status: "novo", origin: "site", project_type: "comercial", created_at: "2026-11-01T10:00:00", channel_id: null },
      ],
      isLoading: false,
      create: mutation,
      update: mutation,
      remove: mutation,
      convertToClient: mutation,
    }),
  };
});
vi.mock("@/hooks/useAcquisitionChannels", () => ({ useAcquisitionChannels: () => ({ channels: [] }) }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ canViewPath }) }));
vi.mock("@/components/leads/LeadFormDialog", () => ({ LeadFormDialog: () => null }));
vi.mock("@/components/messages/SendMessageModal", () => ({ SendMessageModal: () => null }));

import LeadsPipeline from "@/pages/LeadsPipeline";

const renderPage = () =>
  render(
    <MemoryRouter>
      <LeadsPipeline />
    </MemoryRouter>,
  );

describe("Pipeline de Leads sem a aba de análise", () => {
  beforeEach(() => canViewPath.mockReset());

  it("mostra só kanban e tabela, sem o cartão Conversão", () => {
    canViewPath.mockReturnValue(true);
    renderPage();
    expect(screen.getAllByRole("tab").map((t) => t.getAttribute("aria-label"))).toEqual(["Kanban", "Tabela"]);
    expect(screen.queryByText("Conversão")).not.toBeInTheDocument();
    expect(screen.queryByText("Conversão por Origem")).not.toBeInTheDocument();
    expect(screen.getAllByText("Camilla Paula").length).toBeGreaterThan(0);
  });

  it("leva à análise no Dashboard Comercial quando o usuário tem acesso", () => {
    canViewPath.mockReturnValue(true);
    renderPage();
    const link = screen.getByRole("link", { name: /Ver análise no Dashboard Comercial/ });
    expect(link).toHaveAttribute("href", "/dashboard/escritorio");
    expect(canViewPath).toHaveBeenCalledWith("/dashboard/escritorio");
  });

  it("esconde o link para quem não pode ver o Dashboard Comercial", () => {
    canViewPath.mockReturnValue(false);
    renderPage();
    expect(screen.queryByRole("link", { name: /Ver análise no Dashboard Comercial/ })).not.toBeInTheDocument();
  });
});
