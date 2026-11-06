import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const m = vi.hoisted(() => ({
  state: { activeToken: { id: "t1", token: "tok123" } as { id: string; token: string } | null, isError: false, isLoading: false },
  createToken: vi.fn(),
  rotateToken: vi.fn(),
  deactivateToken: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useClientPortalToken", () => ({
  useClientPortalToken: () => ({
    ...m.state,
    refetch: m.refetch,
    createToken: m.createToken,
    rotateToken: m.rotateToken,
    deactivateToken: m.deactivateToken,
    isCreating: false,
    isRotating: false,
    isDeactivating: false,
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import { PortalLinkDialog } from "@/components/projects/PortalLinkDialog";

const renderDialog = () => render(<PortalLinkDialog projectId="p1" open onOpenChange={() => {}} />);

describe("PortalLinkDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.state = { activeToken: { id: "t1", token: "tok123" }, isError: false, isLoading: false };
  });

  it("mostra a URL inteira e abre com href absoluto e rel seguro", () => {
    renderDialog();
    const expected = `${window.location.origin}/client/tok123`;
    expect((screen.getByLabelText("Link do portal do cliente") as HTMLInputElement).value).toBe(expected);
    const link = screen.getByRole("link", { name: /abrir portal/i });
    expect(link).toHaveAttribute("href", expected);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("copia com clipboard e usa fallback quando não existe", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /copiar link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/client/tok123`));

    Object.assign(navigator, { clipboard: undefined });
    const exec = vi.fn().mockReturnValue(true);
    (document as unknown as { execCommand: unknown }).execCommand = exec;
    fireEvent.click(screen.getByRole("button", { name: /copiar|copiado/i }));
    await waitFor(() => expect(exec).toHaveBeenCalledWith("copy"));
  });

  it("regenerar e desativar pedem confirmação antes de agir", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /regenerar link/i }));
    expect(m.rotateToken).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Regenerar" }));
    expect(m.rotateToken).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /desativar link/i }));
    expect(m.deactivateToken).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Desativar" }));
    expect(m.deactivateToken).toHaveBeenCalledWith("t1");
  });

  it("sem link mostra só o botão de gerar", () => {
    m.state = { activeToken: null, isError: false, isLoading: false };
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /gerar link/i }));
    expect(m.createToken).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /copiar link/i })).toBeNull();
  });

  it("erro de consulta não finge que não há link", () => {
    m.state = { activeToken: null, isError: true, isLoading: false };
    renderDialog();
    expect(screen.getByText(/não foi possível carregar o link/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /gerar link/i })).toBeNull();
  });
});
