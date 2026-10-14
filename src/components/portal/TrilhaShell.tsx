import type { ReactNode } from "react";
import { BookOpen, CalendarRange, CheckSquare, Images, MessageCircle, Milestone, Newspaper, Wallet } from "lucide-react";
import { PORTAL_TABS, WHATSAPP_URL, type PortalTab } from "@/lib/portal";
import { QuadraLogo, QuadraWatermark } from "./TrilhaBrand";

const TAB_ICONS: Record<PortalTab, typeof Milestone> = {
  inicio: Milestone,
  pendencias: CheckSquare,
  galeria: Images,
  orcamento: Wallet,
  cronograma: CalendarRange,
  resumos: Newspaper,
};

interface Props {
  clientName?: string | null;
  projectName: string;
  active: PortalTab;
  onChange: (tab: PortalTab) => void;
  /** Quando há onboarding configurado, oferece rever as boas-vindas. */
  onShowWelcome?: () => void;
  /** Contadores por aba (ex.: pendências abertas). */
  badges?: Partial<Record<PortalTab, number>>;
  /** Última vez que os dados chegaram do servidor (portal ao vivo). */
  updatedAt?: Date | null;
  children: ReactNode;
}

function LiveStatus({ updatedAt, tone }: { updatedAt?: Date | null; tone: "light" | "navy" }) {
  if (!updatedAt) return null;
  const hhmm = updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <p className={`flex items-center gap-1.5 text-[11px] ${tone === "light" ? "text-[var(--trilha-areia)]/70" : "text-[var(--trilha-navy)]/60"}`} data-testid="live-status">
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--trilha-salvia)] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--trilha-salvia)]" />
      </span>
      Ao vivo · atualizado às {hhmm}
    </p>
  );
}

/**
 * Casca da Trilha do Cliente, no formato do painel web do mockup (1c):
 * barra lateral azul-marinho com a marca, as telas e o contato no
 * desktop; no celular, cabeçalho com a marca e barra inferior. O logo da
 * Quadra fica ao fundo, grande e quase transparente.
 */
export function TrilhaShell({ clientName, projectName, active, onChange, onShowWelcome, badges, updatedAt, children }: Props) {
  const activeDef = PORTAL_TABS.find((t) => t.key === active) ?? PORTAL_TABS[0];

  return (
    <div className="trilha relative min-h-screen pb-20 md:flex md:pb-0">
      {/* Marca d'água da página */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <QuadraWatermark className="-bottom-[10vh] -right-[6vw] w-[min(92vw,1100px)] md:w-[min(64vw,1100px)]" opacity={0.04} />
      </div>

      {/* Fundo da barra lateral, contínuo mesmo em páginas longas */}
      <div className="fixed inset-y-0 left-0 z-0 hidden w-60 bg-[var(--trilha-navy)] md:block lg:w-64" aria-hidden />

      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 z-10 hidden h-screen w-60 shrink-0 flex-col overflow-hidden bg-[var(--trilha-navy)] text-[var(--trilha-areia)] md:flex lg:w-64">
        <QuadraWatermark tone="light" className="-bottom-16 -left-10 w-[22rem] max-w-none" opacity={0.07} />
        <div className="relative px-6 pb-6 pt-8">
          <button type="button" onClick={() => onChange("inicio")} aria-label="Início" className="block">
            <QuadraLogo tone="light" className="w-24" />
          </button>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--trilha-terracota)]">Trilha do cliente</p>
        </div>

        <nav className="relative flex-1 space-y-1 px-3" aria-label="Telas da trilha">
          {PORTAL_TABS.map((t) => {
            const Icon = TAB_ICONS[t.key];
            const isActive = t.key === active;
            const count = badges?.[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange(t.key)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${
                  isActive ? "bg-white/10 font-medium text-white" : "text-[var(--trilha-areia)]/75 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--trilha-terracota)]" aria-hidden />}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{t.label}</span>
                {count ? <span className="rounded-full bg-[var(--trilha-terracota)] px-1.5 text-[10px] font-medium text-white">{count}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="relative space-y-4 border-t border-white/10 px-6 py-6">
          {onShowWelcome && (
            <button type="button" onClick={onShowWelcome} className="inline-flex items-center gap-1.5 text-xs text-[var(--trilha-areia)]/80 hover:text-white">
              <BookOpen className="h-3.5 w-3.5" /> Boas-vindas
            </button>
          )}
          <div className="min-w-0">
            {clientName && <p className="truncate font-display text-base text-white">{clientName}</p>}
            <p className="truncate text-xs text-[var(--trilha-areia)]/70">{projectName}</p>
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--trilha-areia)]/40 px-4 py-1.5 text-xs text-[var(--trilha-areia)] hover:bg-white/10"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Falar com a Quadra
          </a>
          <LiveStatus updatedAt={updatedAt} tone="light" />
        </div>
      </aside>

      <div className="relative z-10 min-w-0 flex-1">
        {/* Cabeçalho (celular) */}
        <header className="flex items-center justify-between gap-4 border-b border-[var(--trilha-areia)] bg-[var(--trilha-creme)]/90 px-4 py-3 backdrop-blur md:hidden">
          <button type="button" onClick={() => onChange("inicio")} aria-label="Início">
            <QuadraLogo className="w-12" />
          </button>
          <div className="min-w-0 text-right">
            {clientName && <p className="truncate font-display text-base text-[var(--trilha-navy)]">{clientName}</p>}
            <p className="truncate text-xs text-[var(--trilha-navy)]/70">{projectName}</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {active !== "inicio" && (
            <p className="mb-2 text-xs text-[var(--trilha-navy)]/60">
              <button type="button" className="hover:underline" onClick={() => onChange("inicio")}>Trilha do projeto</button>
              <span className="mx-1.5">/</span>
              <span className="text-[var(--trilha-terracota)]">{activeDef.label}</span>
            </p>
          )}
          {children}

          <footer className="mt-12 border-t border-[var(--trilha-areia)] pt-6 text-center md:hidden">
            <p className="text-sm text-[var(--trilha-navy)]/70">Dúvidas? Fale com a Quadra Arquitetura.</p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--trilha-navy)] px-5 py-2 text-sm text-[var(--trilha-areia)] hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            {onShowWelcome && (
              <p className="mt-4">
                <button type="button" onClick={onShowWelcome} className="text-xs text-[var(--trilha-terracota)] hover:underline">
                  Ver as boas-vindas novamente
                </button>
              </p>
            )}
            <div className="mt-4 flex justify-center">
              <LiveStatus updatedAt={updatedAt} tone="navy" />
            </div>
          </footer>
        </main>
      </div>

      {/* Barra inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--trilha-areia)] bg-[var(--trilha-creme)]/95 backdrop-blur md:hidden" aria-label="Telas da trilha (celular)">
        {/* A grade segue o número de abas em vez de uma contagem fixa:
            com grid-cols-5 travado, a sexta aba caía numa segunda linha
            e a barra cobria o conteúdo. */}
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${PORTAL_TABS.length}, minmax(0, 1fr))` }}>
          {PORTAL_TABS.map((t) => {
            const Icon = TAB_ICONS[t.key];
            const isActive = t.key === active;
            const count = badges?.[t.key];
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => onChange(t.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex w-full flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? "font-medium text-[var(--trilha-navy)]" : "text-[var(--trilha-navy)]/50"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{t.short}</span>
                  {count ? <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-[var(--trilha-terracota)]" aria-hidden /> : null}
                  {isActive && <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-[var(--trilha-terracota)]" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
