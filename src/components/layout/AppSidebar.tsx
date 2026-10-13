import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LayoutGrid,
  HardHat,
  FileBarChart,
  Users,
  FileText,
  FileSignature,
  UserCheck,
  Building2,
  ClipboardList,
  CheckSquare,
  ListChecks,
  Truck,
  CalendarRange,
  Film,
  Send,
  Instagram,
  Settings,
  Shield,
  Receipt,
  Mic,
  Handshake,
  LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import logoBege from "@/assets/logo-bege.png";
import { InstallPwaButton } from "@/components/layout/InstallPwaButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type MenuItem = { title: string; url: string; subItems?: { title: string; url: string }[] };
type MenuGroup = { label: string; items: MenuItem[] };

// Sprint 7c — ícone por grupo para os "menus pai" deixarem de parecer
// só texto. Reutiliza ícones já importados do lucide.
const groupIcons: Record<string, LucideIcon> = {
  "Análises Quadra": LayoutDashboard,
  "Comercial": Users,
  "Gestão de Obras": HardHat,
  "Gestão de Conteúdo": Film,
  "Administrativo": Settings,
};

const iconMap: Record<string, LucideIcon> = {
  "Dashboard Escritório": LayoutDashboard,
  "Dashboard Comercial": LayoutDashboard,
  "Dashboard Financeiro": Receipt,
  "Notas Fiscais": Receipt,
  "Dashboard Obras": HardHat,
  "Financeiro": Receipt,
  "Lançamentos": Receipt,
  "Relatórios": FileBarChart,
  "Leads": Users,
  "Documentos": FileText,
  "Propostas": FileText,
  "Contratos": FileSignature,
  "Clientes": UserCheck,
  "Obras": Building2,
  "Lista de Obras": Building2,
  "Acompanhamento": ClipboardList,
  "Tarefas": CheckSquare,
  "Tarefas por Obra": CheckSquare,
  "Tarefas Quadra": ListChecks,
  "Kanban": ListChecks,
  "Kanban Projetos": Building2,
  "Kanban Quadra": ListChecks,
  "Pipeline": Users,
  "Parceiros": Handshake,
  "Histórico de Voz": ListChecks,
  "Audio Tasks": Mic,
  "Fornecedores": Truck,
  "Calendário": CalendarRange,
  "Roteiros": Film,
  "Publicações": Send,
  "Social": Instagram,
  "Configurações": Settings,
  "Usuários": Shield,
};

const menuGroups: MenuGroup[] = [
  {
    label: "Análises Quadra",
    items: [
      { title: "Dashboard Comercial", url: "/dashboard/escritorio" },
      { title: "Dashboard Obras", url: "/dashboard/obras" },
      {
        title: "Financeiro",
        url: "/dashboard/financeiro",
        subItems: [
          { title: "Lançamentos", url: "/financeiro/lancamentos" },
          { title: "Dashboard Financeiro", url: "/dashboard/financeiro" },
          { title: "Notas Fiscais", url: "/admin/invoices" },
        ],
      },
      // Sprint 7 — submenu Kanban (Projetos + Quadra). "Tarefas por
      // Obra" foi removida (redundância com Kanban Quadra + cronograma).
      {
        title: "Tarefas",
        url: "/tasks/projetos",
        subItems: [
          { title: "Kanban Projetos", url: "/tasks/projetos" },
          { title: "Kanban Quadra", url: "/tasks/quadra" },
          { title: "Audio Tasks", url: "/construction/voice-tasks" },
        ],
      },
    ],
  },
  {
    label: "Comercial",
    items: [
      {
        title: "Leads",
        url: "/leads/pipeline",
        subItems: [
          { title: "Pipeline", url: "/leads/pipeline" },
          { title: "Parceiros", url: "/partners/pipeline" },
        ],
      },
      { title: "Clientes", url: "/clients" },
      {
        title: "Documentos",
        url: "/leads/proposals",
        subItems: [
          { title: "Propostas", url: "/leads/proposals" },
          { title: "Contratos", url: "/leads/contracts" },
        ],
      },
    ],
  },
  {
    label: "Gestão de Obras",
    items: [
      {
        title: "Obras",
        url: "/projects",
        subItems: [
          { title: "Lista de Obras", url: "/projects" },
          { title: "Acompanhamento", url: "/construction/tracking" },
        ],
      },
      { title: "Fornecedores", url: "/construction/suppliers" },
    ],
  },
  {
    label: "Gestão de Conteúdo",
    items: [
      { title: "Calendário", url: "/content/calendar" },
      { title: "Roteiros", url: "/content/scripts" },
      { title: "Publicações", url: "/content/posts" },
      { title: "Social", url: "/content/instagram" },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { title: "Configurações", url: "/admin/settings" },
      { title: "Usuários", url: "/admin/users" },
    ],
  },
];


interface AppSidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function AppSidebar({ onNavigate, collapsed = false }: AppSidebarProps) {
  // Esconde do menu tudo que o usuário não pode ver (permissões por tela
  // salvas em Administrativo → Usuários). Sub-itens são filtrados um a um;
  // itens e grupos que ficarem vazios somem inteiros.
  const { canViewPath } = usePermissions();
  const visibleGroups = useMemo((): MenuGroup[] => {
    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items
          .map((item) => {
            if (item.subItems) {
              const subItems = item.subItems.filter((s) => canViewPath(s.url));
              if (subItems.length === 0) return null;
              // Se a URL "pai" ficou inacessível, aponta pro 1º sub visível
              const url = canViewPath(item.url) ? item.url : subItems[0].url;
              return { ...item, url, subItems };
            }
            return canViewPath(item.url) ? item : null;
          })
          .filter((i): i is MenuItem => i !== null),
      }))
      .filter((group) => group.items.length > 0);
  }, [canViewPath]);

  // Sprint 7d — comportamento pedido na call: "menu fica todo aberto,
  // deveria ficar somente os menus pais". Default sempre fechado.
  // Mantemos localStorage para persistir a preferência do usuário,
  // mas migrando estados antigos que vieram com tudo aberto.
  const getInitialGroups = (): Record<string, boolean> => {
    const allClosed = Object.fromEntries(menuGroups.map((g) => [g.label, false]));
    try {
      const saved = localStorage.getItem("sidebar_groups_state");
      if (!saved) return allClosed;
      const parsed = JSON.parse(saved) as Record<string, boolean>;
      // Migração: se o estado salvo tem 2+ grupos abertos, descarta —
      // era da versão antiga que abria muito.
      const openCount = Object.values(parsed).filter(Boolean).length;
      if (openCount >= 2) {
        try { localStorage.removeItem("sidebar_groups_state"); } catch {}
        return allClosed;
      }
      return { ...allClosed, ...parsed };
    } catch {}
    return allClosed;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialGroups);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();

  // Sprint 7d — sem auto-open: a sidebar começa fechada e fica fechada
  // até o usuário expandir um grupo manualmente. Antes um useEffect
  // abria o grupo da rota ativa em cada navegação, o que dava a
  // sensação de "tá tudo aberto sozinho".

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try { localStorage.setItem("sidebar_groups_state", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const toggleSubMenu = (title: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isSubItemActive = (item: MenuItem) =>
    item.subItems?.some((sub) => location.pathname === sub.url) ?? false;

  const getIcon = (title: string) => {
    const Icon = iconMap[title];
    return Icon ? <Icon className="h-4 w-4 shrink-0" /> : null;
  };

  // --- COLLAPSED (mini) MODE ---
  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <aside className="flex flex-col h-full w-16 border-r border-sidebar-border bg-sidebar bg-sidebar-gradient transition-all duration-200">
          <div className="flex items-center justify-center h-16 border-b border-sidebar-border">
            {/* Logo omitida: quando colapsada o header já exibe a logo */}
          </div>

          <nav className="flex-1 py-3 overflow-y-auto scrollbar-sidebar">
            {visibleGroups.map((group, gi) => (
              <div key={group.label} className={cn(gi > 0 && "mt-2 pt-2 border-t border-sidebar-border/40")}>
                {group.items.map((item) => {
                  if (item.subItems) {
                    return (
                      <CollapsedSubMenu
                        key={item.title}
                        item={item}
                        icon={getIcon(item.title)}
                        isActive={isSubItemActive(item)}
                        onNavigate={onNavigate}
                      />
                    );
                  }
                  const active = location.pathname === item.url;
                  return (
                    <Tooltip key={item.url}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { navigate(item.url); onNavigate?.(); }}
                          className={cn(
                            "relative flex items-center justify-center w-full h-11 text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors group",
                            active && "text-sidebar-foreground"
                          )}
                        >
                          {active && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sidebar-primary" />
                          )}
                          <span className={cn(
                            "h-9 w-9 rounded-xl grid place-items-center transition-colors",
                            active
                              ? "bg-sidebar-primary/15 text-sidebar-primary"
                              : "group-hover:bg-sidebar-accent"
                          )}>
                            {getIcon(item.title)}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="py-2 border-t border-sidebar-border/40">
            <InstallPwaButton variant="sidebar-collapsed" />
          </div>
        </aside>
      </TooltipProvider>
    );
  }

  // --- EXPANDED MODE ---
  return (
    <aside className="flex flex-col h-full w-[260px] border-r border-sidebar-border bg-sidebar bg-sidebar-gradient transition-all duration-200">
      <div className="flex items-center px-5 h-16 border-b border-sidebar-border">
        <img src={logoBege} alt="Quadra Arquitetura" className="h-10 w-auto object-contain object-left animate-fade-in" />
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto scrollbar-sidebar min-h-0">
        {visibleGroups.map((group) => {
          const GroupIcon = groupIcons[group.label];
          const isOpen = openGroups[group.label];
          return (
          <div key={group.label} className="mb-1">
            <button
              onClick={() => toggleGroup(group.label)}
              className={cn(
                "group/header flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                isOpen
                  ? "bg-sidebar-accent/60 text-sidebar-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              )}
            >
              {GroupIcon && (
                <span className={cn(
                  "h-7 w-7 rounded-md grid place-items-center shrink-0 transition-colors",
                  isOpen
                    ? "bg-sidebar-primary/15 text-sidebar-primary"
                    : "bg-sidebar-accent/60 text-sidebar-foreground/80 group-hover/header:text-sidebar-foreground"
                )}>
                  <GroupIcon className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[0.08em]">{group.label}</span>
              <span className="text-[10px] text-sidebar-foreground/40 tabular-nums">
                {group.items.length}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-sidebar-foreground/50 transition-transform duration-200",
                  !isOpen && "-rotate-90"
                )}
              />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                openGroups[group.label] ? "max-h-[480px]" : "max-h-0"
              )}
            >
              <ul className="space-y-0.5 pt-1">
                {group.items.map((item) =>
                  item.subItems ? (
                    <li key={item.title}>
                      <button
                        onClick={() => toggleSubMenu(item.title)}
                        className={cn(
                          "flex items-center justify-between w-full rounded-lg pl-3 pr-2 py-2 text-sm font-medium text-sidebar-foreground/80 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          isSubItemActive(item) && "text-sidebar-foreground"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          {getIcon(item.title)}
                          {item.title}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200 text-sidebar-foreground/50",
                            (openSubMenus[item.title] || isSubItemActive(item)) && "rotate-90"
                          )}
                        />
                      </button>
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-200",
                          (openSubMenus[item.title] || isSubItemActive(item)) ? "max-h-60" : "max-h-0"
                        )}
                      >
                        <ul className="space-y-0.5 pl-4 pt-0.5">
                          {item.subItems.map((sub) => (
                            <li key={sub.url}>
                              <NavLink
                                to={sub.url}
                                end
                                className="relative flex items-center gap-2 rounded-md pl-3 pr-3 py-1.5 text-[13px] font-medium text-sidebar-foreground/75 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                activeClassName="bg-sidebar-primary/15 text-sidebar-foreground [&_svg]:text-sidebar-primary"
                                onClick={onNavigate}
                              >
                                {getIcon(sub.title)}
                                {sub.title}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ) : (
                    <li key={item.url}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        activeClassName="bg-sidebar-primary/15 text-sidebar-foreground [&_svg]:text-sidebar-primary [&]:before:content-[''] [&]:before:absolute [&]:before:left-0 [&]:before:top-1.5 [&]:before:bottom-1.5 [&]:before:w-[3px] [&]:before:rounded-r [&]:before:bg-sidebar-primary"
                        onClick={onNavigate}
                      >
                        {getIcon(item.title)}
                        {item.title}
                      </NavLink>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
          );
        })}
      </nav>
      <div className="px-2 py-2 border-t border-sidebar-border/40 shrink-0 space-y-1.5">
        <SidebarUserCard />
        <InstallPwaButton variant="sidebar" />
      </div>
    </aside>
  );
}

// Card do usuário no rodapé da sidebar (Onda 5 do padrão IAplicada).
// Só mostra quem está logado — as ações continuam no menu de perfil do
// header, que é onde elas sempre estiveram.
function SidebarUserCard() {
  const { user } = useAuth();
  if (!user) return null;

  const fullName = user.user_metadata?.full_name as string | undefined;
  const email = user.email ?? "";
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/50 px-2.5 py-2 min-w-0">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-sidebar-primary/20 text-[11px] font-medium text-sidebar-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-sidebar-foreground">
          {fullName || email}
        </p>
        {fullName && (
          <p className="truncate text-[11px] text-sidebar-foreground/60">{email}</p>
        )}
      </div>
    </div>
  );
}

// Sub-component for collapsed sub-menu items with popover
function CollapsedSubMenu({
  item,
  icon,
  isActive,
  onNavigate,
}: {
  item: MenuItem;
  icon: React.ReactNode;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center w-full h-10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-44 p-1">
        {item.subItems?.map((sub) => (
          <button
            key={sub.url}
            onClick={() => { navigate(sub.url); onNavigate?.(); }}
            className={cn(
              "flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors",
              location.pathname === sub.url && "bg-accent text-accent-foreground"
            )}
          >
            {iconMap[sub.title] && (() => { const I = iconMap[sub.title]; return <I className="h-3.5 w-3.5" />; })()}
            {sub.title}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
