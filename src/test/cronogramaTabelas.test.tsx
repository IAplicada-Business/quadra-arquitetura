import { afterEach, describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TabelaFechamento, TabelaReversa } from "@/components/portal/CronogramaScreen";
import { cronogramaReverso, type LinhaDeCompra } from "@/lib/portalSchedule";

const linha = (over: Partial<LinhaDeCompra> & { id: string; nome: string }): LinhaDeCompra => ({
  tipo: "contratacao", disciplina: "Obra", fornecedor: null, valor: null, condicao: null,
  precisaEm: null, fecharAte: null, entregaDias: null, urgencia: "proximo", diasAteLimite: null,
  status: "pendente", link: null, ...over,
});

const larguraOriginal = window.innerWidth;
const definirLargura = (w: number) => Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: w });
afterEach(() => definirLargura(larguraOriginal));

const textoDasLinhas = (t: HTMLElement) => within(t).getAllByRole("row").map((r) => r.textContent);

describe("Cronograma de fechamento (colunas da Q153, visual Trilha)", () => {
  const linhas = [
    linha({ id: "2", nome: "Mármore", precisaEm: "2026-10-08", fecharAte: "2026-09-24", entregaDias: 20 }),
    linha({ id: "1", nome: "Engenharia Obra", precisaEm: "2026-09-21", fecharAte: "2026-09-11", entregaDias: 90, urgencia: "atrasado" }),
    linha({ id: "3", nome: "Móveis", precisaEm: "2026-10-07", fecharAte: "2026-10-02" }),
  ];

  it("agrupa por mês da data limite, com a mais próxima primeiro", () => {
    render(<TabelaFechamento linhas={linhas} />);
    const t = screen.getByTestId("tabela-fechamento");
    expect(within(t).getByText("Cronograma de fechamento")).toBeInTheDocument();
    ["MÊS / ANO", "DATA DE ENTREGA", "DATA LIMITE DE FECHAMENTO", "DESCRIÇÃO", "PRAZO DE ENTREGA"].forEach((h) =>
      expect(within(t).getByText(h)).toBeInTheDocument());
    expect(textoDasLinhas(t).slice(1)).toEqual([
      "SETEMBRO/2026",
      "SETEMBRO/202621/09/202611/09/2026VencidaEngenharia Obra90 dias úteis",
      "SETEMBRO/202608/10/202624/09/2026Mármore20 dias úteis",
      "OUTUBRO/2026",
      "OUTUBRO/202607/10/202602/10/2026Móveis",
    ]);
  });

  it("data limite vencida ganha o selo Vencida", () => {
    render(<TabelaFechamento linhas={linhas} />);
    expect(screen.getByText("Vencida")).toBeInTheDocument();
  });

  it("no celular vira cartões por mês, sem tabela e sem texto duplicado", () => {
    definirLargura(360);
    render(<TabelaFechamento linhas={linhas} />);
    const t = screen.getByTestId("tabela-fechamento");
    expect(within(t).queryByRole("table")).toBeNull();
    expect(within(t).getAllByText("Engenharia Obra")).toHaveLength(1);
    expect(within(t).getByText("Vencida")).toBeInTheDocument();
    expect(within(t).getByText(/Fechar até 11\/09\/2026 · Entrega 21\/09\/2026 · 90 dias úteis/)).toBeInTheDocument();
  });
});

describe("Cronograma reverso (colunas da Q153, visual Trilha)", () => {
  const etapasBase = () =>
    cronogramaReverso([
      { id: "a", name: "Demolição", discipline: "Obra", status: "pendente", progress_percent: 0, start_date: "2026-09-29", end_date: "2026-10-15" },
      { id: "b", name: "Arremates", discipline: "Obra", status: "pendente", progress_percent: 0, start_date: "2027-02-19", end_date: "2027-02-23" },
    ], "2026-11-04");

  it("último marco no topo, com datas dd/mm/aaaa e prazo da planilha", () => {
    render(<TabelaReversa etapas={etapasBase()} />);
    const corpo = textoDasLinhas(screen.getByTestId("tabela-reversa")).slice(1);
    expect(corpo[0]).toContain("19/02/202723/02/2027Arremates");
    expect(corpo[0].endsWith("2")).toBe(true);
    expect(corpo[1]).toContain("29/09/202615/10/2026Demolição");
    expect(corpo[1].endsWith("12")).toBe(true);
  });

  it("cabeçalho e linhas têm as mesmas quatro colunas", () => {
    const etapas = cronogramaReverso([
      { id: "a", name: "Demolição", discipline: "Obra", status: "pendente", progress_percent: 0, start_date: "2026-09-29", end_date: "2026-10-15" },
      { id: "b", name: "Medição", discipline: "Obra", status: "pendente", progress_percent: 0, start_date: "2026-10-08", end_date: null },
    ], "2026-11-04");
    render(<TabelaReversa etapas={etapas} />);
    const linhas = within(screen.getByTestId("tabela-reversa")).getAllByRole("row");
    expect(within(linhas[0]).getAllByRole("columnheader").map((c) => c.textContent))
      .toEqual(["COMEÇO", "TÉRMINO", "SERVIÇO EXECUTADO", "PRAZO (DIAS ÚTEIS)"]);
    for (const l of linhas.slice(1)) expect(within(l).getAllByRole("cell")).toHaveLength(4);
  });

  it("etapa atrasada recebe o selo Atrasada", () => {
    const etapas = cronogramaReverso([
      { id: "a", name: "Demolição", discipline: "Obra", status: "em_andamento", progress_percent: 20, start_date: "2026-09-01", end_date: "2026-09-10" },
    ], "2026-11-04");
    render(<TabelaReversa etapas={etapas} />);
    expect(within(screen.getByTestId("tabela-reversa")).getAllByText("Atrasada").length).toBeGreaterThan(0);
  });

  it("no celular vira cartões na mesma ordem, sem tabela e sem texto duplicado", () => {
    definirLargura(360);
    render(<TabelaReversa etapas={etapasBase()} />);
    const t = screen.getByTestId("tabela-reversa");
    expect(within(t).queryByRole("table")).toBeNull();
    const itens = within(t).getAllByRole("listitem").map((l) => l.textContent);
    expect(itens[0]).toContain("Arremates");
    expect(itens[1]).toContain("Demolição");
    expect(within(t).getAllByText("Arremates")).toHaveLength(1);
  });
});
