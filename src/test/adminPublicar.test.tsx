import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  auth: {
    session: null as unknown,
    user: null as unknown,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
  perms: { isLoading: false, isAdmin: false, canView: (_k: string) => false } as {
    isLoading: boolean;
    isAdmin: boolean;
    canView: (k: string) => boolean;
  },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => mocks.perms }));
// As abas reais falam com o Supabase; aqui interessa só o que a página decide mostrar.
vi.mock("@/components/settings/blog/BlogPostsTab", () => ({ default: () => <div>aba-blog</div> }));
vi.mock("@/components/settings/site/SiteContentTab", () => ({
  default: ({ sections }: { sections?: string[] }) => <div>{sections ? `aba-secoes:${sections.join(",")}` : "aba-site-completa"}</div>,
}));

import AdminPublicar from "@/pages/AdminPublicar";

const sessao = { user: { email: "camilla@quadra.test" } };

function abrir() {
  return render(
    <MemoryRouter>
      <AdminPublicar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.auth.session = null;
  mocks.auth.user = null;
  mocks.auth.loading = false;
  mocks.auth.signIn.mockReset();
  mocks.auth.signOut.mockReset();
  mocks.perms = { isLoading: false, isAdmin: false, canView: () => false };
});

describe("/admin sem sessão", () => {
  it("mostra o login e não vaza nenhuma aba de edição", () => {
    abrir();
    expect(screen.getByRole("heading", { name: /Publicar no site/ })).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "password");
    expect(screen.queryByText("aba-blog")).not.toBeInTheDocument();
  });

  it("só habilita Entrar com e-mail e senha preenchidos", () => {
    abrir();
    const entrar = screen.getByRole("button", { name: "Entrar" });
    expect(entrar).toBeDisabled();
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "camilla@quadra.test" } });
    expect(entrar).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "segredo123" } });
    expect(entrar).toBeEnabled();
  });

  it("senha errada mostra mensagem em português, sem o texto cru do Supabase", async () => {
    mocks.auth.signIn.mockResolvedValue({ error: new Error("Invalid login credentials") });
    abrir();
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: " camilla@quadra.test " } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(/E-mail ou senha incorretos/);
    expect(alerta).not.toHaveTextContent(/Invalid/);
    // O e-mail vai sem os espaços das pontas.
    expect(mocks.auth.signIn).toHaveBeenCalledWith("camilla@quadra.test", "errada");
  });
});

describe("/admin com sessão", () => {
  beforeEach(() => {
    mocks.auth.session = sessao;
    mocks.auth.user = sessao.user;
  });

  it("administradora vê Blog, Depoimentos e Site", async () => {
    mocks.perms = { isLoading: false, isAdmin: true, canView: () => true };
    abrir();
    expect(screen.getByText("aba-blog")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Depoimentos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Site" })).toBeInTheDocument();
    expect(screen.getByText("camilla@quadra.test")).toBeInTheDocument();

    // Radix abre a aba no mouseDown.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Depoimentos" }), { button: 0 });
    await waitFor(() => expect(screen.getByText("aba-secoes:testimonials")).toBeInTheDocument());
  });

  it("quem tem acesso a Configurações também publica, mesmo sem ser admin", () => {
    mocks.perms = { isLoading: false, isAdmin: false, canView: (k) => k === "admin_settings" };
    abrir();
    expect(screen.getByText("aba-blog")).toBeInTheDocument();
  });

  it("conta sem permissão é barrada e pode sair", () => {
    abrir();
    expect(screen.getByRole("heading", { name: /Sem permissão para publicar/ })).toBeInTheDocument();
    expect(screen.queryByText("aba-blog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Entrar com outra conta/ }));
    expect(mocks.auth.signOut).toHaveBeenCalled();
  });

  it("enquanto as permissões carregam não decide (sem piscar 'sem permissão')", () => {
    mocks.perms = { isLoading: true, isAdmin: false, canView: () => false };
    abrir();
    expect(screen.queryByRole("heading", { name: /Sem permissão/ })).not.toBeInTheDocument();
    expect(screen.queryByText("aba-blog")).not.toBeInTheDocument();
  });

  it("sair chama signOut", () => {
    mocks.perms = { isLoading: false, isAdmin: true, canView: () => true };
    abrir();
    fireEvent.click(screen.getByRole("button", { name: /Sair/ }));
    expect(mocks.auth.signOut).toHaveBeenCalled();
  });
});
