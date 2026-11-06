import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TabelaFechamento, TabelaReversa } from "@/components/portal/CronogramaScreen";
import { cronogramaReverso, type LinhaDeCompra } from "@/lib/portalSchedule";

const linha = (over: Partial<LinhaDeCompra> & { id: string; nome: string }): LinhaDeCompra => ({
  tipo: "contratacao", disciplina: "Obra", fornecedor: null, valor: null, condicao: null,
  precisaEm: null, fecharAte: null, entregaDias: null, urgencia: "proximo", diasAteLimite: null,
  status: "pendente", link: null, ...over,
});

describe("Cronograma de fechamento (formato Q153)", () => {
  const linhas = [
    linha({ id: "2", nome: "Mármore", precisaEm: "2026-10-08", fecharAte: "2026-09-24", entregaDias: 20 }),
    linha({ id: "1", nome: "Engenharia Obra", precisaEm: "2026-09-21", fecharAte: "2026-09-11", entregaDias: 90, urgencia: "atrasado" }),
    linha({ id: "3", nome: "Móveis", precisaEm: "2026-10-07", fecharAte: "2026-10-02" }),
  ];

  it("agrupa por mês da data limite, com a mais próxima primeiro", () => {
    render(<TabelaFechamento linhas={linhas} />);
    const t = screen.getByTestId("tabela-fechamento");
    expect(within(t).getByText("CRONOGRAMA DE FECHAMENTO")).toBeInTheDocument();
    ["MÊS / ANO", "DATA DE ENTREGA", "DATA LIMITE DE FECHAMENTO", "DESCRIÇÃO", "PRAZO DE ENTREGA"].forEach((h) =>
      expect(within(t).getByText(h)).toBeInTheDocument());
    const linhasTexto = within(t).getAllByRole("row").map((r) => r.textContent);
    expect(linhasTexto.slice(2)).toEqual([
      "SETEMBRO/2026",
      "SETEMBRO/202621/09/202611/09/2026Engenharia Obra90 dias úteis",
      "SETEMBRO/202608/10/202624/09/2026Mármore20 dias úteis",
      "OUTUBRO/2026",
      "OUTUBRO/202607/10/202602/10/2026Móveis",
    ]);
  });

  it("data limite vencida fica em vermelho", () => {
    render(<TabelaFechamento linhas={linhas} />);
    expect(screen.getByText("11/09/2026").className).toContain("bg-[#ff0000]");
  });
});

describe("Cronograma reverso (formato Q153)", () => {
  it("último marco no topo, com datas dd/mm/aaaa e prazo da planilha", () => {
    const etapas = cronogramaReverso([
      { id: "a", name: "Demolição", discipline: "Obra", status: "pendente", progress_percent: 0, start_date: "2026-09-29", end_date: "2026-10-15" },
      { id: "b", name: "Arremates", discipline: "Obra", status: "pendente", progress_percent: 0, start_date: "2027-02-19", end_date: "2027-02-23" },
    ], "2026-11-04");
    render(<TabelaReversa etapas={etapas} />);
    const t = screen.getByTestId("tabela-reversa");
    const corpo = within(t).getAllByRole("row").slice(2).map((r) => r.textContent);
    expect(corpo).toEqual(["19/02/202723/02/2027Arremates2", "29/09/202615/10/2026Demolição12"]);
  });

  it("cabeçalho e linhas têm as mesmas quatro colunas, todas centralizadas", () => {
    const etapas = cronogramaReverso([
      { id: "a", name: "Demolição", discipline: "Obra", status: "pendente", progress_percent: 0, start_date: "2026-09-29", end_date: "2026-10-15" },
      { id: "b", name: "Medição", discipline: "Obra", status: "pendente", progress_percent: 0, start_date: "2026-10-08", end_date: null },
    ], "2026-11-04");
    render(<TabelaReversa etapas={etapas} />);
    const linhas = within(screen.getByTestId("tabela-reversa")).getAllByRole("row");
    expect(within(linhas[1]).getAllByRole("columnheader").map((c) => c.textContent))
      .toEqual(["COMEÇO", "TÉRMINO", "SERVIÇO EXECUTADO", "PRAZO (DIAS ÚTEIS)"]);
    for (const l of linhas.slice(2)) {
      const celulas = within(l).getAllByRole("cell");
      expect(celulas).toHaveLength(4);
      celulas.forEach((c) => expect(c.className).toContain("text-center"));
    }
  });
});
