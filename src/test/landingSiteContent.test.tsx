import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("a dobra de depoimentos (feedbacks) está no ar, mesmo só com o texto-modelo", async () => {
    respondWith({ data: [], error: null });
    renderLanding();
    await screen.findByText(/A Quadra nasceu de uma dúvida/);
    expect(screen.getAllByText(/Espaço reservado para depoimento/).length).toBeGreaterThan(0);
    expect(document.getElementById("depoimentos")).not.toBeNull();
  });

  it("depoimento publicado substitui o texto-modelo", async () => {
    respondWith({
      data: [
        {
          key: "testimonials.items",
          type: "list",
          value_json: [{ title: "Ana Souza", tag: "Residencial · BH", desc: "A obra terminou no prazo e dentro do orçamento." }],
        },
      ],
      error: null,
    });
    renderLanding();
    expect(await screen.findByText("A obra terminou no prazo e dentro do orçamento.")).toBeInTheDocument();
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.queryByText(/Espaço reservado para depoimento/)).not.toBeInTheDocument();
  });

  it('botão secundário "Portfólio" leva aos projetos, não à jornada', async () => {
    respondWith({ data: [{ key: "hero.ctaSecondary", type: "text", value_json: "Portfólio" }], error: null });
    const projetos = document.createElement("div");
    projetos.id = "projetos";
    const rolar = vi.fn();
    projetos.scrollIntoView = rolar;
    document.body.appendChild(projetos);
    renderLanding();
    fireEvent.click(await screen.findByRole("button", { name: "Portfólio" }));
    expect(rolar).toHaveBeenCalled();
    projetos.remove();
  });
});
