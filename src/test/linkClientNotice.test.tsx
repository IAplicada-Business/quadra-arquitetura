import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  clients: [] as { id: string; name: string }[],
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "clients") {
        return { select: () => ({ order: () => Promise.resolve({ data: mocks.clients, error: null }) }) };
      }
      return {
        update: (values: unknown) => {
          mocks.update(table, values);
          return { eq: (col: string, val: string) => { mocks.eq(col, val); return Promise.resolve({ error: null }); } };
        },
      };
    },
  },
}));

import { LinkClientNotice } from "@/components/projects/LinkClientNotice";
import { suggestClient } from "@/lib/clientSuggestion";

beforeEach(() => {
  mocks.clients = [
    { id: "c1", name: " Salão Cherie" },
    { id: "c2", name: "Ana Paula" },
    { id: "c3", name: "Salão" },
  ];
  mocks.update.mockReset();
  mocks.eq.mockReset();
});

describe("sugestão de cliente pelo nome da obra", () => {
  it("acha o cliente cujo nome está no nome da obra (sem acento/espaço), preferindo o mais específico", () => {
    expect(suggestClient("Projeto  Salão Cherie", mocks.clients)?.id).toBe("c1");
    expect(suggestClient("PROJETO SALAO CHERIE", mocks.clients)?.id).toBe("c1");
  });
  it("sem correspondência, não sugere", () => {
    expect(suggestClient("Casa Pampulha", mocks.clients)).toBeNull();
    expect(suggestClient("", mocks.clients)).toBeNull();
  });
});

describe("aviso de obra sem cliente", () => {
  it("já vem com o cliente sugerido e vincula na obra", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LinkClientNotice projectId="p9" projectName="Projeto  Salão Cherie" />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText(/não tem cliente vinculado/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Cliente da obra" })).toHaveTextContent("Salão Cherie"));
    fireEvent.click(screen.getByRole("button", { name: /Vincular cliente/ }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith("projects", { client_id: "c1" }));
    expect(mocks.eq).toHaveBeenCalledWith("id", "p9");
  });
});
