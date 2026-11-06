import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { BlogPostRow } from "@/lib/blog";

const m = vi.hoisted(() => ({
  posts: [] as BlogPostRow[],
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/hooks/useBlog", () => ({
  useBlogPostsAdmin: () => ({
    posts: m.posts,
    isLoading: false,
    save: { mutate: m.save, isPending: false },
    remove: { mutate: m.remove, isPending: false },
  }),
}));
vi.mock("@/components/blog/BlogArticleBody", () => ({ BlogArticleBody: ({ content }: { content: string }) => <div data-testid="previa-corpo">{content}</div> }));
vi.mock("@/components/settings/site/SiteFields", () => ({ SiteImageField: () => <div>campo-capa</div> }));

import BlogPostsTab from "@/components/settings/blog/BlogPostsTab";

const post = (over: Partial<BlogPostRow>): BlogPostRow => ({
  id: "1", slug: "orcamento", title: "Orçamento mente", excerpt: "", content: "## Oi", cover_url: "", category: "Orçamento",
  author: "Camilla", status: "draft", published_at: null, updated_at: "2026-11-01T10:00:00Z", ...over,
});

describe("Configurações → Blog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.posts = [post({}), post({ id: "2", slug: "no-ar", title: "Já no ar", status: "published" })];
  });

  it("lista em cartões de largura total, com status e ações", () => {
    render(<BlogPostsTab />);
    const lista = screen.getByTestId("blog-lista");
    expect(lista.className).toContain("md:grid-cols-2");
    expect(within(lista).getByText("Orçamento mente")).toBeInTheDocument();
    expect(within(lista).getByText("Rascunho")).toBeInTheDocument();
    expect(within(lista).getByText("No ar")).toBeInTheDocument();
    expect(within(lista).getByLabelText("Ver Já no ar no site")).toBeInTheDocument();
    expect(within(lista).queryByLabelText("Ver Orçamento mente no site")).toBeNull();
  });

  it("sem artigos mostra o estado vazio", () => {
    m.posts = [];
    render(<BlogPostsTab />);
    expect(screen.getByText(/Nenhum artigo ainda/)).toBeInTheDocument();
  });

  it("abre o editor em duas colunas, com a publicação na lateral", () => {
    render(<BlogPostsTab />);
    fireEvent.click(screen.getByLabelText("Editar Orçamento mente"));
    const ed = screen.getByTestId("blog-editor");
    expect(ed.innerHTML).toContain("xl:grid-cols-[minmax(0,1fr)_360px]");
    const lateral = screen.getByTestId("blog-editor-lateral");
    expect(within(lateral).getByLabelText("Endereço (slug)")).toBeInTheDocument();
    expect(within(lateral).getByRole("button", { name: "Publicar" })).toBeInTheDocument();
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Orçamento mente");
  });

  it("novo artigo: o slug acompanha o título; salvar rascunho e publicar gravam o status certo", () => {
    render(<BlogPostsTab />);
    fireEvent.click(screen.getByRole("button", { name: /novo artigo/i }));
    expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Meu Primeiro Artigo" } });
    expect((screen.getByLabelText("Endereço (slug)") as HTMLInputElement).value).toBe("meu-primeiro-artigo");

    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect(m.save.mock.calls[0][0]).toMatchObject({ title: "Meu Primeiro Artigo", slug: "meu-primeiro-artigo", status: "draft" });

    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));
    expect(m.save.mock.calls[1][0]).toMatchObject({ status: "published" });
  });

  it("a prévia mostra o texto escrito", () => {
    render(<BlogPostsTab />);
    fireEvent.click(screen.getByLabelText("Editar Orçamento mente"));
    fireEvent.click(screen.getByRole("button", { name: "Prévia" }));
    expect(screen.getByTestId("previa-corpo")).toHaveTextContent("## Oi");
  });

  it("excluir pede confirmação", () => {
    render(<BlogPostsTab />);
    fireEvent.click(screen.getByLabelText("Excluir Orçamento mente"));
    expect(m.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(m.remove).toHaveBeenCalledWith("1");
  });
});
