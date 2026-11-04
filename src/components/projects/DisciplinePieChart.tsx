import { useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { C } from "@/lib/chartColors";
import type { DisciplineSlice } from "@/lib/disciplineAccounts";

const PALETTE = [C.navy, C.terra, C.navyMid, C.muted, C.success, C.warning, C.navyFaint, C.danger];
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Mode = "previsto" | "executado";

interface Props {
  planned: DisciplineSlice[];
  executed: DisciplineSlice[];
}

/** Pizza por disciplina com toggle Previsto × Executado; tooltip com valor e %. */
export function DisciplinePieChart({ planned, executed }: Props) {
  const [mode, setMode] = useState<Mode>("executado");
  const slices = mode === "executado" ? executed : planned;
  const total = useMemo(() => slices.reduce((s, x) => s + x.value, 0), [slices]);
  const pct = (v: number) => (total > 0 ? ((v / total) * 100).toFixed(1) : "0.0");
  const config = useMemo<ChartConfig>(
    () => Object.fromEntries(slices.map((s, i) => [s.discipline, { label: s.discipline, color: PALETTE[i % PALETTE.length] }])),
    [slices],
  );

  return (
    <Card data-testid="discipline-pie">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Gastos por disciplina</CardTitle>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={mode}
          onValueChange={(v) => v && setMode(v as Mode)}
          aria-label="Alternar entre previsto e executado"
        >
          <ToggleGroupItem value="previsto">Previsto</ToggleGroupItem>
          <ToggleGroupItem value="executado">Executado</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sem valores {mode === "executado" ? "executados" : "previstos"} para as disciplinas selecionadas.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 md:flex-row">
            <ChartContainer config={config} className="h-[220px] w-full md:w-1/2">
              <PieChart>
                <ChartTooltip
                  content={({ active, payload }) => {
                    const p = active ? payload?.[0] : undefined;
                    if (!p) return null;
                    const value = Number(p.value);
                    return (
                      <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md">
                        <p className="font-medium">{String(p.name)}</p>
                        <p className="tabular-nums">
                          {brl(value)} · {pct(value)}%
                        </p>
                      </div>
                    );
                  }}
                />
                <Pie data={slices} dataKey="value" nameKey="discipline" innerRadius={50} outerRadius={90} strokeWidth={2}>
                  {slices.map((s, i) => (
                    <Cell key={s.discipline} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="w-full space-y-1.5 text-sm md:w-1/2">
              {slices.map((s, i) => (
                <li key={s.discipline} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                    {s.discipline}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {brl(s.value)} · {pct(s.value)}%
                  </span>
                </li>
              ))}
              <li className="flex justify-between border-t pt-1.5 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{brl(total)}</span>
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
