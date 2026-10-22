import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { usePublicSiteContent } from "@/hooks/useSiteContent";

/**
 * Moldura das páginas do blog: mesmo menu e rodapé da landing, fundo creme.
 * O rodapé usa o conteúdo publicado do site, então logo e endereço batem
 * com os da home.
 */
export function BlogShell({ children }: { children: ReactNode }) {
  const { content } = usePublicSiteContent();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-brand-creme flex flex-col">
      <LandingNavbar />
      {/* A barra é fixa (~72px): o respiro evita que o cabeçalho nasça embaixo dela. */}
      <main className="flex-1 pt-24 md:pt-28">{children}</main>
      <LandingFooter content={content.footer} irPara={(href) => navigate(`/${href}`)} />
    </div>
  );
}
