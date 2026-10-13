import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthShell, authLinkClass } from "@/components/auth/AuthShell";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <AuthShell
      title="Página não encontrada"
      subtitle="O endereço que você abriu não existe ou mudou de lugar."
      footer={
        <Link to="/" className={authLinkClass}>
          Ir para o site
        </Link>
      }
    >
      <p className="mb-8 text-center font-display text-7xl font-light text-deep-foreground/30" aria-hidden="true">
        404
      </p>
      <Link
        to="/dashboard"
        className="flex h-12 w-full items-center justify-center rounded-full bg-deep-foreground px-6 text-xs font-medium uppercase tracking-[0.25em] text-deep transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:ring-offset-2 focus-visible:ring-offset-deep"
      >
        Voltar ao sistema
      </Link>
    </AuthShell>
  );
};

export default NotFound;
