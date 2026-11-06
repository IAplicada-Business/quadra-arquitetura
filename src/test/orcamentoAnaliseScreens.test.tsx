import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PortalData } from "@/lib/portal";
import { tabFromHash, PORTAL_TABS, isPortalTab } from "@/lib/portal";

vi.mock("@/components/portal/ScenariosSection", () => ({
  ScenariosSection: () => <div data-testid="cenarios">cenarios</div>,
  DetalheDisciplinas: () => <div data-testid="disciplinas">disciplinas</div>,
}));
const analise = vi.hoisted(() => ({ vazio: false }));
vi.mock("@/lib/portalScenarios", async (orig) => ({ ...(await orig<object>()), analiseDeCenarios: () => ({ vazio: analise.vazio }) }));

import { OrcamentoScreen } from "@/components/portal/screens/OrcamentoScreen";
import { AnaliseScreen } from "@/components/portal/screens/AnaliseScreen";

const data = { project: { estimated_budget: 60000 }, payments: [{ id: "p", value: 1, status: "pago" }], invoices: [], quotes: [], scope_items: [] } as unknown as PortalData;
const props = { data, onApprove: () => {}, onRespond: () => {}, onOpenPhoto: () => {}, onGoTab: () => {}, submitting: false };

describe("Orçamento", () => {
  it("mostra o total e as propostas por disciplina, sem prestação de contas nem cenários", () => {
    render(<OrcamentoScreen {...props} />);
    expect(screen.getByTestId("screen-orcamento")).toHaveTextContent("R$ 60.000,00");
    expect(screen.getByTestId("disciplinas")).toBeInTheDocument();
    expect(screen.queryByTestId("cenarios")).toBeNull();
    expect(screen.queryByText(/Prestação de contas/)).toBeNull();
    expect(screen.queryByText("Pagamentos")).toBeNull();
  });
});

describe("Análise orçamentária", () => {
  it("mostra os cenários", () => {
    analise.vazio = false;
    render(<AnaliseScreen {...props} />);
    expect(screen.getByRole("heading", { name: "Análise orçamentária" })).toBeInTheDocument();
    expect(screen.getByTestId("cenarios")).toBeInTheDocument();
  });
  it("sem propostas mostra aviso", () => {
    analise.vazio = true;
    render(<AnaliseScreen {...props} />);
    expect(screen.getByText(/aparece aqui quando a equipe tiver propostas/)).toBeInTheDocument();
  });
});

describe("abas do portal", () => {
  it("ordem e hashes novos; antigos e desconhecidos continuam válidos", () => {
    expect(PORTAL_TABS.map((t) => t.key)).toEqual(["inicio", "pendencias", "galeria", "orcamento", "analise", "prestacao", "cronograma", "compras", "resumos"]);
    expect(tabFromHash("#analise")).toBe("analise");
    expect(tabFromHash("#prestacao")).toBe("prestacao");
    expect(tabFromHash("#orcamento")).toBe("orcamento");
    expect(tabFromHash("#nada")).toBe("inicio");
    expect(isPortalTab("prestacao")).toBe(true);
  });
});
