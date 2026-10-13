import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { funnelWidths, type FunnelResult } from "@/lib/funnel";

/**
 * Rampa sequencial de um só matiz (navy), clara no topo e escura no
 * fundo: a etapa mais funda é a mais valiosa. Texto escuro nas três
 * primeiras, branco nas duas últimas (contraste ≥ 4.5:1 nos dois casos).
 */
const RAMP = [
  { fill: "hsl(220, 35%, 88%)", ink: "hsl(220, 47%, 22%)" },
  { fill: "hsl(220, 35%, 76%)", ink: "hsl(220, 47%, 22%)" },
  { fill: "hsl(220, 35%, 62%)", ink: "hsl(220, 47%, 14%)" },
  { fill: "hsl(220, 40%, 42%)", ink: "#ffffff" },
  { fill: "hsl(220, 47%, 22%)", ink: "#ffffff" },
];

interface FunnelChartProps {
  funnel: FunnelResult;
}

/**
 * Funil "de verdade" (formato de filtro de café): cada etapa é uma fatia
 * trapezoidal, mais estreita que a anterior, com a quantidade dentro e a
 * conversão ao lado. A fatia de baixo afunila até a largura da próxima,
 * então o desenho inteiro forma um só funil contínuo.
 */
export function FunnelChart({ funnel }: FunnelChartProps) {
  const { stages, rates } = funnel;
  const widths = funnelWidths(stages.map((s) => s.count));
  const top = stages[0]?.count ?? 0;

  return (
    <TooltipProvider delayDuration={100}>
      <ol className="space-y-[2px]" aria-label="Funil">
        {stages.map((stage, i) => {
          const w = widths[i];
          const next = i < stages.length - 1 ? widths[i + 1] : w * 0.82;
          const l1 = (100 - w) / 2;
          const l2 = (100 - next) / 2;
          const color = RAMP[Math.min(i, RAMP.length - 1)];
          const pctTop = top > 0 ? Math.round((stage.count / top) * 100) : 0;
          const rate = i > 0 ? rates[i - 1] : null;
          return (
            <li key={stage.label} className="grid grid-cols-[minmax(0,1fr)_104px] sm:grid-cols-[96px_minmax(0,1fr)_128px] items-center gap-3">
              <span className="hidden sm:block text-xs font-medium text-muted-foreground text-right truncate">
                {stage.label}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative h-12 cursor-default" tabIndex={0}>
                    <div
                      className="absolute inset-0 transition-[clip-path] duration-500"
                      style={{
                        backgroundColor: color.fill,
                        clipPath: `polygon(${l1}% 0, ${100 - l1}% 0, ${100 - l2}% 100%, ${l2}% 100%)`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
                      <span className="text-lg font-display font-semibold tabular-nums" style={{ color: color.ink }}>
                        {stage.count}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{stage.label}: {stage.count}</p>
                  {rate != null && <p className="text-xs">{rate}% avançaram da etapa anterior</p>}
                  <p className="text-xs">{pctTop}% do topo do funil</p>
                </TooltipContent>
              </Tooltip>
              <div className="text-xs leading-tight min-w-0">
                <p className="sm:hidden font-medium text-foreground truncate">{stage.label}</p>
                {rate != null ? (
                  <>
                    <p className="font-semibold tabular-nums text-foreground">{rate}%</p>
                    <p className="text-muted-foreground">da etapa anterior</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold tabular-nums text-foreground">100%</p>
                    <p className="text-muted-foreground">entrada</p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </TooltipProvider>
  );
}
