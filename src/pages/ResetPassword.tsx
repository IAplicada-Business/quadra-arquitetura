import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AuthButton, AuthInput, AuthLabel, AuthShell, authLinkClass } from "@/components/auth/AuthShell";

const MIN_LENGTH = 6;

/** Erro que o Supabase devolve no hash quando o link expirou ou já foi usado. */
function linkErrorFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("error_description") || params.get("error") || null;
}

/**
 * Nova senha (/redefinir-senha). O link do e-mail de recuperação abre esta
 * tela já com a sessão de recuperação: o cliente do Supabase lê o token da
 * URL e loga o usuário. Aqui só trocamos a senha e seguimos para o sistema.
 */
export default function ResetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lido uma vez: o cliente do Supabase limpa o hash depois de processar.
  const linkError = useMemo(() => (typeof window === "undefined" ? null : linkErrorFromHash(window.location.hash)), []);

  // Sem sessão e sem erro no hash, o token ainda pode estar sendo processado.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast.success("Senha atualizada");
    navigate("/dashboard", { replace: true });
  };

  if (!session && (linkError || (!loading && waited))) {
    return (
      <AuthShell
        title="Link inválido ou expirado"
        subtitle="Este link de recuperação não vale mais. Peça um novo e use o mais recente que chegar no seu e-mail."
        footer={
          <Link to="/login" className={authLinkClass}>
            Voltar para o login
          </Link>
        }
      >
        <AuthButton type="button" onClick={() => navigate("/esqueci-senha")}>
          Pedir novo link
        </AuthButton>
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell title="Verificando o link..." subtitle="Só um instante.">
        <div className="flex justify-center" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-deep-foreground/30 border-t-deep-foreground" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crie uma nova senha"
      subtitle={session.user.email ? <>Para a conta <strong className="font-medium text-deep-foreground">{session.user.email}</strong>.</> : undefined}
      footer={
        <Link to="/login" className={authLinkClass}>
          Voltar para o login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campo de usuário oculto: o gerenciador de senhas associa a nova senha à conta certa. */}
        <input type="email" name="email" autoComplete="username" value={session.user.email ?? ""} readOnly hidden />
        <div>
          <AuthLabel htmlFor="new-password">Nova senha</AuthLabel>
          <AuthInput
            id="new-password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_LENGTH}
            autoFocus
          />
        </div>
        <div>
          <AuthLabel htmlFor="confirm-password">Confirmar senha</AuthLabel>
          <AuthInput
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={MIN_LENGTH}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-accent-brand">
            {error}
          </p>
        )}
        <AuthButton type="submit" disabled={saving} className="!mt-8">
          {saving ? "Salvando..." : "Salvar nova senha"}
        </AuthButton>
      </form>
    </AuthShell>
  );
}
