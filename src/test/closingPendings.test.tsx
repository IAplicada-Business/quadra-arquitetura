import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { clientOpenCount, closingPendings, closingResolved, type PortalClosingItem, type PortalData } from "@/lib/portal";
import { PendenciasScreen } from "@/components/portal/screens/PendenciasScreen";

const TODAY = new Date(2026, 10, 6); // 06/11/2026
const item = (id: string, status: string, closing_date: string | null, extra: Partial<PortalClosingItem> = {}): PortalClosingItem => ({
  id, description: `Item ${id}`, closing_date, delivery_date: null, status, ...extra,
});

describe("closingPendings", () => {
  it("só em cotação/aprovado, ordenados por data limite, sem data por último", () => {
    const r = closingPendings(
      [item("sem", "em_cotacao", null), item("tarde", "aprovado", "2026-12-20"), item("cedo", "em_cotacao", "2026-11-01"), item("ok", "comprado", "2026-10-01")],
      TODAY,
    );
    expect(r.map((x) => x.item.id)).toEqual(["cedo", "tarde", "sem"]);
  });
  it("urgência: vencida, esta semana, no prazo, sem data", () => {
    const u = (d: string | null) => closingPendings([item("x", "em_cotacao", d)], TODAY)[0].urgency;
    expect(u("2026-11-05")).toBe("vencida");
    expect(u("2026-11-06")).toBe("esta_semana");
    expect(u("2026-11-13")).toBe("esta_semana");
    expect(u("2026-11-14")).toBe("no_prazo");
    expect(u(null)).toBe("sem_data");
  });
  it("resolvidos são comprado/entregue", () => {
    expect(closingResolved([item("a", "comprado", null), item("b", "entregue", null), item("c", "em_cotacao", null)]).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("clientOpenCount soma relatório e fechamento sem duplicar", () => {
    const data = {
      weekly_reports: [{ id: "r1", week_start: "2026-11-02", client_pending: "Escolher piso" }],
      pending_responses: [],
      closing_items: [item("a", "em_cotacao", "2026-11-01"), item("b", "comprado", null)],
    } as unknown as PortalData;
    expect(clientOpenCount(data, TODAY)).toBe(2);
  });
});

const baseData = (over: Partial<PortalData>): PortalData =>
  ({ weekly_reports: [], pending_responses: [], closing_items: [], payments: [], tasks: [], ...over }) as unknown as PortalData;
const props = (data: PortalData) => ({ data, onApprove: () => {}, onRespond: () => {}, onOpenPhoto: () => {}, onGoTab: () => {}, submitting: false });

describe("PendenciasScreen", () => {
  it("só fechamento: mostra o item com valor e prazo; resolvido vai para o histórico", () => {
    render(
      <PendenciasScreen
        {...props(baseData({ closing_items: [item("a", "em_cotacao", "2000-01-01", { estimated_value: 1500, delivery_time: "30 dias" }), item("b", "comprado", null)] }))}
      />,
    );
    const open = screen.getByTestId("closing-open");
    expect(within(open).getByText("Item a")).toBeInTheDocument();
    expect(within(open).getByText("Vencida")).toBeInTheDocument();
    expect(within(open).getByText(/Prazo de entrega 30 dias/)).toBeInTheDocument();
    expect(within(open).getByText(/Valor previsto/)).toBeInTheDocument();
    expect(screen.getByText(/Aguardando vocês \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Já resolvidas \(1\)/)).toBeInTheDocument();
  });
  it("sem nada: estado vazio", () => {
    render(<PendenciasScreen {...props(baseData({}))} />);
    expect(screen.getByText("Nenhuma pendência no momento.")).toBeInTheDocument();
  });
  it("só relatório: não mostra bloco de fechamento", () => {
    render(<PendenciasScreen {...props(baseData({ weekly_reports: [{ id: "r1", week_start: "2026-11-02", client_pending: "Escolher piso" }] as never }))} />);
    expect(screen.queryByTestId("closing-open")).toBeNull();
    expect(screen.getByText("Escolher piso")).toBeInTheDocument();
  });
});
