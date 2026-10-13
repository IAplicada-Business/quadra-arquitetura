import { cn } from "@/lib/utils";

/**
 * Os quatro estados do padrão IAplicada. A semântica é fixa; a cor vem
 * dos tokens --status-*, que por sua vez saem da paleta do cliente.
 */
export type StatusTone = "now" | "doing" | "next" | "back";

const tons: Record<StatusTone, string> = {
  now: "bg-status-now text-status-now-foreground",
  doing: "bg-status-doing text-status-doing-foreground",
  next: "bg-status-next text-status-next-foreground",
  back: "bg-status-back text-status-back-foreground",
};

interface StatusPillProps {
  tone: StatusTone;
  children: React.ReactNode;
  /** Ponto antes do texto, para quem distingue estado sem depender de cor. */
  dot?: boolean;
  className?: string;
}

/**
 * Pílula de estado. Existe separada do <Badge> porque o Badge carrega as
 * variantes do shadcn (default/secondary/destructive/outline), que são
 * sobre ênfase visual; aqui a variante é sobre onde o item está no fluxo.
 */
export function StatusPill({ tone, children, dot = false, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
        tons[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
