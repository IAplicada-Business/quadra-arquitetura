import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DisciplinePieChart } from "@/components/projects/DisciplinePieChart";
import { sliceLabel } from "@/lib/disciplineAccounts";

const executed = [
  { discipline: "Civil", value: 7500 },
  { discipline: "Elétrica", value: 2500 },
];
const planned = [
  { discipline: "Civil", value: 12000 },
  { discipline: "Hidráulica", value: 8000 },
];

const legenda = () =>
  within(screen.getByTestId("discipline-pie")).getAllByRole("listitem").map((li) => li.textContent?.replace(/\u00a0/g, " "));

describe("sliceLabel", () => {
  it("mostra valor absoluto em reais e o percentual do total", () => {
    expect(sliceLabel(2500, 10000).replace(/\u00a0/g, " ")).toBe("R$ 2.500,00 · 25.0%");
    expect(sliceLabel(0, 0).replace(/\u00a0/g, " ")).toBe("R$ 0,00 · 0.0%");
  });
});

describe("DisciplinePieChart", () => {
  it("abre no executado, com valor e % por disciplina", () => {
    render(<DisciplinePieChart planned={planned} executed={executed} />);
    expect(screen.getByRole("radio", { name: "Executado" })).toHaveAttribute("aria-checked", "true");
    expect(legenda()).toEqual(["CivilR$ 7.500,00 · 75.0%", "ElétricaR$ 2.500,00 · 25.0%", "TotalR$ 10.000,00"]);
  });

  it("alterna para o previsto e volta; clicar no botão ativo não esvazia", () => {
    render(<DisciplinePieChart planned={planned} executed={executed} />);
    fireEvent.click(screen.getByRole("radio", { name: "Previsto" }));
    expect(legenda()).toEqual(["CivilR$ 12.000,00 · 60.0%", "HidráulicaR$ 8.000,00 · 40.0%", "TotalR$ 20.000,00"]);

    fireEvent.click(screen.getByRole("radio", { name: "Previsto" }));
    expect(screen.getByRole("radio", { name: "Previsto" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("radio", { name: "Executado" }));
    expect(legenda()[0]).toBe("CivilR$ 7.500,00 · 75.0%");
  });

  it("sem valores no modo escolhido, explica em vez de desenhar pizza vazia", () => {
    render(<DisciplinePieChart planned={planned} executed={[]} />);
    expect(screen.getByText("Sem valores executados para as disciplinas selecionadas.")).toBeInTheDocument();
  });
});
