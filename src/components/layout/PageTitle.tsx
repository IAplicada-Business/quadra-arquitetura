import type { ReactNode } from "react";
import { InfoHint } from "@/components/visual/InfoHint";
import { cn } from "@/lib/utils";

interface PageTitleProps {
  title: ReactNode;
  /** Explicação da tela — fica no "i" ao lado do título, não abaixo dele. */
  description?: ReactNode;
  /** Ícone opcional antes do título. */
  icon?: ReactNode;
  /** Informação curta ao lado do título (ex.: contagem, selo). */
  meta?: ReactNode;
  className?: string;
}

/**
 * Título padrão das telas internas: mesmo tamanho, fonte e peso em todas.
 * A descrição saiu de baixo do título e foi para um "i" discreto ao lado.
 */
export function PageTitle({ title, description, icon, meta, className }: PageTitleProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap min-w-0", className)}>
      <h1 className="text-2xl font-display font-semibold leading-tight flex items-center gap-2 min-w-0">
        {icon && <span className="text-primary shrink-0 [&_svg]:h-6 [&_svg]:w-6">{icon}</span>}
        <span className="truncate">{title}</span>
      </h1>
      {description && <InfoHint label="Sobre esta tela">{description}</InfoHint>}
      {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
    </div>
  );
}
