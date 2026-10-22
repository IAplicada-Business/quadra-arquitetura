import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, LayoutDashboard, LogOut, ShieldOff } from "lucide-react";
import { AuthButton, AuthInput, AuthLabel, AuthShell, authLinkClass } from "@/components/auth/AuthShell";
import BlogPostsTab from "@/components/settings/blog/BlogPostsTab";
import SiteContentTab from "@/components/settings/site/SiteContentTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import logoBege from "@/assets/logo-bege.png";

/**
 * /admin: onde as sócias publicam no site, com e-mail e senha.
 *
 * É a porta enxuta para o que muda no site público (artigos do blog,
 * depoimentos e os textos das demais seções), sem o CRM inteiro por trás.
 * Usa o mesmo login do sistema (Supabase Auth): quem já tem conta entra
 * com a mesma senha, e "Esqueci minha senha" é o fluxo de sempre.
 *
 * A permissão segue a do sistema: administrador, ou quem tem acesso a
 * Configurações. Isto é a camada de tela. O que protege os dados de
 * verdade são as políticas RLS das tabelas site_content e blog_posts.
 */
export default function AdminPublicar() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deep" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-deep-foreground/30 border-t-deep-foreground" />
      </div>
    );
  }

  return session ? <Painel /> : <Entrada />;
}

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

function Entrada() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    const { error } = await signIn(email.trim(), senha);
    // Mensagem própria: a do Supabase vem em inglês e confirma ao
    // visitante se o e-mail existe ("Invalid login credentials" é o caso
    // comum, mas e-mail não confirmado tem texto diferente).
    if (error) setErro("E-mail ou senha incorretos. Confira e tente de novo.");
    setEnviando(false);
  };

  return (
    <AuthShell
      blobs
      showEyebrow={false}
      title="Publicar no site"
      subtitle="Entre com seu e-mail e senha para editar o blog, os depoimentos e os textos do site."
      footer={
        <div className="flex flex-col items-center gap-3">
          <Link to="/esqueci-senha" className={authLinkClass}>
            Esqueci minha senha
          </Link>
          <Link to="/" className={authLinkClass}>
            Voltar ao site
          </Link>
        </div>
      }
    >
      <form onSubmit={entrar} className="space-y-5" noValidate>
        <div>
          <AuthLabel htmlFor="admin-email">E-mail</AuthLabel>
          <AuthInput
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!erro}
            required
          />
        </div>
        <div>
          <AuthLabel htmlFor="admin-senha">Senha</AuthLabel>
          <AuthInput
            id="admin-senha"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={!!erro}
            required
          />
        </div>

        {erro && (
          <p role="alert" className="text-sm text-red-300">
            {erro}
          </p>
        )}

        <AuthButton type="submit" disabled={enviando || !email.trim() || !senha} className="!mt-8">
          {enviando ? "Entrando..." : "Entrar"}
        </AuthButton>
      </form>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ */
/* Painel                                                              */
/* ------------------------------------------------------------------ */

function Painel() {
  const { user, signOut } = useAuth();
  const { isLoading, isAdmin, canView } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deep" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-deep-foreground/30 border-t-deep-foreground" />
      </div>
    );
  }

  const podePublicar = isAdmin || canView("admin_settings");

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-deep text-deep-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <img src={logoBege} alt="Quadra Arquitetura" className="h-10 w-auto" />
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.3em] text-deep-foreground/60 sm:block">
              Publicação do site
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-2 hidden max-w-[16rem] truncate text-xs text-deep-foreground/60 md:block">{user?.email}</span>
            <Button asChild variant="ghost" size="sm" className="text-deep-foreground hover:bg-white/10 hover:text-deep-foreground">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" /> Ver site
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-deep-foreground hover:bg-white/10 hover:text-deep-foreground">
              <Link to="/dashboard">
                <LayoutDashboard className="mr-1 h-4 w-4" /> Abrir o sistema
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-deep-foreground hover:bg-white/10 hover:text-deep-foreground"
            >
              <LogOut className="mr-1 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {podePublicar ? (
          <Tabs defaultValue="blog" className="space-y-6">
            <TabsList>
              <TabsTrigger value="blog">Blog</TabsTrigger>
              <TabsTrigger value="depoimentos">Depoimentos</TabsTrigger>
              <TabsTrigger value="site">Site</TabsTrigger>
            </TabsList>

            <TabsContent value="blog">
              <BlogPostsTab />
            </TabsContent>
            <TabsContent value="depoimentos">
              <SiteContentTab sections={["testimonials"]} />
            </TabsContent>
            <TabsContent value="site">
              <SiteContentTab />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <ShieldOff className="h-10 w-10 text-muted-foreground/40" />
            <h1 className="text-lg font-semibold">Sem permissão para publicar</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              Sua conta ({user?.email}) entra no sistema, mas não tem acesso a Configurações. Peça a uma administradora para liberar.
            </p>
            <Button variant="outline" onClick={() => signOut()}>
              Entrar com outra conta
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
