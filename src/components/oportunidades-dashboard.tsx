import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  metricasOportunidadesDashboard,
  STATUS_LABEL,
  TIPO_LABEL,
  PRIORIDADE_LABEL,
  PRIORIDADE_COR,
  type Oportunidade,
} from "@/lib/oportunidades.functions";
import { Bug, CheckCircle2, Rocket, Clock3, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/visual/InfoHint";

const TIPO_COR = {
  bug: "text-rose-600 bg-rose-50 border-rose-200",
  melhoria: "text-amber-600 bg-amber-50 border-amber-200",
  duvida: "text-blue-600 bg-blue-50 border-blue-200",
} as const;

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: typeof Bug;
  tone?: "default" | "ok" | "warn" | "accent";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "accent"
          ? "text-sky-700"
          : "text-foreground";
  return (
    <Card className="rounded-2xl border-0 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={cn("mt-2 font-display text-3xl font-bold tabular-nums", toneClass)}>
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function OportunidadesDashboard({
  opts,
  onSelect,
}: {
  opts: Oportunidade[];
  onSelect: (o: Oportunidade) => void;
}) {
  const m = metricasOportunidadesDashboard(opts);
  const taxaBugs =
    m.bugsEntregues + m.bugsAbertos > 0
      ? Math.round((m.bugsEntregues / (m.bugsEntregues + m.bugsAbertos)) * 100)
      : 0;
  const impactoChart = [
    { nome: "Corrigidos", valor: m.bugsEntregues },
    { nome: "Em aberto", valor: m.bugsAbertos },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Entregues"
          value={m.entregues}
          hint={`${m.aprovados} aprovada(s)`}
          icon={CheckCircle2}
          tone="ok"
        />
        <Kpi
          label="Aguardando aprovação"
          value={m.aguardandoAprovacao}
          hint="Na coluna Entregue"
          icon={Clock3}
          tone={m.aguardandoAprovacao > 0 ? "warn" : "default"}
        />
        <Kpi
          label="Bugs corrigidos"
          value={m.bugsEntregues}
          hint={`${taxaBugs}% do backlog de bugs`}
          icon={Bug}
          tone="accent"
        />
        <Kpi
          label="Em andamento"
          value={m.emAndamento}
          hint={`${m.planejados} planejado(s)`}
          icon={Rocket}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-3xl border-0 p-5 shadow-soft">
          <h3 className="mb-4 font-display text-lg flex items-center gap-1.5">
            Evolução das entregas
            <InfoHint>Entregas por mês (e bugs entre elas) — últimos 6 meses.</InfoHint>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.serieEntregas} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [
                    v,
                    name === "entregues" ? "Entregas" : "Bugs corrigidos",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="entregues"
                  name="entregues"
                  stroke="hsl(var(--foreground))"
                  fill="hsl(var(--foreground))"
                  fillOpacity={0.12}
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="bugs"
                  name="bugs"
                  stroke="#e11d48"
                  fill="#e11d48"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-3xl border-0 p-5 shadow-soft">
          <h3 className="mb-4 font-display text-lg flex items-center gap-1.5">
            Impacto dos bugs
            <InfoHint>Corrigidos vs. ainda abertos.</InfoHint>
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {m.bugsBloqueantesAbertos} bloqueante(s) em aberto.
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactoChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={72}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => [v, "Bugs"]} />
                <Bar dataKey="valor" fill="#e11d48" radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Taxa resolvida
              </div>
              <div className="font-display text-xl font-bold">{taxaBugs}%</div>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Bloqueantes
              </div>
              <div className="font-display text-xl font-bold">{m.bugsBloqueantesAbertos}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-3xl border-0 shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-lg flex items-center gap-1.5">
              Próximas etapas
              <InfoHint>Em desenvolvimento, planejado e backlog — por prioridade.</InfoHint>
            </h3>
          </div>
          <Badge variant="secondary">{m.proximas.length}</Badge>
        </div>
        <div className="divide-y divide-border">
          {m.proximas.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/20"
            >
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                  TIPO_COR[o.tipo],
                )}
              >
                {TIPO_LABEL[o.tipo]}
              </span>
              <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{o.numero}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{o.titulo}</span>
              <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                {STATUS_LABEL[o.status]}
              </Badge>
              <span
                className={cn(
                  "hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium md:inline",
                  PRIORIDADE_COR[o.prioridade],
                )}
              >
                {PRIORIDADE_LABEL[o.prioridade]}
              </span>
              {o.impacto === "bloqueia" && (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          ))}
          {m.proximas.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhuma etapa em aberto — fila limpa.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
