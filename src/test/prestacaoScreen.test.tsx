import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { PortalData } from "@/lib/portal";



import { PrestacaoScreen } from "@/components/portal/screens/PrestacaoScreen";

const mk = (over: Partial<PortalData>): PortalData =>
  ({ project: { estimated_budget: 60000 }, payments: [], invoices: [], ...over }) as unknown as PortalData;
const props = (data: PortalData) => ({ data, onApprove: () => {}, onRespond: () => {}, onOpenPhoto: () => {}, onGoTab: () => {}, submitting: false });

describe("PrestacaoScreen (principal + lateral)", () => {
  it("sem notas não existe segunda coluna de notas; resumo fica na lateral", () => {
    render(<PrestacaoScreen {...props(mk({ payments: [{ id: "p1", description: "Entrada", value: 10000, status: "pago", due_date: "2026-01-10" }] as never }))} />);
    expect(screen.queryByTestId("prestacao-notas")).toBeNull();
    expect(within(screen.getByTestId("prestacao-resumo")).getByText("Contratado")).toBeInTheDocument();
    expect(within(screen.getByTestId("prestacao-principal")).getByText("Entrada")).toBeInTheDocument();
    expect(screen.getByTestId("screen-prestacao")).toHaveTextContent("R$ 60.000,00");
  });

  it("com notas mostra o bloco de notas em largura total", () => {
    render(
      <PrestacaoScreen
        {...props(mk({ payments: [{ id: "p1", description: "Entrada", value: 10000, status: "pago", due_date: "2026-01-10" }] as never, invoices: [{ id: "n1", store_name: "Loja X", value: 500, date: "2026-02-01" }] as never }))}
      />,
    );
    expect(within(screen.getByTestId("prestacao-notas")).getByText("Loja X")).toBeInTheDocument();
  });

  it("sem pagamentos mostra uma linha, não o cartão grande", () => {
    render(<PrestacaoScreen {...props(mk({}))} />);
    expect(screen.getByText("Ainda não há pagamentos registrados.")).toBeInTheDocument();
  });

  it("pagamento pendente com data vencida aparece como Atrasado", () => {
    render(
      <PrestacaoScreen
        {...props(mk({ payments: [{ id: "p1", description: "Parcela 2", value: 5000, status: "pendente", due_date: "2000-01-01" }, { id: "p2", description: "Parcela 3", value: 5000, status: "pendente", due_date: "2999-01-01" }] as never }))}
      />,
    );
    expect(screen.getByText("Atrasado")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });
});
