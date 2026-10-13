import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ReverseScheduleTable } from "@/components/projects/ReverseScheduleTable";
import type { ProjectActivity } from "@/hooks/useProjectActivities";
import type { DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";

const HOJE = "2026-09-29";

function act(partial: Partial<ProjectActivity> & { id: string; name: string }): ProjectActivity {
  return {
    project_id: "p1",
    user_id: "u1",
    description: null,
    area_m2: null,
    duration_days: null,
    start_date: null,
    end_date: null,
    medicao_date: null,
    status: "pendente",
    progress_percent: 0,
    depends_on: [],
    discipline: null,
    position: 0,
    created_at: "2026-09-01T00:00:00Z",
    ...partial,
  };
}

function chk(partial: Partial<DeliveryChecklistItem> & { id: string; description: string }): DeliveryChecklistItem {
  return {
    project_id: "p1",
    user_id: "u1",
    activity_id: null,
    discipline: null,
    responsible: null,
    due_date: null,
    priority: "media",
    resolved: false,
    resolved_at: null,
    photo_paths: [],
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...partial,
  };
}

const onUpdateDates = vi.fn();
const onCascade = vi.fn();

const demolicao = act({ id: "a1", name: "Demolição", start_date: "2026-09-21", end_date: "2026-10-02", duration_days: 10, status: "em_andamento", discipline: "Civil" });
// Elétrica e Pintura começam no dia seguinte ao fim (calendário) da Demolição,
// como o Gantt calcula o caminho crítico: sem folga entre elas.
const eletrica = act({ id: "a2", name: "Elétrica", start_date: "2026-10-01", end_date: "2026-10-07", duration_days: 5, depends_on: ["a1"], position: 1 });
const pintura = act({ id: "a3", name: "Pintura", start_date: "2026-10-01", end_date: "2026-10-05", duration_days: 3, depends_on: ["a1"], position: 2 });
const atrasada = act({ id: "a4", name: "Marcenaria", start_date: "2026-09-14", end_date: "2026-09-25", duration_days: 10, status: "pendente", position: 3 });

function renderTable(activities: ProjectActivity[], extra: Partial<React.ComponentProps<typeof ReverseScheduleTable>> = {}) {
  return render(
    <ReverseScheduleTable activities={activities} onUpdateDates={onUpdateDates} onCascade={onCascade} today={HOJE} {...extra} />,
  );
}

beforeEach(() => {
  onUpdateDates.mockReset();
  onCascade.mockReset();
});

describe("Cronograma Reverso", () => {
  it("mostra dias trabalhados e faltantes em dias úteis", () => {
    renderTable([demolicao]);
    expect(screen.getByTestId("worked-a1")).toHaveTextContent("7");
    expect(screen.getByTestId("remaining-a1")).toHaveTextContent("3");
    expect(screen.getByTestId("days-to-end")).toHaveTextContent("3");
  });

  it("edita a data direto na tabela, sem modal, e persiste com prazo recalculado", () => {
    renderTable([demolicao]);
    fireEvent.click(screen.getByRole("button", { name: "Editar término de Demolição" }));
    const input = screen.getByLabelText("Editar término de Demolição") as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "2026-10-09" } });
    expect(onUpdateDates).toHaveBeenCalledWith({ id: "a1", start_date: "2026-09-21", end_date: "2026-10-09", duration_days: 15 });
  });

  it("dias faltantes recalculam quando a data prevista muda", () => {
    const { rerender } = renderTable([demolicao]);
    expect(screen.getByTestId("remaining-a1")).toHaveTextContent("3");

    // Simula o cache otimista: a linha volta com a nova data.
    rerender(
      <ReverseScheduleTable
        activities={[{ ...demolicao, end_date: "2026-10-09", duration_days: 15 }]}
        onUpdateDates={onUpdateDates}
        onCascade={onCascade}
        today={HOJE}
      />,
    );
    expect(screen.getByTestId("remaining-a1")).toHaveTextContent("8");
    expect(screen.getByTestId("worked-a1")).toHaveTextContent("7");
  });

  it("editar o prazo em dias úteis recalcula o término considerando feriado", () => {
    const sexta = act({ id: "a9", name: "Gesso", start_date: "2026-09-04", end_date: "2026-09-04", duration_days: 1 });
    renderTable([sexta]);
    fireEvent.click(screen.getByRole("button", { name: "Editar prazo de Gesso" }));
    const input = screen.getByLabelText("Editar prazo de Gesso") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onUpdateDates).toHaveBeenCalledWith({ id: "a9", start_date: "2026-09-04", end_date: "2026-09-11", duration_days: 5 });
  });

  it("mudar o término de uma atividade com dependentes abre a cascata do Gantt", () => {
    renderTable([demolicao, eletrica]);
    fireEvent.click(screen.getByRole("button", { name: "Editar término de Demolição" }));
    fireEvent.change(screen.getByLabelText("Editar término de Demolição"), { target: { value: "2026-10-09" } });

    // A própria linha já foi salva…
    expect(onUpdateDates).toHaveBeenCalledTimes(1);
    // …e a dependente espera confirmação.
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Elétrica");
    const confirmar = within(dialog).getAllByRole("button").find((b) => b.textContent !== "Cancelar")!;
    fireEvent.click(confirmar);
    expect(onCascade).toHaveBeenCalledTimes(1);
    expect(onCascade.mock.calls[0][0][0]).toMatchObject({ id: "a2", start_date: "2026-10-10" });
  });

  it("filtro de marcos críticos mostra só o caminho crítico e as atrasadas", () => {
    renderTable([demolicao, eletrica, pintura, atrasada]);
    expect(screen.getAllByTestId(/reverse-row-/)).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: /Marcos críticos/ }));
    const rows = screen.getAllByTestId(/reverse-row-/).map((r) => r.getAttribute("data-testid"));
    expect(rows).toContain("reverse-row-a1"); // crítico
    expect(rows).toContain("reverse-row-a2"); // crítico (ramo mais longo)
    expect(rows).toContain("reverse-row-a4"); // atrasada
    expect(rows).not.toContain("reverse-row-a3"); // pintura tem folga

    fireEvent.click(screen.getByRole("button", { name: /Atrasadas/ }));
    expect(screen.getAllByTestId(/reverse-row-/)).toHaveLength(1);
    expect(screen.getByTestId("remaining-a4")).toHaveTextContent("−2");
  });

  it("ordem reversa por padrão (do fim para o começo) e inversível", () => {
    renderTable([demolicao, eletrica, pintura]);
    const ordem = () => screen.getAllByTestId(/reverse-row-/).map((r) => r.getAttribute("data-testid"));
    expect(ordem()).toEqual(["reverse-row-a2", "reverse-row-a3", "reverse-row-a1"]);
    fireEvent.click(screen.getByRole("button", { name: /Do fim para o começo/ }));
    expect(ordem()).toEqual(["reverse-row-a1", "reverse-row-a3", "reverse-row-a2"]);
  });

  it("alerta quando o término da obra passa da data de mudança", () => {
    renderTable([demolicao, eletrica], { moveInDate: "2026-10-06" });
    expect(screen.getByRole("alert")).toHaveTextContent("passa da data de mudança");
    expect(screen.getByTestId("days-to-move-in")).toHaveTextContent("5");
  });

  it("sem atividades orienta a gerar no Escopo (o Gantt deriva do reverso)", () => {
    renderTable([]);
    expect(screen.getByText(/Nenhuma atividade cadastrada/)).toBeInTheDocument();
    expect(screen.getByText(/aba Escopo/)).toBeInTheDocument();
  });

  it("mostra no máximo 5 atividades e o restante atrás de Ver mais", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      act({ id: `m${i}`, name: `Atividade ${i}`, start_date: "2026-10-01", end_date: "2026-10-03", duration_days: 3, position: i }),
    );
    renderTable(many);
    expect(screen.getAllByTestId(/^reverse-row-/)).toHaveLength(5);

    const verMais = screen.getByRole("button", { name: /Ver mais \(2 atividades\)/ });
    fireEvent.click(verMais);
    expect(screen.getAllByTestId(/^reverse-row-/)).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: /Ver menos/ }));
    expect(screen.getAllByTestId(/^reverse-row-/)).toHaveLength(5);
  });

  it("com 5 ou menos atividades não oferece Ver mais", () => {
    renderTable([demolicao, eletrica, pintura, atrasada]);
    expect(screen.queryByRole("button", { name: /Ver mais/ })).not.toBeInTheDocument();
  });

  it("checklist de entrega fica na linha da atividade: contagem, marcar e adicionar", () => {
    const onToggle = vi.fn();
    const onAdd = vi.fn();
    const items = [
      chk({ id: "c1", activity_id: "a1", description: "Rejunte na pedra da bancada" }),
      chk({ id: "c2", activity_id: "a1", description: "PU da soleira", resolved: true }),
      chk({ id: "c3", activity_id: null, description: "Limpeza final" }),
    ];
    renderTable([demolicao, eletrica], {
      checklistItems: items,
      onChecklistToggle: onToggle,
      onChecklistRemove: vi.fn(),
      onChecklistAdd: onAdd,
    });

    expect(screen.getByRole("columnheader", { name: "Entrega" })).toBeInTheDocument();
    const toggle = screen.getByTestId("checklist-toggle-a1");
    expect(toggle).toHaveTextContent("1/2");
    expect(screen.getByTestId("checklist-toggle-a2")).toHaveTextContent("—");

    // Fechado por padrão; abre na linha da atividade.
    expect(screen.queryByText("Rejunte na pedra da bancada")).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByTestId("checklist-row-a1")).toHaveTextContent("Rejunte na pedra da bancada");
    // Pendência geral não aparece na atividade.
    expect(screen.queryByText("Limpeza final")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: 'Marcar "Rejunte na pedra da bancada" como resolvida' }));
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }));

    fireEvent.click(screen.getByRole("button", { name: /Adicionar pendência/ }));
    expect(onAdd).toHaveBeenCalledWith("a1");
  });

  it("check na linha marca a atividade como entregue e reabre", () => {
    const onToggleDone = vi.fn();
    const concluida = act({ id: "a5", name: "Gesso", start_date: "2026-09-14", end_date: "2026-09-18", duration_days: 5, status: "concluida", position: 4 });
    renderTable([demolicao, concluida], { onToggleDone });

    const marcar = screen.getByRole("button", { name: "Marcar Demolição como entregue" });
    expect(marcar).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(marcar);
    expect(onToggleDone).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }), true);

    const reabrir = screen.getByRole("button", { name: "Reabrir Gesso" });
    expect(reabrir).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(reabrir);
    expect(onToggleDone).toHaveBeenCalledWith(expect.objectContaining({ id: "a5" }), false);
  });

  it("sem onToggleDone o check de entrega não aparece", () => {
    renderTable([demolicao]);
    expect(screen.queryByRole("button", { name: /como entregue/ })).not.toBeInTheDocument();
  });

  it("sem checklist informado a coluna Entrega não aparece", () => {
    renderTable([demolicao]);
    expect(screen.queryByRole("columnheader", { name: "Entrega" })).not.toBeInTheDocument();
  });
});
