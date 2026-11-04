import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ComprasScreen } from "@/components/portal/screens/ComprasScreen";
import type { PortalData, PortalPurchase } from "@/lib/portal";

const compra = (o: Partial<PortalPurchase> & { id: string }): PortalPurchase => ({
  name: `Item ${o.id}`,
  category: "Revestimentos",
  supplier_name: "Granvilla",
  value: 1000,
  deadline: "2026-12-10",
  status: "pendente",
  payment_info: null,
  product_link: "https://exemplo.com/produto",
  ...o,
});

const render6 = (purchases: PortalPurchase[]) =>
  render(
    <ComprasScreen
      data={{ purchases } as unknown as PortalData}
      onApprove={() => {}}
      onRespond={() => {}}
      onOpenPhoto={() => {}}
      onGoTab={() => {}}
    />,
  );

describe("ComprasScreen", () => {
  it("mostra totais por etapa, categorias, link do produto e prazo", () => {
    render6([
      compra({ id: "1", status: "pendente" }),
      compra({ id: "2", status: "comprado" }),
      compra({ id: "3", status: "entregue", category: "Elétrica", product_link: null }),
    ]);
    expect(within(screen.getByTestId("compras-qtd-decidir")).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByTestId("compras-qtd-pedido")).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByTestId("compras-qtd-rota")).getByText("0")).toBeInTheDocument();
    expect(within(screen.getByTestId("compras-qtd-entregue")).getByText("1")).toBeInTheDocument();
    expect(screen.getByTestId("compras-cat-Revestimentos")).toHaveTextContent("2 itens");
    expect(screen.getByTestId("compras-cat-Elétrica")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Ver produto/ })).toHaveLength(2);
    expect(screen.getByText(/Decidir até/)).toBeInTheDocument();
  });

  it("sem compras mostra mensagem vazia", () => {
    render6([]);
    expect(screen.getByTestId("compras-vazio")).toBeInTheDocument();
  });
});
