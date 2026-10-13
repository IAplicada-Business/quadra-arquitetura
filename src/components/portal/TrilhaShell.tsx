import type { ReactNode } from "react";
import { BookOpen, CheckSquare, Images, MessageCircle, Milestone, Newspaper, Wallet } from "lucide-react";
import { PORTAL_TABS, WHATSAPP_URL, type PortalTab } from "@/lib/portal";

const TAB_ICONS: Record<PortalTab, typeof Milestone> = {
  inicio: Milestone,
  pendencias: CheckSquare,
  galeria: Images,
  orcamento: Wallet,
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
  children: ReactNode;
}

/**
 * Casca da Trilha do Cliente (mockup 2a): cabeçalho com a marca à
 * esquerda e cliente/obra à direita, navegação por telas em cima no
 * desktop e barra inferior no celular, rodapé com contato.
 */
export function TrilhaShell({ clientName, projectName, active, onChange, onShowWelcome, badges, children }: Props) {
  const activeDef = PORTAL_TABS.find((t) => t.key === active) ?? PORTAL_TABS[0];

  return (
    <div className="trilha min-h-screen pb-20 md:pb-0">
      <header className="border-b border-[var(--trilha-areia)] bg-[var(--trilha-creme)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <button type="button" onClick={() => onChange("inicio")} className="font-display text-2xl tracking-tight text-[var(--trilha-navy)]" aria-label="Início">
            quadra<span className="text-[var(--trilha-terracota)]">.</span>
          </button>
          <div className="min-w-0 text-right">
            {clientName && <p className="truncate font-display text-base font-medium text-[var(--trilha-navy)]">{clientName}</p>}
            <p className="truncate text-xs text-[var(--trilha-navy)]/70">{projectName}</p>
          </div>
        </div>

        {/* Navegação desktop */}
        <nav className="mx-auto hidden max-w-5xl flex-wrap gap-2 px-4 pb-4 sm:px-6 md:flex" aria-label="Telas da trilha">
          {PORTAL_TABS.map((t) => {
            const isActive = t.key === active;
            const count = badges?.[t.key];
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onChange(t.key)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition ${
                  isActive
                    ? "border-[var(--trilha-navy)] bg-[var(--trilha-navy)] text-[var(--trilha-areia)]"
                    : "border-[var(--trilha-navy)]/40 text-[var(--trilha-navy)] hover:bg-[var(--trilha-navy)]/5"
                }`}
              >
                {t.label}
                {count ? (
                  <span className={`rounded-full px-1.5 text-[10px] ${isActive ? "bg-[var(--trilha-terracota)] text-white" : "bg-[var(--trilha-terracota)]/15 text-[var(--trilha-terracota)]"}`}>{count}</span>
                ) : null}
              </button>
            );
          })}
          {onShowWelcome && (
            <button type="button" onClick={onShowWelcome} className="ml-auto inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--trilha-terracota)] hover:underline">
              <BookOpen className="h-3.5 w-3.5" /> Boas-vindas
            </button>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {active !== "inicio" && (
          <p className="mb-2 text-xs text-[var(--trilha-navy)]/60">
            <button type="button" className="hover:underline" onClick={() => onChange("inicio")}>Trilha do projeto</button>
            <span className="mx-1.5">/</span>
            <span className="text-[var(--trilha-terracota)]">{activeDef.label}</span>
          </p>
        )}
        {children}

        <footer className="mt-12 border-t border-[var(--trilha-areia)] pt-6 text-center">
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
              <button type="button" onClick={onShowWelcome} className="text-xs text-[var(--trilha-terracota)] hover:underline md:hidden">
                Ver as boas-vindas novamente
              </button>
            </p>
          )}
        </footer>
      </main>

      {/* Barra inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--trilha-areia)] bg-[var(--trilha-creme)]/95 backdrop-blur md:hidden" aria-label="Telas da trilha (celular)">
        <ul className="grid grid-cols-5">
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
                  className={`relative flex w-full flex-col items-center gap-0.5 py-2 text-[10px] ${isActive ? "text-[var(--trilha-navy)] font-medium" : "text-[var(--trilha-navy)]/50"}`}
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
