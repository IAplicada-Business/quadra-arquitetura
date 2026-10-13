import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Padrão único dos kanbans de tarefas (Projetos, Quadra, Audio Tasks).
 *
 * Antes cada tela tinha colunas com min-h-[60vh] empilhadas abaixo dos
 * filtros: a soma passava da altura da janela e a borda de baixo do
 * quadro ficava cortada, e cada tela tinha um tamanho diferente. Agora o
 * quadro ocupa exatamente o espaço que sobra na página (a página precisa
 * ser `flex flex-col h-full`) e a rolagem acontece dentro de cada coluna,
 * como no Pipeline de Leads.
 */
export function KanbanBoard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 gap-4 md:flex-1 md:min-h-[360px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface KanbanColumnProps {
  label: string;
  count: number;
  tone?: string;
  children: ReactNode;
}

export function KanbanColumn({ label, count, tone, children }: KanbanColumnProps) {
  return (
    <div className={cn("flex flex-col min-h-0 rounded-xl border p-3", tone)}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Badge variant="outline" className="text-xs">{count}</Badge>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

/** Área de soltar da coluna: preenche a coluna e rola por dentro. */
export function kanbanListClass(isDraggingOver: boolean) {
  return cn(
    "h-full min-h-[120px] space-y-2 rounded p-0.5 md:overflow-y-auto scrollbar-elegant transition-colors",
    isDraggingOver && "bg-primary/10",
  );
}

/** Cartão de tarefa: mesmo raio, sombra e estado de arraste em todos os quadros. */
export function kanbanCardClass(isDragging: boolean) {
  return cn(
    "bg-card border rounded-lg p-3 shadow-soft",
    isDragging && "shadow-elev ring-2 ring-primary/30",
  );
}
