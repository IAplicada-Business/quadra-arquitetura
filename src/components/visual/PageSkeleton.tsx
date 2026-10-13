import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Geometria = "table" | "cards" | "detail" | "kanban";

interface PageSkeletonProps {
  /** Forma do conteúdo que vai chegar. */
  variant?: Geometria;
  /** Linhas, cards ou colunas, conforme a variante. */
  rows?: number;
  /** Faixa de indicadores acima do conteúdo. */
  kpis?: number;
  className?: string;
}

/**
 * Esqueleto com a geometria do conteúdo final, no lugar do spinner solto.
 *
 * O spinner diz "espere" e nada mais: a tela salta quando o conteúdo
 * entra, porque o spinner ocupa 24px e a tabela ocupa 400. O esqueleto
 * reserva o espaço certo, então a chegada do dado não empurra nada.
 *
 * aria-busy + sr-only em vez de role="status" repetido por linha: o
 * leitor de tela anuncia "carregando" uma vez, não doze.
 */
export function PageSkeleton({ variant = "table", rows = 6, kpis = 0, className }: PageSkeletonProps) {
  return (
    <div className={cn("w-full min-w-0 space-y-4", className)} aria-busy="true">
      <span className="sr-only">Carregando…</span>

      {kpis > 0 && (
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4 gap-3">
          {Array.from({ length: kpis }).map((_, i) => (
            <div key={i} className="rounded-lg bg-card shadow-soft p-5 min-w-0 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))}
        </div>
      )}

      {variant === "table" && (
        <div className="rounded-lg bg-card shadow-soft overflow-hidden">
          <div className="flex items-center gap-4 border-b border-border px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-3", i === 0 ? "w-40" : "w-24")} />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/50 px-4 py-3 last:border-0">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className={cn("h-4", j === 0 ? "w-48" : "w-20")} />
              ))}
            </div>
          ))}
        </div>
      )}

      {variant === "cards" && (
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="rounded-lg bg-card shadow-soft p-5 min-w-0 space-y-3">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          ))}
        </div>
      )}

      {variant === "detail" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-card shadow-soft p-6 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {Array.from({ length: Math.max(1, rows - 3) }).map((_, i) => (
            <div key={i} className="rounded-lg bg-card shadow-soft p-6 space-y-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      )}

      {variant === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: Math.max(2, rows - 2) }).map((_, i) => (
            <div key={i} className="min-w-[260px] w-[260px] shrink-0 space-y-3">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="rounded-lg bg-card shadow-soft p-4 space-y-2">
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
