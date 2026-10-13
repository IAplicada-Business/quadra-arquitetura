// Faixa "Faltam N dias para a mudança" usada nas subabas Fechamento
// Cliente e Contagem Regressiva (contagem em dias corridos, como o
// cliente enxerga).
import { differenceInDays, parseISO } from "date-fns";
import { Home } from "lucide-react";

function daysToMoveIn(moveInDate: string | null, today: Date = new Date()): number | null {
  if (!moveInDate) return null;
  return differenceInDays(parseISO(moveInDate), today);
}

export function MoveInBanner({ moveInDate, today }: { moveInDate: string | null; today?: Date }) {
  if (!moveInDate) return null;
  const days = daysToMoveIn(moveInDate, today);
  const tone = days !== null && days < 0
    ? { box: "bg-destructive/5 border-destructive/30", icon: "text-destructive" }
    : days !== null && days <= 14
      ? { box: "bg-warning/5 border-warning/30", icon: "text-warning-ink" }
      : { box: "bg-success/5 border-success/30", icon: "text-success" };
  const label = days === null
    ? "—"
    : days < 0
      ? `Mudança há ${Math.abs(days)} dias`
      : days === 0
        ? "Mudança hoje!"
        : `Faltam ${days} dias para a mudança`;
  return (
    <div className={`rounded-lg border p-4 flex items-center gap-4 ${tone.box}`} data-testid="move-in-banner">
      <Home className={`h-6 w-6 shrink-0 ${tone.icon}`} />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">
          Data prevista: {new Date(moveInDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
