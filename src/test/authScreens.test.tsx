import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  auth: {
    session: null as null | { user: { email: string } },
    loading: false,
    signIn: vi.fn(),
  },
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/dashboard" element={<p>Painel</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.auth.session = null;
  mocks.auth.loading = false;
  for (const fn of [mocks.auth.signIn, mocks.resetPasswordForEmail, mocks.updateUser, mocks.toastError, mocks.toastSuccess]) fn.mockReset();
  window.location.hash = "";
});

describe("Login", () => {
  it("mantém id/type e ganha name/autocomplete para o gerenciador de senhas", () => {
    renderAt("/login");
    const email = screen.getByLabelText("E-mail");
    const password = screen.getByLabelText("Senha");
    expect(email).toHaveAttribute("id", "email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("name", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(password).toHaveAttribute("id", "password");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("name", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAttribute("minlength", "6");
  });

  it("entra com signIn(email, senha), igual a antes", async () => {
    mocks.auth.signIn.mockResolvedValue({ error: null });
    renderAt("/login");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "camilla@quadra.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "segredo123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(mocks.auth.signIn).toHaveBeenCalledWith("camilla@quadra.com", "segredo123"));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Bem-vindo(a)!");
  });

  it("senha errada mostra o mesmo toast de erro", async () => {
    mocks.auth.signIn.mockResolvedValue({ error: new Error("Invalid login credentials") });
    renderAt("/login");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada1" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Erro ao entrar", { description: "Invalid login credentials" }));
  });

  it("com sessão, segue para /dashboard", () => {
    mocks.auth.session = { user: { email: "a@b.com" } };
    renderAt("/login");
    expect(screen.getByText("Painel")).toBeInTheDocument();
  });

  it("tem blobs e o link 'Esqueci minha senha'", () => {
    renderAt("/login");
    expect(screen.getByTestId("auth-blobs")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Esqueci minha senha" }));
    expect(screen.getByRole("heading", { name: "Esqueceu a senha?" })).toBeInTheDocument();
  });

  it("dois logins montados não compartilham o id do filtro gooey", () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
        <Login />
      </MemoryRouter>,
    );
    const ids = Array.from(container.querySelectorAll("filter")).map((f) => f.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => !id.includes(":"))).toBe(true);
  });
});

describe("Esqueci minha senha", () => {
  it("envia o e-mail com redirectTo para /redefinir-senha e mostra confirmação neutra", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    renderAt("/esqueci-senha");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: " camilla@quadra.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    await waitFor(() =>
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("camilla@quadra.com", {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      }),
    );
    expect(await screen.findByRole("heading", { name: "Confira seu e-mail" })).toBeInTheDocument();
    expect(screen.getByText(/Se houver uma conta para/)).toBeInTheDocument();
  });

  it("limite de tentativas mostra aviso e não finge que enviou", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: { status: 429, message: "rate limit" } });
    renderAt("/esqueci-senha");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas");
    expect(screen.queryByRole("heading", { name: "Confira seu e-mail" })).not.toBeInTheDocument();
  });

  it("volta para o login", () => {
    renderAt("/esqueci-senha");
    fireEvent.click(screen.getByRole("link", { name: "Voltar para o login" }));
    expect(screen.getByRole("heading", { name: "Bem-vindo(a) de volta" })).toBeInTheDocument();
  });
});

describe("Nova senha (/redefinir-senha)", () => {
  it("com a sessão do link, troca a senha e segue para o sistema", async () => {
    mocks.auth.session = { user: { email: "camilla@quadra.com" } };
    mocks.updateUser.mockResolvedValue({ error: null });
    renderAt("/redefinir-senha");
    expect(screen.getByText("camilla@quadra.com")).toBeInTheDocument();
    const nova = screen.getByLabelText("Nova senha");
    expect(nova).toHaveAttribute("autocomplete", "new-password");
    fireEvent.change(nova, { target: { value: "novaSenha1" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "novaSenha1" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "novaSenha1" }));
    expect(await screen.findByText("Painel")).toBeInTheDocument();
  });

  it("senhas diferentes não chamam o Supabase", () => {
    mocks.auth.session = { user: { email: "a@b.com" } };
    renderAt("/redefinir-senha");
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "abcdef" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "abcdeg" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(screen.getByRole("alert")).toHaveTextContent("As senhas não conferem.");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("link expirado mostra aviso e oferece pedir outro", () => {
    window.location.hash = "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
    renderAt("/redefinir-senha");
    expect(screen.getByRole("heading", { name: "Link inválido ou expirado" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pedir novo link" }));
    expect(screen.getByRole("heading", { name: "Esqueceu a senha?" })).toBeInTheDocument();
  });
});

describe("404", () => {
  it("mostra a página não encontrada em português com caminho de volta", async () => {
    const { default: NotFound } = await import("@/pages/NotFound");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <MemoryRouter initialEntries={["/nao-existe"]}>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao sistema" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Ir para o site" })).toHaveAttribute("href", "/");
    expect(screen.queryByTestId("auth-blobs")).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
