import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EtapaScreen } from "@/components/portal/screens/EtapaScreen";
import { activitiesOfBlock } from "@/lib/portalTrail";
import type { PortalActivity } from "@/lib/portal";
import type { ConstructionBlock } from "@/lib/portalTrail";

const act = (o: Partial<PortalActivity> & { id: string; name: string }): PortalActivity => ({
  discipline: "Elétrica",
  status: "pendente",
  progress_percent: 0,
  start_date: null,
  end_date: null,
  ...o,
});

const block: ConstructionBlock = {
  name: "Elétrica",
  start: "2026-11-02",
  end: "2026-11-20",
  total: 2,
  done: 1,
  progress: 50,
  state: "em_andamento",
  late: false,
};

const activities = [
  act({ id: "a1", name: "Passagem de eletrodutos", status: "concluida", start_date: "2026-11-02" }),
  act({ id: "a2", name: "Quadro de distribuição", status: "em_andamento", start_date: "2026-11-10" }),
  act({ id: "b1", name: "Tubulação de água", discipline: "Hidráulica" }),
];

describe("activitiesOfBlock", () => {
  it("filtra pela disciplina da etapa e ordena por início", () => {
    expect(activitiesOfBlock("Elétrica", activities).map((a) => a.id)).toEqual(["a1", "a2"]);
  });
});

describe("EtapaScreen", () => {
  it("mostra progresso, atividades da etapa, diário e pendências; voltar chama onBack", () => {
    const onBack = vi.fn();
    render(
      <EtapaScreen
        block={block}
        index={1}
        total={4}
        activities={activities}
        data={{
          weekly_reports: [
            { id: "r1", week_start: "2026-11-02", summary: "Eletrodutos concluídos.", next_steps: "", completion_percent: 40, photo_urls: [], client_pending: "Escolher tomadas" } as never,
          ],
          pending_responses: [],
        }}
        onBack={onBack}
        onApprove={() => {}}
        onRespond={() => {}}
      />,
    );
    expect(screen.getByTestId("etapa-progresso")).toHaveTextContent("50%");
    expect(screen.getByText("Etapa 2 de 4")).toBeInTheDocument();
    expect(screen.getByTestId("etapa-atividade-a1")).toHaveTextContent("Concluída");
    expect(screen.getByTestId("etapa-atividade-a2")).toHaveTextContent("Em andamento");
    expect(screen.queryByText("Tubulação de água")).not.toBeInTheDocument();
    expect(screen.getByText("Eletrodutos concluídos.")).toBeInTheDocument();
    expect(screen.getByText("Escolher tomadas")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("etapa-voltar"));
    expect(onBack).toHaveBeenCalled();
  });
});
