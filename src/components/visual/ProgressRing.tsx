import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** Percentual de 0 a 100. Valores fora da faixa são aparados. */
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  /** Mostra o percentual no centro. */
  showValue?: boolean;
  className?: string;
  label?: string;
}

/**
 * Anel de progresso. Usado onde a barra horizontal não cabe — dentro de
 * célula de tabela, ao lado do título de um card de obra.
 *
 * O arco sai de um círculo com strokeDasharray, não de um <path> com
 * arco: assim o traço acompanha qualquer espessura sem recalcular
 * geometria, e 100% fecha exato em vez de deixar a fresta que o arco
 * deixa quando início e fim coincidem.
 */
export function ProgressRing({
  value,
  size = 40,
  thickness = 4,
  color = "hsl(var(--primary))",
  trackColor = "hsl(var(--muted))",
  showValue = false,
  className,
  label,
}: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div
      className={cn("relative inline-grid place-items-center shrink-0", className)}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      {showValue && (
        <span
          className="absolute font-semibold tabular-nums"
          style={{ fontSize: Math.max(9, size * 0.28) }}
        >
          {Math.round(pct)}
        </span>
      )}
    </div>
  );
}
