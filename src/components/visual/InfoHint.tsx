import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoHintProps {
  /** Texto explicativo — fica escondido até passar o mouse (ou tocar). */
  children: ReactNode;
  /** Rótulo para leitor de tela. */
  label?: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * "i" discreto ao lado de um título. Padrão do sistema para explicações:
 * em vez de um parágrafo cinza embaixo de cada título (que deixava as
 * telas tumultuadas), a explicação aparece ao passar o mouse — ou ao
 * tocar, no celular, já que tooltip puro não abre com toque.
 */
export function InfoHint({ children, label = "Mais informações", className, side = "bottom" }: InfoHintProps) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
            className={cn(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
              className,
            )}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align="start" className="max-w-xs text-xs leading-relaxed font-normal normal-case tracking-normal">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
