import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";

vi.mock("@/hooks/useDeliveryChecklist", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useDeliveryChecklist")>("@/hooks/useDeliveryChecklist");
  return {
    ...actual,
    useChecklistPhotoUrls: (paths: string[]) => ({
      urls: Object.fromEntries(paths.map((p) => [p, `https://signed/${p}`])),
      isLoading: false,
    }),
  };
});

import { checklistPhotoPath } from "@/hooks/useDeliveryChecklist";
import { ActivityDeliveryChecklist } from "@/components/projects/ActivityDeliveryChecklist";

function chk(partial: Partial<DeliveryChecklistItem> & { id: string; description: string }): DeliveryChecklistItem {
  return {
    project_id: "obra1", user_id: "u1", activity_id: "a1", discipline: null, responsible: null, due_date: null,
    priority: "media", resolved: false, resolved_at: null, photo_paths: [],
    created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", ...partial,
  };
}

const onAddPhotos = vi.fn();
const onRemovePhoto = vi.fn();

beforeEach(() => {
  onAddPhotos.mockReset();
  onRemovePhoto.mockReset();
});

function renderList(items: DeliveryChecklistItem[], uploadingItemId: string | null = null) {
  return render(
    <ActivityDeliveryChecklist
      items={items}
      onToggle={vi.fn()}
      onRemove={vi.fn()}
      onAdd={vi.fn()}
      photos={{ onAddPhotos, onRemovePhoto, uploadingItemId }}
    />,
  );
}

describe("foto nos itens do checklist de entrega", () => {
  it("caminho no bucket começa pela obra (base da restrição por equipe)", () => {
    expect(checklistPhotoPath("obra1", "item9", "image/jpeg", 2, 1700000000000)).toBe("obra1/item9/1700000000000-2.jpg");
    expect(checklistPhotoPath("obra1", "item9", "image/png", 0, 1)).toBe("obra1/item9/1-0.png");
    expect(checklistPhotoPath("obra1", "item9", "application/octet-stream", 0, 1)).toBe("obra1/item9/1-0.jpg");
  });

  it("mostra miniaturas e amplia ao clicar, com navegação e remoção", () => {
    const item = chk({ id: "c1", description: "Rejunte na pedra", photo_paths: ["obra1/c1/1-0.jpg", "obra1/c1/1-1.jpg"] });
    renderList([item]);

    const thumb = screen.getByAltText("Foto 1 de Rejunte na pedra") as HTMLImageElement;
    expect(thumb.src).toBe("https://signed/obra1/c1/1-0.jpg");
    expect(screen.getByAltText("Foto 2 de Rejunte na pedra")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: 'Ampliar foto 1 de "Rejunte na pedra"' }));
    const big = screen.getByAltText("Foto ampliada de Rejunte na pedra") as HTMLImageElement;
    expect(big.src).toBe("https://signed/obra1/c1/1-0.jpg");
    expect(screen.getByText("Foto 1 de 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próxima foto" }));
    expect((screen.getByAltText("Foto ampliada de Rejunte na pedra") as HTMLImageElement).src).toBe("https://signed/obra1/c1/1-1.jpg");

    fireEvent.click(screen.getByRole("button", { name: /Remover foto/ }));
    expect(onRemovePhoto).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }), "obra1/c1/1-1.jpg");
  });

  it("botão de foto aceita imagens da câmera/galeria e ignora outros arquivos", () => {
    const item = chk({ id: "c2", description: "PU da soleira" });
    renderList([item]);
    expect(screen.getByRole("button", { name: /Foto/ })).toBeInTheDocument();

    const input = screen.getByLabelText('Enviar foto de "PU da soleira"') as HTMLInputElement;
    expect(input.accept).toBe("image/*");
    const foto = new File(["x"], "IMG_0001.jpg", { type: "image/jpeg" });
    const pdf = new File(["x"], "nota.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [foto, pdf] } });
    expect(onAddPhotos).toHaveBeenCalledWith(expect.objectContaining({ id: "c2" }), [foto]);
  });

  it("mostra o carregando no item que está recebendo upload", () => {
    renderList([chk({ id: "c3", description: "Silicone" })], "c3");
    expect(screen.getByRole("button", { name: /Enviando/ })).toBeDisabled();
  });
});
