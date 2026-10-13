import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { C } from "@/lib/chartColors";
import type { PipelineMonth } from "@/hooks/useComercialMetrics";

interface MonthlyStackedChartProps {
  data: PipelineMonth[];
  /** Rótulos das três séries (comercial: leads; parceiros: indicações). */
  labels?: Partial<Record<"fechados" | "propostas" | "em_andamento", string>>;
}

/**
 * Barras empilhadas por mês, no padrão de dataviz do sistema: grade só
 * horizontal e discreta, barra fina com topo arredondado (4px), 2px de
 * respiro entre os segmentos (traço na cor do card), legenda, tooltip e
 * o total do mês escrito acima de cada barra.
 */
export function MonthlyStackedChart({ data, labels }: MonthlyStackedChartProps) {
  const config: ChartConfig = {
    fechados: { label: labels?.fechados ?? "Fechados", color: C.navy },
    propostas: { label: labels?.propostas ?? "Propostas", color: C.terra },
    em_andamento: { label: labels?.em_andamento ?? "Em andamento", color: C.navyFaint },
  };
  const withTotal = data.map((d) => ({ ...d, total: d.fechados + d.propostas + d.em_andamento }));

  return (
    <ChartContainer
      config={config}
      className="h-[240px] w-full [&_.recharts-bar-rectangle_path]:stroke-[hsl(var(--card))] [&_.recharts-bar-rectangle_path]:[stroke-width:2px]"
    >
      <BarChart data={withTotal} margin={{ top: 20, right: 8, left: -16, bottom: 0 }} barCategoryGap="38%">
        <CartesianGrid vertical={false} strokeOpacity={0.5} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent className="flex-wrap gap-y-1" />} />
        <Bar dataKey="fechados" stackId="a" fill="var(--color-fechados)" />
        <Bar dataKey="propostas" stackId="a" fill="var(--color-propostas)" />
        <Bar dataKey="em_andamento" stackId="a" fill="var(--color-em_andamento)" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="total"
            position="top"
            className="fill-muted-foreground"
            fontSize={11}
            formatter={(v: number) => (v > 0 ? v : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
