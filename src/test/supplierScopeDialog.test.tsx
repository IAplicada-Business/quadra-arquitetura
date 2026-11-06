import { vi, describe, it, expect, beforeEach } from "vitest";
// O mock do jspdf vem antes de qualquer import do diálogo (o PDF não é o foco aqui).
vi.mock("jspdf", () => ({
  default: class {
    internal = { pageSize: { getWidth: () => 210 } };
    setFontSize() {} setFont() {} text() {} addPage() {} save() {} setTextColor() {} setDrawColor() {} line() {} splitTextToSize() { return []; }
  },
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const m = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/hooks/useSupplierScopes", () => ({
  useSupplierScopes: () => ({ scopes: [], isLoading: false, saveSelection: { mutate: m.mutate, isPending: false } }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      const res = table === "suppliers"
        ? { data: [{ id: "s1", name: "Construtora Alfa", phone: "31999990000" }], error: null }
        : { data: { name: "Obra X", address: "", city: "" }, error: null };
      for (const k of ["select", "eq", "order"]) chain[k] = () => chain;
      chain.single = () => Promise.resolve(res);
      chain.then = (ok: (v: unknown) => unknown) => Promise.resolve(res).then(ok);
      return chain;
    },
  },
}));
// Radix Select não abre no jsdom: troca por um <select> nativo.
vi.mock("@/components/ui/select", () => ({
  Select: ({ onValueChange, children }: { onValueChange: (v: string) => void; children: React.ReactNode }) => (
    <select aria-label="fornecedor" onChange={(e) => onValueChange(e.target.value)} defaultValue="">
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
}));

import { SupplierScopeDialog } from "@/components/projects/SupplierScopeDialog";

const act = (id: string, name: string, discipline: string) =>
  ({ id, project_id: "p1", user_id: "u", name, description: null, area_m2: 10, duration_days: 2, start_date: null, end_date: null,
     medicao_date: null, status: "pendente", progress_percent: 0, depends_on: [], discipline, position: 0, created_at: "" }) as never;

const activities = [act("a1", "Alvenaria externa", "Civil"), act("a2", "Alvenaria interna", "Civil"), act("a3", "Ponto hidráulico", "Hidráulica")];

const renderDialog = (onOpenChange = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SupplierScopeDialog open onOpenChange={onOpenChange} projectId="p1" activities={activities} />
    </QueryClientProvider>,
  );

describe("SupplierScopeDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marcar disciplina, desmarcar uma atividade e Salvar manda só as marcadas", async () => {
    renderDialog();
    const select = await screen.findByLabelText("fornecedor");
    await screen.findByText("Construtora Alfa");
    fireEvent.change(select, { target: { value: "s1" } });

    fireEvent.click(screen.getByLabelText("Selecionar Civil"));
    await screen.findByLabelText("Selecionar Alvenaria externa");
    fireEvent.click(screen.getByLabelText("Selecionar Alvenaria interna")); // desmarca

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
    await waitFor(() => expect(m.mutate).toHaveBeenCalledTimes(1));
    const payload = m.mutate.mock.calls[0][0];
    expect(payload.supplierId).toBe("s1");
    expect(payload.groups).toHaveLength(1);
    expect(payload.groups[0].discipline).toBe("Civil");
    expect(payload.groups[0].activities.map((a: { id: string }) => a.id)).toEqual(["a1"]);
  });

  it("sem fornecedor e sem atividade o Salvar fica desabilitado", async () => {
    renderDialog();
    await screen.findByLabelText("fornecedor");
    expect(screen.getByRole("button", { name: /salvar/i })).toBeDisabled();
  });
});
