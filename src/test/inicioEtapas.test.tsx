import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { PortalData } from "@/lib/portal";
import { InicioScreen } from "@/components/portal/screens/InicioScreen";

const task = (i: number, status: string, progress: number) => ({
  id: `t${i}`, task_name: `Etapa ${i}`, start_date: `2026-0${Math.min(i, 9)}-01`, end_date: `2026-0${Math.min(i, 9)}-20`,
  status, discipline: `Disc ${i}`, color: null, progress_percentage: progress,
});

const data = (tasks: ReturnType<typeof task>[]): PortalData =>
  ({
    project: { name: "Obra", address: "", city: "", estimated_budget: 1, ideal_budget: null, client_move_in_date: null, client_name: "Cliente" },
    tasks, payments: [], invoices: [], photos: [], weekly_reports: [], pending_responses: [], closing_items: [], activities: [],
  }) as unknown as PortalData;

const props = (d: PortalData) => ({ data: d, onApprove: () => {}, onRespond: () => {}, onOpenPhoto: () => {}, onGoTab: () => {}, submitting: false });

describe("Etapas da obra (lista vertical)", () => {
  const many = [
    task(1, "executado", 100), task(2, "executado", 100), task(3, "executado", 100),
    task(4, "em_execucao", 40),
    task(5, "pendente", 0), task(6, "pendente", 0), task(7, "pendente", 0), task(8, "pendente", 0), task(9, "pendente", 0),
  ];

  it("recolhe as concluídas, mostra a atual e as próximas 3", () => {
    render(<InicioScreen {...props(data(many))} />);
    const lista = screen.getByTestId("trail-blocks");
    expect(within(lista).getByTestId("trail-expand-done")).toHaveTextContent("3 concluídas");
    expect(within(lista).queryByTestId("trail-block-Disc 1")).toBeNull();
    expect(within(lista).getByTestId("trail-block-Disc 4")).toHaveTextContent("Em execução agora");
    expect(within(lista).getByTestId("trail-block-Disc 7")).toBeInTheDocument();
    expect(within(lista).queryByTestId("trail-block-Disc 8")).toBeNull();
    expect(within(lista).getByTestId("trail-expand-all")).toBeInTheDocument();
  });

  it("Ver todas as etapas expande tudo e a atual continua visível", () => {
    render(<InicioScreen {...props(data(many))} />);
    const lista = screen.getByTestId("trail-blocks");
    fireEvent.click(within(lista).getByTestId("trail-expand-all"));
    expect(within(lista).getByTestId("trail-block-Disc 1")).toBeInTheDocument();
    expect(within(lista).getByTestId("trail-block-Disc 9")).toBeInTheDocument();
    expect(within(lista).getByTestId("trail-block-Disc 4")).toBeInTheDocument();
    expect(within(lista).queryByTestId("trail-expand-all")).toBeNull();
  });

  it("poucas etapas: nada para recolher", () => {
    render(<InicioScreen {...props(data([task(1, "em_execucao", 10), task(2, "pendente", 0)]))} />);
    const lista = screen.getByTestId("trail-blocks");
    expect(within(lista).queryByTestId("trail-expand-done")).toBeNull();
    expect(within(lista).queryByTestId("trail-expand-all")).toBeNull();
  });
});

describe("Linha do tempo horizontal", () => {
  it("é uma região focável com rótulo e mantém aria-current na etapa atual", () => {
    render(<InicioScreen {...props(data([task(1, "executado", 100), task(2, "em_execucao", 30), task(3, "pendente", 0)]))} />);
    const j = screen.getByTestId("trail-journey");
    expect(j).toHaveAttribute("tabindex", "0");
    expect(j).toHaveAccessibleName("Linha do tempo da obra");
    expect(j.querySelector('[aria-current="step"]')).toHaveTextContent("Disc 2");
  });

  it("sem rolagem (tudo cabe) não mostra setas nem esmaecimento", () => {
    render(<InicioScreen {...props(data([task(1, "em_execucao", 30)]))} />);
    expect(screen.queryByLabelText("Próximas etapas")).toBeNull();
    expect(screen.queryByTestId("trail-fade-right")).toBeNull();
  });
});
