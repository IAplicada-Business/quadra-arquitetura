import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthButton, AuthInput, AuthLabel, AuthShell, authLinkClass } from "@/components/auth/AuthShell";

/** Caminho da tela que recebe o link do e-mail de recuperação. */
export const RESET_PASSWORD_PATH = "/redefinir-senha";

/**
 * Recuperar senha: envia o e-mail do Supabase com link para
 * /redefinir-senha. A mensagem de sucesso é a mesma exista ou não a conta,
 * pra não revelar quais e-mails estão cadastrados.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${RESET_PASSWORD_PATH}`,
    });
    setLoading(false);
    if (error) {
      setError(
        error.status === 429
          ? "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."
          : "Não foi possível enviar o e-mail agora. Tente de novo em instantes.",
      );
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      title={sent ? "Confira seu e-mail" : "Esqueceu a senha?"}
      subtitle={
        sent
          ? <>Se houver uma conta para <strong className="font-medium text-deep-foreground">{email.trim()}</strong>, enviamos um link para criar uma nova senha. O link vale por 1 hora.</>
          : "Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      }
      footer={
        <Link to="/login" className={authLinkClass}>
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <AuthButton type="button" onClick={() => setSent(false)}>
          Enviar para outro e-mail
        </AuthButton>
      ) : (
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
              autoFocus
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-accent-brand">
              {error}
            </p>
          )}
          <AuthButton type="submit" disabled={loading} className="!mt-8">
            {loading ? "Enviando..." : "Enviar link"}
          </AuthButton>
        </form>
      )}
    </AuthShell>
  );
}
