import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BudgetQuoteTable } from "@/components/projects/BudgetQuoteTable";

const cotacoes = [
  {
    id: "q1",
    services_description: "Regularização e Instalação de novo piso (48m2)",
    supplier_name: null,
    value: 5760,
    material_estimate: null,
    delivery_time: "15 dias úteis",
    payment_terms: "50%/50%",
    status: "pendente",
  },
  {
    id: "q2",
    services_description: "Demolição de contrapiso (48m2)",
    supplier_name: "Construtora Roma",
    value: 2400,
    material_estimate: 800,
    delivery_time: null,
    payment_terms: null,
    status: "aprovado",
  },
];

function renderTabela(props: Partial<React.ComponentProps<typeof BudgetQuoteTable>> = {}) {
  return render(
    <BudgetQuoteTable
      quotes={cotacoes}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onApprove={vi.fn()}
      {...props}
    />,
  );
}

const linhaDe = (texto: string) => screen.getByText(texto).closest("tr")!;

describe("BudgetQuoteTable", () => {
  it("lista cada cotação numa linha, com valor e status", () => {
    renderTabela();
    expect(screen.getByText("R$ 5.760,00")).toBeInTheDocument();
    expect(screen.getByText("Construtora Roma")).toBeInTheDocument();
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    // fornecedor vazio não vira card órfão: a linha diz "Não informado"
    expect(screen.getByText("Não informado")).toBeInTheDocument();
  });

  /* O ponto do pedido: sem clicar, nada de prazo/pagamento/ações — era isso
     que enchia a tela quando cada cotação era um card. */
  it("começa fechada: prazo, pagamento e ações não aparecem", () => {
    renderTabela();
    expect(screen.queryByText("Prazo de entrega")).toBeNull();
    expect(screen.queryByText("Forma de pagamento")).toBeNull();
    expect(screen.queryByRole("button", { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remover/ })).toBeNull();
  });

  it("clicar na linha revela detalhes e ações; clicar de novo fecha", () => {
    renderTabela();
    const linha = linhaDe("Regularização e Instalação de novo piso (48m2)");

    fireEvent.click(linha);
    expect(screen.getByText("15 dias úteis")).toBeInTheDocument();
    expect(screen.getByText("50%/50%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Editar/ })).toBeInTheDocument();

    fireEvent.click(linha);
    expect(screen.queryByText("15 dias úteis")).toBeNull();
  });

  it("abre também pelo teclado e marca aria-expanded", () => {
    renderTabela();
    const linha = linhaDe("Demolição de contrapiso (48m2)");
    expect(linha).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(linha, { key: "Enter" });
    expect(linha).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Prazo de entrega")).toBeInTheDocument();
  });

  it("soma serviço + material no total do detalhe", () => {
    renderTabela();
    fireEvent.click(linhaDe("Demolição de contrapiso (48m2)"));
    expect(screen.getByText("R$ 3.200,00")).toBeInTheDocument();
  });

  it("cotação aprovada não oferece Aprovar de novo", () => {
    renderTabela();
    fireEvent.click(linhaDe("Demolição de contrapiso (48m2)"));
    expect(screen.queryByRole("button", { name: /Aprovar/ })).toBeNull();

    fireEvent.click(linhaDe("Regularização e Instalação de novo piso (48m2)"));
    expect(screen.getByRole("button", { name: /Aprovar/ })).toBeInTheDocument();
  });

  it("as linhas abrem de forma independente", () => {
    renderTabela();
    fireEvent.click(linhaDe("Regularização e Instalação de novo piso (48m2)"));
    fireEvent.click(linhaDe("Demolição de contrapiso (48m2)"));
    // duas abertas ao mesmo tempo, cada uma com seu bloco de detalhe
    expect(screen.getAllByText("Prazo de entrega")).toHaveLength(2);
  });

  it("aciona os callbacks da linha certa", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onApprove = vi.fn();
    renderTabela({ onEdit, onDelete, onApprove });

    fireEvent.click(linhaDe("Regularização e Instalação de novo piso (48m2)"));
    fireEvent.click(screen.getByRole("button", { name: /Aprovar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Remover/ }));

    expect(onApprove).toHaveBeenCalledWith(expect.objectContaining({ id: "q1" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "q1" }));
    expect(onDelete).toHaveBeenCalledWith("q1");
  });
});
