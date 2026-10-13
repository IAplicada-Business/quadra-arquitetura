import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { PermissionGate } from "./PermissionGate";
import { useIsMobile } from "@/hooks/use-mobile";
import { AIChatBox } from "@/components/chat/AIChatBox";
import { OportunidadesAprovacaoReminder } from "@/components/oportunidades-aprovacao-reminder";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem("sidebar_collapsed") === "true";
  } catch {
    return false;
  }
}

export function AppLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsed);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop sidebar - always rendered, collapsed or expanded */}
      {!isMobile && (
        <AppSidebar collapsed={sidebarCollapsed} />
      )}

      {/* Mobile sidebar via Sheet */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-gradient-marca">
        <AppHeader
          showMenuButton={isMobile}
          onMenuClick={() => setMobileOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto scrollbar-elegant">
          {/* h-full + flex: dá às páginas (ex. Pipeline de Leads/Parceiros)
              uma altura definida pra preencher com flex-1, em vez de cada
              uma tentar adivinhar via calc(100vh-Nrem) — que não sabe do
              header, do padding ou de quanto os filtros ocupam ao quebrar
              linha. Páginas que não usam essa altura (a maioria) continuam
              exatamente iguais: sem flex-1 no filho, a altura dele
              continua vindo do conteúdo. */}
          <div className="w-full min-w-0 h-full px-6 py-6 lg:px-8 lg:py-8 animate-fade-in flex flex-col">
            <PermissionGate>
              <Outlet />
            </PermissionGate>
          </div>
        </main>
      </div>

      {/* Buddy: lembra quem reportou de validar as entregas marcadas como
          feitas. Fora do <main> de propósito — é global, não da tela. */}
      <OportunidadesAprovacaoReminder />

      <AIChatBox />
    </div>
  );
}
