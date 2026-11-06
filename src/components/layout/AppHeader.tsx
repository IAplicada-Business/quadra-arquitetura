import { Bell, ChevronLeft, ChevronRight, LogOut, Menu, Mic, Moon, Settings, Sun, User, ChevronRight as ChevronRightIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsDialog } from "@/components/layout/NotificationsPanel";
import { VoiceAgentDialog } from "@/components/layout/VoiceAgentDialog";
import { BuddyMenu } from "@/components/buddy/BuddyMenu";
import { DocsProjetoMenu } from "@/components/buddy/DocsProjetoMenu";
import logoAzul from "@/assets/logo-azul.png";

interface AppHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

// Mapeamento legível pra breadcrumb derivado da URL.
// Caminhos não listados caem para "label" = segmento capitalizado.
const PATH_LABELS: Record<string, string> = {
  "dashboard": "Dashboard",
  "escritorio": "Escritório",
  "obras": "Obras",
  "leads": "Leads",
  "pipeline": "Pipeline",
  "proposals": "Propostas",
  "contracts": "Contratos",
  "clients": "Clientes",
  "projects": "Obras",
  "kanban": "Kanban",
  "construction": "Obra",
  "tracking": "Acompanhamento",
  "tasks": "Tarefas",
  "suppliers": "Fornecedores",
  "voice-tasks": "Tarefas Quadra",
  "documents": "Documentos",
  "reports": "Relatórios",
  "content": "Conteúdo",
  "calendar": "Calendário",
  "scripts": "Roteiros",
  "posts": "Publicações",
  "instagram": "Instagrams",
  "admin": "Administrativo",
  "settings": "Configurações",
  "users": "Usuários",
  "invoices": "Notas Fiscais",
  "notifications": "Notificações",
  "financeiro": "Financeiro",
  "lancamentos": "Lançamentos",
  "comercial": "Comercial",
  "buddy": "Buddy",
  "bug": "Bug",
};

function humanize(segment: string): string {
  if (PATH_LABELS[segment]) return PATH_LABELS[segment];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment)) return "Detalhe";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppHeader({ onMenuClick, showMenuButton, sidebarCollapsed, onToggleSidebar }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    let acc = "";
    return parts.map((p) => {
      acc += `/${p}`;
      return { label: humanize(p), href: acc };
    });
  }, [location.pathname]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
  };

  const fullName = user?.user_metadata?.full_name as string | undefined;
  const email = user?.email ?? "";
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : email.charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3 h-16 px-4 lg:px-8 border-b border-border bg-background/85 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showMenuButton ? (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : (
          onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )
        )}

        {/* Logo só no mobile (quando sidebar está oculta) */}
        {showMenuButton ? (
          <div className="h-12 overflow-hidden">
            <img
              src={logoAzul}
              alt="Quadra"
              className="h-12 w-auto object-contain object-left animate-fade-in"
            />
          </div>
        ) : null}

        {/* Breadcrumb derivado da rota */}
        {breadcrumbs.length > 0 && (
          <nav className="hidden md:flex items-center gap-1.5 text-sm min-w-0 ml-1">
            {breadcrumbs.map((b, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <span key={b.href} className="flex items-center gap-1.5 min-w-0">
                  {idx > 0 && <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />}
                  {isLast ? (
                    <span className="font-medium text-foreground truncate">{b.label}</span>
                  ) : (
                    <Link
                      to={b.href}
                      className="text-muted-foreground hover:text-foreground truncate transition-colors"
                    >
                      {b.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
        <VoiceAgentDialog open={voiceOpen} onOpenChange={setVoiceOpen} />
        <NotificationsDialog open={notifOpen} onOpenChange={setNotifOpen} />

        {/* Plataforma base IAplicada: Docs do projeto + Buddy, nesta ordem,
            logo antes do avatar. Discretos de propósito — só as logos. */}
        <DocsProjetoMenu />
        <BuddyMenu />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex items-center gap-2 pl-1 pr-3 h-9 rounded-full bg-muted hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-foreground truncate max-w-[140px]">
                {fullName?.split(" ")[0] ?? email.split("@")[0]}
              </span>
              {/* Com o sino dentro do menu, sem este ponto não haveria nenhum
                  sinal de notificação nova sem abrir o menu. */}
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-50 bg-popover">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {fullName && <p className="text-sm font-medium leading-none">{fullName}</p>}
                <p className="text-xs leading-none text-muted-foreground">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setVoiceOpen(true)} className="cursor-pointer">
              <Mic className="mr-2 h-4 w-4" />
              Áudio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNotifOpen(true)} className="cursor-pointer">
              <Bell className="mr-2 h-4 w-4" />
              <span className="flex-1">Notificações</span>
              {unreadCount > 0 && (
                <Badge variant="default" className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </DropdownMenuItem>
            {/* Alternar tema sem fechar o menu: é um interruptor, dá pra ver o
                rótulo virar e voltar atrás sem reabrir tudo. */}
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); toggleTheme(); }}
              className="cursor-pointer"
            >
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              <span className="flex-1">Visual</span>
              <span className="text-xs text-muted-foreground">
                {theme === "dark" ? "Escuro" : "Claro"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
