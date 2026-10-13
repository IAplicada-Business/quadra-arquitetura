// Sprint 7d (call 23/06): "fazer a contagem de trás pra frente — falta
// tantos dias para sua mudança". Card de countdown usado no resumo da
// obra (visão interna) e no portal do cliente (visão externa).
import { CalendarCheck, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MoveInCountdownProps {
  moveInDate: string | null;
  /** Texto adicional opcional (ex: nome da obra ou do cliente). */
  context?: string;
  /** Layout compacto inline (para usar em headers/dashboards). */
  compact?: boolean;
}

function diffInDays(targetIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetIso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDateLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function MoveInCountdown({ moveInDate, context, compact }: MoveInCountdownProps) {
  if (!moveInDate) return null;
  const days = diffInDays(moveInDate);
  const isOverdue = days < 0;
  const isClose = days >= 0 && days <= 7;

  const accent = isOverdue
    ? "text-destructive"
    : isClose
    ? "text-accent-ink"
    : "text-primary";

  const label = isOverdue
    ? `Mudança era ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"} atrás`
    : days === 0
    ? "A mudança é hoje"
    : days === 1
    ? "Falta 1 dia para a mudança"
    : `Faltam ${days} dias para a mudança`;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 text-sm">
        <CalendarClock className={`h-4 w-4 ${accent}`} />
        <span className={`font-display tabular-nums ${accent}`}>{label}</span>
        <span className="text-muted-foreground">· {formatDateLong(moveInDate)}</span>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${isOverdue ? "bg-destructive/10" : isClose ? "bg-accent/15" : "bg-primary/10"}`}>
          <CalendarCheck className={`h-5 w-5 ${accent}`} />
        </div>
        <div className="flex-1">
          <p className={`font-display text-xl leading-tight tabular-nums ${accent}`}>{label}</p>
          <p className="text-xs text-muted-foreground">
            Data planejada: {formatDateLong(moveInDate)}
            {context ? ` · ${context}` : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
