import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import logoBege from "@/assets/logo-bege.png";
import { AuthBlobs } from "./AuthBlobs";

/**
 * Moldura das telas fora do shell (login, recuperar senha, nova senha,
 * 404): tela cheia em --deep, logo centralizado, nome do sistema em
 * maiúsculas espaçadas e título em fonte display. Os blobs são só do login.
 */
interface AuthShellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Blobs animados atrás do logo (só no login). */
  blobs?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, blobs = false, children, footer }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-deep px-4 py-12 text-deep-foreground">
      {blobs && <AuthBlobs />}

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logoBege} alt="Quadra Arquitetura" className="h-24 w-auto object-contain" />
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.35em] text-deep-foreground/60">Quadra · Gestão</p>
          <h1 className="mt-3 font-display text-3xl font-light leading-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 text-sm leading-relaxed text-deep-foreground/70">{subtitle}</p>}
        </div>

        {children}

        {footer && <div className="mt-8 text-center text-sm text-deep-foreground/60">{footer}</div>}
      </div>
    </main>
  );
}

/** Rótulo em maiúsculas pequenas. */
export function AuthLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-deep-foreground/70">
      {children}
    </label>
  );
}

/** Campo com fundo translúcido escuro e o raio da marca. */
export const AuthInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function AuthInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-[var(--radius)] border border-deep-foreground/15 bg-white/5 px-4 text-base text-deep-foreground",
        "placeholder:text-deep-foreground/35 transition-colors",
        "focus:border-accent-brand focus:outline-none focus:ring-2 focus:ring-accent-brand/40",
        "disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});

/** Botão principal: claro, pílula, maiúsculas espaçadas. */
export function AuthButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex h-12 w-full items-center justify-center rounded-full bg-deep-foreground px-6 text-xs font-medium uppercase tracking-[0.25em] text-deep",
        "transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:ring-offset-2 focus-visible:ring-offset-deep",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

/** Link secundário discreto. */
export const authLinkClass =
  "text-sm text-deep-foreground/60 underline-offset-4 transition hover:text-deep-foreground hover:underline focus:outline-none focus-visible:underline";
