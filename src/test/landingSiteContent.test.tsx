import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock("@/hooks/useSiteLead", () => ({
  useSiteLead: () => ({ mutate: vi.fn(), isPending: false }),
}));

import Landing from "@/pages/Landing";

beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
});

function respondWith(result: { data: unknown; error: unknown }) {
  mocks.rpc.mockReturnValue({ abortSignal: () => Promise.resolve(result) });
}

function renderLanding() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => mocks.rpc.mockReset());

describe("site público lendo site_content", () => {
  it("mostra o que foi publicado no admin", async () => {
    respondWith({
      data: [
        { key: "about.body", type: "richtext", value_json: "Texto publicado pela Camilla." },
        { key: "hero.image", type: "image", value_json: "https://cdn.test/site-media/hero/nova.jpg" },
      ],
      error: null,
    });
    renderLanding();

    expect(await screen.findByText("Texto publicado pela Camilla.")).toBeInTheDocument();
    expect(screen.queryByText(/A Quadra nasceu de uma dúvida/)).not.toBeInTheDocument();
    const srcs = screen.getAllByAltText(/Quadra Arquitetura/).map((img) => img.getAttribute("src"));
    expect(srcs).toContain("https://cdn.test/site-media/hero/nova.jpg");
    expect(mocks.rpc).toHaveBeenCalledWith("get_public_site_content", { p_team_id: "00000000-0000-0000-0000-000000000001" });
  });

  it("sem conteúdo salvo, mostra o site de sempre", async () => {
    respondWith({ data: [], error: null });
    renderLanding();
    expect(await screen.findByText(/A Quadra nasceu de uma dúvida/)).toBeInTheDocument();
    // "do número ao tijolo" é refrão: aparece no hero e no fecho do
    // "Por que a Quadra". Aqui interessa o título da primeira dobra.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/do número ao tijolo/);
  });

  it("se o banco falhar, o site continua no ar com o conteúdo padrão", async () => {
    respondWith({ data: null, error: { message: "offline" } });
    renderLanding();
    expect(await screen.findByText(/A Quadra nasceu de uma dúvida/)).toBeInTheDocument();
  });
});
