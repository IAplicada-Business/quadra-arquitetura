import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AuthButton, AuthInput, AuthLabel, AuthShell, authLinkClass } from "@/components/auth/AuthShell";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error("Erro ao entrar", { description: error.message });
    } else {
      toast.success("Bem-vindo(a)!");
    }
    setLoading(false);
  };

  return (
    <AuthShell
      blobs
      showEyebrow={false}
      title="Bem-vindo(a) de volta"
      footer={
        <Link to="/esqueci-senha" className={authLinkClass}>
          Esqueci minha senha
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <AuthLabel htmlFor="email">E-mail</AuthLabel>
          <AuthInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <AuthLabel htmlFor="password">Senha</AuthLabel>
          <AuthInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <AuthButton type="submit" disabled={loading} className="!mt-8">
          {loading ? "Carregando..." : "Entrar"}
        </AuthButton>
      </form>
    </AuthShell>
  );
}
