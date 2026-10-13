import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Lista curta por padrão, com "Ver mais" para abrir o resto.
 *
 * `resetKey` volta a lista para o modo curto quando muda (ex.: filtros),
 * assim um filtro novo não abre já expandido com centenas de linhas.
 */
export function useShowMore<T>(items: T[], limit: number, resetKey?: unknown) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
  }, [resetKey]);
  const visible = expanded ? items : items.slice(0, limit);
  return {
    visible,
    expanded,
    hiddenCount: items.length - visible.length,
    hasMore: items.length > limit,
    toggle: () => setExpanded((v) => !v),
  };
}

interface ShowMoreButtonProps {
  expanded: boolean;
  hasMore: boolean;
  /** Total da lista (para "Ver todos (N)"). */
  total: number;
  onToggle: () => void;
  /** Substantivo no plural, ex. "clientes". */
  noun: string;
}

export function ShowMoreButton({ expanded, hasMore, total, onToggle, noun }: ShowMoreButtonProps) {
  if (!hasMore) return null;
  return (
    <div className="flex justify-center py-2">
      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onToggle}>
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5 mr-1" /> Ver menos
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5 mr-1" /> Ver todos os {noun} ({total})
          </>
        )}
      </Button>
    </div>
  );
}
