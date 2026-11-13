import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ClientPortal from "@/pages/ClientPortal";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch };
      return ch;
    },
    removeChannel: async () => {},
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const base = {
  project: { name: "Apto Sion", address: "Rua X", city: "BH", estimated_budget: 100000, ideal_budget: null, client_move_in_date: "2026-12-15", client_name: "Madalena" },
  tasks: [],
  payments: [],
  invoices: [],
  photos: [],
  weekly_reports: [],
  pending_responses: [],
  onboarding: null,
};

const openScenario = {
  id: "s1",
  name: "Cenário Recomendado",
  total_value: 3000,
  is_locked: false,
  approved_at: null,
  approved_by_name: null,
  approval_source: null,
  items: [
    { id: "i1", discipline: "Alvenaria", description: "Parede", estimated_value: 1000, is_included: true },
    { id: "i2", discipline: "Pintura", description: "Pintura geral", estimated_value: 2000, is_included: true },
  ],
};

/** fetch: get-client-portal-data devolve o payload; submit-scenario-action registra as chamadas. */
function mockFetch(payload: unknown | (() => unknown), actionResponse: { ok: boolean; body: unknown } = { ok: true, body: { success: true } }) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const f = vi.fn(async (url: string, init?: { body?: string }) => {
    if (String(url).includes("submit-scenario-action")) {
      calls.push({ url: String(url), body: JSON.parse(init?.body ?? "{}") });
      return { ok: actionResponse.ok, json: async () => actionResponse.body };
    }
    return { ok: true, json: async () => (typeof payload === "function" ? (payload as () => unknown)() : payload) };
  });
  vi.stubGlobal("fetch", f);
  return calls;
}

function renderOrcamento() {
  window.history.replaceState(null, "", "/client/tok123#orcamento");
  return render(
    <MemoryRouter initialEntries={["/client/tok123#orcamento"]}>
      <Routes>
        <Route path="/client/:token" element={<ClientPortal />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("trilha:onboarding-seen:tok123", "1");
  vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "key");
  window.scrollTo = vi.fn();
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("Trilha: cenários e aprovação pelo cliente", () => {
  it("sem cenários, a aba Orçamento não mostra a seção de aprovação", async () => {
    mockFetch(base);
    renderOrcamento();
    expect(await screen.findByTestId("screen-orcamento")).toBeInTheDocument();
    expect(screen.queryByTestId("scenario-approval")).not.toBeInTheDocument();
  });

  it("mostra o cenário com os itens marcados e o total", async () => {
    mockFetch({ ...base, scenarios: [openScenario] });
    renderOrcamento();
    expect(await screen.findByTestId("scenario-s1")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-total-s1")).toHaveTextContent("3.000");
    expect((screen.getByTestId("scenario-item-i1") as HTMLInputElement).checked).toBe(true);
  });

  it("desmarcar um item envia a ação ao servidor e atualiza o total na hora", async () => {
    // o servidor passa a devolver o item desmarcado depois da ação (como o banco real)
    const calls = mockFetch(() => {
      const off = calls.length > 0;
      return { ...base, scenarios: [{ ...openScenario, items: openScenario.items.map((i) => (i.id === "i2" && off ? { ...i, is_included: false } : i)) }] };
    });
    renderOrcamento();
    fireEvent.click(await screen.findByTestId("scenario-item-i2"));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toMatchObject({ token: "tok123", action: "toggle_item", scenario_id: "s1", item_id: "i2", is_included: false });
    await waitFor(() => expect(screen.getByTestId("scenario-total-s1")).toHaveTextContent("1.000"));
  });

  it("aprovar pede o nome, valida e envia nome + cenário", async () => {
    const calls = mockFetch({ ...base, scenarios: [openScenario] });
    renderOrcamento();
    fireEvent.click(await screen.findByTestId("scenario-approve-s1"));

    // nome vazio: não envia
    fireEvent.change(screen.getByLabelText(/Seu nome/), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("scenario-approve-confirm"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/nome/i);
    expect(calls).toHaveLength(0);

    fireEvent.change(screen.getByLabelText(/Seu nome/), { target: { value: "Madalena Souza" } });
    fireEvent.click(screen.getByTestId("scenario-approve-confirm"));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toMatchObject({ action: "approve", scenario_id: "s1", client_name: "Madalena Souza" });
  });

  it("cenário já aprovado fica travado e mostra quem aprovou e quando", async () => {
    mockFetch({
      ...base,
      scenarios: [{ ...openScenario, is_locked: true, approved_at: "2026-11-13T15:00:00Z", approved_by_name: "Madalena Souza", approval_source: "client" }],
    });
    renderOrcamento();
    expect(await screen.findByTestId("scenario-approved-s1")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-approved-by-s1")).toHaveTextContent("Madalena Souza");
    expect((screen.getByTestId("scenario-item-i1") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByTestId("scenario-approve-s1")).not.toBeInTheDocument();
  });

  it("erro do servidor (ex.: cenário já aprovado) não fecha o modal", async () => {
    const calls = mockFetch({ ...base, scenarios: [openScenario] }, { ok: false, body: { error: "Orçamento já aprovado: peça à equipe para reabrir" } });
    renderOrcamento();
    fireEvent.click(await screen.findByTestId("scenario-approve-s1"));
    fireEvent.change(screen.getByLabelText(/Seu nome/), { target: { value: "Madalena Souza" } });
    fireEvent.click(screen.getByTestId("scenario-approve-confirm"));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(screen.getByTestId("scenario-approve-confirm")).toBeInTheDocument();
  });
});
