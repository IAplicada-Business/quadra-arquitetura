import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

vi.mock("@/hooks/useSiteLead", () => ({
  useSiteLead: () => ({ mutate: vi.fn(), isPending: false }),
}));

import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import { BlogSection } from "@/components/landing/BlogSection";
import { SITE_DEFAULTS } from "@/lib/siteContent";

const LISTA = [
  { slug: "orcamento", title: "O orçamento mente", excerpt: "Resumo A", cover_url: "", category: "Orçamento", author: "", published_at: "2026-10-12T15:00:00Z", reading_chars: 2300 },
  { slug: "decisoes", title: "Cinco decisões", excerpt: "Resumo B", cover_url: "", category: "Antes de começar", author: "", published_at: "2026-10-05T15:00:00Z", reading_chars: 900 },
];

const ARTIGO = {
  slug: "orcamento",
  title: "O orçamento mente",
  excerpt: "Resumo A",
  content: "## Primeiro subtítulo\n\nTexto com **destaque** e [um link](https://exemplo.test).\n\n<script>alert(1)</script>",
  cover_url: "",
  category: "Orçamento",
  author: "Camilla",
  published_at: "2026-10-12T15:00:00Z",
};

/** O mock responde por função: o site também lê site_content na mesma tela. */
function responder({ lista = LISTA, artigo = [ARTIGO] as unknown[] } = {}) {
  mocks.rpc.mockImplementation((fn: string) => ({
    abortSignal: () =>
      Promise.resolve({
        data: fn === "get_public_blog_posts" ? lista : fn === "get_public_blog_post" ? artigo : [],
        error: null,
      }),
  }));
}

function renderEm(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="*" element={<p>outra rota</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

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

beforeEach(() => mocks.rpc.mockReset());

describe("/blog", () => {
  it("lista os artigos publicados com link para cada um", async () => {
    responder();
    renderEm("/blog");
    const link = await screen.findByRole("link", { name: /O orçamento mente/ });
    expect(link).toHaveAttribute("href", "/blog/orcamento");
    expect(screen.getByRole("link", { name: /Cinco decisões/ })).toHaveAttribute("href", "/blog/decisoes");
  });

  it("filtra por editoria", async () => {
    responder();
    renderEm("/blog");
    await screen.findByText("O orçamento mente");
    fireEvent.click(screen.getByRole("button", { name: "Antes de começar" }));
    expect(screen.queryByText("O orçamento mente")).not.toBeInTheDocument();
    expect(screen.getByText("Cinco decisões")).toBeInTheDocument();
  });

  it("sem artigos mostra o estado vazio em vez de página em branco", async () => {
    responder({ lista: [] });
    renderEm("/blog");
    expect(await screen.findByText(/primeiros artigos estão a caminho/)).toBeInTheDocument();
  });
});

describe("/blog/:slug", () => {
  it("renderiza o Markdown e não executa HTML bruto", async () => {
    responder();
    const { container } = renderEm("/blog/orcamento");
    expect(await screen.findByRole("heading", { level: 1, name: "O orçamento mente" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Primeiro subtítulo" })).toBeInTheDocument();
    const externo = screen.getByRole("link", { name: "um link" });
    expect(externo).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(container.querySelector("script")).toBeNull();
  });

  it("artigo que não está no ar cai em 404 e pede noindex", async () => {
    responder({ artigo: [] });
    renderEm("/blog/nao-existe");
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"][content="noindex"]')).not.toBeNull());
    expect(screen.queryByRole("heading", { level: 1, name: "O orçamento mente" })).not.toBeInTheDocument();
  });
});

describe("dobra de blog da landing", () => {
  const resumo = (slug: string, title: string) => ({
    slug,
    title,
    excerpt: "",
    coverUrl: "",
    category: "",
    author: "",
    publishedAt: null,
    readingChars: 0,
  });

  it("com artigos publicados, mostra os três mais novos e linka para o índice", () => {
    const posts = ["a", "b", "c", "d"].map((s) => resumo(s, `Artigo ${s}`));
    render(
      <MemoryRouter>
        <BlogSection content={SITE_DEFAULTS.blog} posts={posts} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Artigo a")).toBeInTheDocument();
    expect(screen.getByText("Artigo c")).toBeInTheDocument();
    expect(screen.queryByText("Artigo d")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver todos os artigos/ })).toHaveAttribute("href", "/blog");
  });

  it("sem artigos, mantém as chamadas de site_content", () => {
    render(
      <MemoryRouter>
        <BlogSection content={SITE_DEFAULTS.blog} posts={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/O orçamento da sua obra pode estar mentindo/)).toBeInTheDocument();
  });
});
