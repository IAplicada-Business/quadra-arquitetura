import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

function setup() {
  const onConfirm = vi.fn();
  const onRowClick = vi.fn();
  render(
    <div onClick={onRowClick}>
      <ConfirmDeleteDialog title="Excluir este lançamento?" onConfirm={onConfirm}>
        <button>Apagar</button>
      </ConfirmDeleteDialog>
    </div>,
  );
  return { onConfirm, onRowClick };
}

describe("ConfirmDeleteDialog", () => {
  it("clicar na lixeira só abre a confirmação, sem apagar", () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByText("Apagar"));
    expect(screen.getByText("Excluir este lançamento?")).toBeInTheDocument();
    expect(screen.getByText("Esta ação não pode ser desfeita.")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancelar fecha sem apagar e sem disparar o clique da linha", () => {
    const { onConfirm, onRowClick } = setup();
    fireEvent.click(screen.getByText("Apagar"));
    onRowClick.mockClear();
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
    expect(screen.queryByText("Excluir este lançamento?")).not.toBeInTheDocument();
  });

  it("confirmar chama a exclusão uma vez", () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByText("Apagar"));
    fireEvent.click(screen.getByText("Excluir"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
