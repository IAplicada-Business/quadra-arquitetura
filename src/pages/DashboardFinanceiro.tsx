import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  ComposedChart,
  BarChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  HandCoins,
  Calendar,
  ArrowDown,
  Target,
  FileText,
  Filter,
  BarChart2,
} from "lucide-react";
import { useFinanceiroMetrics, type GrupoValor, type LucroMes, type ProjecaoMes } from "@/hooks/useFinanceiroMetrics";
import { C } from "@/lib/chartColors";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const yFmt = (v: number) => (Math.abs(v) >= 1000 ? `R$${Math.round(v / 1000)}k` : `R$${v}`);

const financeiroConfig: ChartConfig = {
  receita:    { label: "Receita",   color: C.navy    },
  despesa:    { label: "Despesa",   color: C.terra   },
  margem:     { label: "Margem",    color: C.success },
  realizado:  { label: "Realizado", color: C.navy    },
  previsto:   { label: "Previsto",  color: C.navyFaint },
  realizadoD: { label: "Realizado", color: C.terra   },
  previstoD:  { label: "Previsto",  color: "hsl(6, 40%, 80%)" },
  lucro:      { label: "Lucro",     color: C.success },
};

const FIN_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: format(new Date(2024, i, 1), "MMM", { locale: ptBR }),
}));
const FIN_YEARS = [
  String(new Date().getFullYear()),
  String(new Date().getFullYear() - 1),
  String(new Date().getFullYear() - 2),
];

export default function DashboardFinanceiro() {
  const [finYear,  setFinYear]  = useState<string>(String(new Date().getFullYear()));
  const [finMonth, setFinMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"));

  const finPeriod = finYear === "all" ? "all" : finMonth === "all" ? finYear : `${finYear}-${finMonth}`;
  const { data: fm, isLoading } = useFinanceiroMetrics({ period: finPeriod });

  if (isLoading || !fm) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + filtros */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Receitas, despesas e resultado do escritório</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={finYear} onValueChange={(v) => { setFinYear(v); if (v === "all") setFinMonth("all"); }}>
            <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              {FIN_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={finMonth} onValueChange={setFinMonth} disabled={finYear === "all"}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos meses</SelectItem>
              {FIN_MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sub-abas */}
      <Tabs defaultValue="visao_geral">
        <TabsList>
          <TabsTrigger value="visao_geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="graficos" className="flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            Gráficos e Análises
          </TabsTrigger>
        </TabsList>

        {/* ── Visão Geral ─────────────────────────────────────────────────── */}
        <TabsContent value="visao_geral" className="space-y-5 mt-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-5 gap-3">
            <KpiCard
              icon={<Wallet className="h-4 w-4" />}
              label="Receita recebida"
              value={fmt(fm.kpis.receitaMes)}
              variation={fm.kpis.receitaVariation}
              accent={C.navy}
            />
            <KpiCard
              icon={<HandCoins className="h-4 w-4" />}
              label="Receita contratada"
              value={fmt(fm.kpis.receitaContratada)}
              accent={C.success}
              hint="Propostas aprovadas no período"
            />
            <KpiCard
              icon={<Calendar className="h-4 w-4" />}
              label="A receber (30 dias)"
              value={fmt(fm.kpis.aReceber30d)}
              hint={
                fm.kpis.aReceberVencidoCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-red-500">
                    <ArrowDownRight className="h-3 w-3" />
                    {fmt(fm.kpis.aReceberVencido)} vencido{fm.kpis.aReceberVencidoCount > 1 ? "s" : ""} ({fm.kpis.aReceberVencidoCount})
                  </span>
                ) : `${fm.kpis.aReceber30dCount} pagamento(s) pendente(s)`
              }
            />
            <KpiCard
              icon={<ArrowDown className="h-4 w-4" />}
              label="Despesas"
              value={fmt(fm.kpis.despesasMes)}
              variation={fm.kpis.despesaVariation}
              variationInvert
              accent={C.terra}
              hint={
                fm.pendingNFs > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <FileText className="h-3 w-3" />
                    {fm.pendingNFs} NF(s) pendente(s)
                  </span>
                ) : undefined
              }
            />
            <KpiCard
              icon={<Target className="h-4 w-4" />}
              label="Margem líquida"
              value={`${fm.kpis.margemLiquida}%`}
              accent={C.success}
              hint={
                <span>
                  Meta: 60% ·{" "}
                  {fm.kpis.margemLiquida >= 60 ? (
                    <span className="text-emerald-600 font-medium">superada</span>
                  ) : (
                    <span className="text-red-500 font-medium">abaixo da meta</span>
                  )}
                </span>
              }
            />
          </div>

          {/* Próximos recebimentos + DRE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Próximos recebimentos</CardTitle>
              </CardHeader>
              <CardContent>
                {fm.proximosRecebimentos.length > 0 ? (
                  <div className="space-y-2">
                    {fm.proximosRecebimentos.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{r.project}</p>
                          {r.description && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{r.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums">{fmt(r.value)}</span>
                          <Badge variant={r.daysLeft <= 3 ? "destructive" : "outline"} className="text-[10px]">
                            {r.daysLeft}d
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Nenhum recebimento nos próximos 30 dias</p>
                    <Link to="/admin/invoices" className="text-sm font-medium text-primary hover:underline">
                      Registrar pagamento →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">DRE resumido — {fm.periodLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  <DRERow label="Receita bruta" value={fmt(fm.dre.receitaBruta)} />
                  <DRERow label="Despesas operacionais" value={`− ${fmt(fm.dre.despesasOperacionais)}`} className="text-red-500" />
                  <DRERow label={`Impostos estimados (${fm.dre.taxRate}%)`} value={`− ${fmt(fm.dre.impostosEstimados)}`} className="text-red-500" />
                  <Separator className="my-2" />
                  <DRERow label="Resultado líquido" value={fmt(fm.dre.resultadoLiquido)} className="text-emerald-600 text-sm font-semibold" bold />
                  <DRERow label="Margem líquida" value={`${fm.dre.margemLiquida}%`} className="text-emerald-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Receita vs Despesa */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-display">Receita vs Despesa — {fm.periodLabel}</CardTitle>
                <div className="flex items-center gap-3">
                  {[{ label: "Receita", color: C.navy }, { label: "Despesa", color: C.terra }, { label: "Margem", color: C.success }].map((item) => (
                    <div key={item.label} className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={financeiroConfig} className="h-[200px] w-full">
                <ComposedChart data={fm.grafico6m} margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis yAxisId="left" tickFormatter={yFmt} className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} className="text-xs" />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => name === "margem" ? `${value}%` : fmt(Number(value))}
                      />
                    }
                  />
                  <Bar yAxisId="left" dataKey="receita" fill={C.navy}  radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar yAxisId="left" dataKey="despesa" fill={C.terra} radius={[4, 4, 0, 0]} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="margem" stroke={C.success} strokeWidth={2} dot={{ r: 3, fill: C.success }} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Gráficos e Análises ─────────────────────────────────────────── */}
        <TabsContent value="graficos" className="space-y-4 mt-4">
          <GraficosFinanceiros
            receitaPorProjeto={fm.receitaPorProjeto}
            despesaPorCategoria={fm.despesaPorCategoria}
            historicoLucro={fm.historicoLucro}
            projecaoLucro={fm.projecaoLucro}
            periodLabel={fm.periodLabel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Gráficos e Análises tab ──────────────────────────────────────────────────

function GraficosFinanceiros({
  receitaPorProjeto,
  despesaPorCategoria,
  historicoLucro,
  projecaoLucro,
  periodLabel,
}: {
  receitaPorProjeto: GrupoValor[];
  despesaPorCategoria: GrupoValor[];
  historicoLucro: LucroMes[];
  projecaoLucro: ProjecaoMes[];
  periodLabel: string;
}) {
  const receitaConfig: ChartConfig = {
    realizado: { label: "Realizado", color: C.navy },
    previsto:  { label: "Previsto",  color: C.navyFaint },
  };
  const despesaConfig: ChartConfig = {
    realizado: { label: "Realizado", color: C.terra },
    previsto:  { label: "Previsto",  color: "hsl(6, 40%, 80%)" },
  };
  const lucroConfig: ChartConfig = {
    lucro: { label: "Lucro", color: C.success },
  };
  const projecaoConfig: ChartConfig = {
    receita: { label: "Receita",  color: C.navy  },
    despesa: { label: "Despesa",  color: C.terra },
    lucro:   { label: "Lucro",    color: C.success },
  };

  const emptyMsg = (
    <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
      Sem dados no período selecionado
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Row 1: Receita por Projeto + Despesa por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Receita por Projeto — {periodLabel}</CardTitle>
            <p className="text-[11px] text-muted-foreground">Realizado vs. previsto (pendentes)</p>
          </CardHeader>
          <CardContent>
            {receitaPorProjeto.length === 0 ? emptyMsg : (
              <ChartContainer config={receitaConfig} className="h-[200px] w-full">
                <BarChart data={receitaPorProjeto} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={yFmt} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="realizado" name="Realizado" fill={C.navy}      radius={[3, 3, 0, 0]} barSize={14} />
                  <Bar dataKey="previsto"  name="Previsto"  fill={C.navyFaint} radius={[3, 3, 0, 0]} barSize={14} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Despesa por Categoria — {periodLabel}</CardTitle>
            <p className="text-[11px] text-muted-foreground">Realizado vs. previsto (pendentes)</p>
          </CardHeader>
          <CardContent>
            {despesaPorCategoria.length === 0 ? emptyMsg : (
              <ChartContainer config={despesaConfig} className="h-[200px] w-full">
                <BarChart data={despesaPorCategoria} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={yFmt} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="realizado" name="Realizado" fill={C.terra}            radius={[3, 3, 0, 0]} barSize={14} />
                  <Bar dataKey="previsto"  name="Previsto"  fill="hsl(6, 40%, 80%)"  radius={[3, 3, 0, 0]} barSize={14} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Histórico 12m + Projeção 6m */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Histórico de Lucro — 12 meses</CardTitle>
            <p className="text-[11px] text-muted-foreground">Lucro líquido mensal (receita − despesas − impostos)</p>
          </CardHeader>
          <CardContent>
            {historicoLucro.every((m) => m.lucro === 0) ? emptyMsg : (
              <ChartContainer config={lucroConfig} className="h-[200px] w-full">
                <BarChart data={historicoLucro} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={yFmt} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                  <Bar dataKey="lucro" name="Lucro" radius={[3, 3, 0, 0]} barSize={16}>
                    {historicoLucro.map((entry, i) => (
                      <Cell key={i} fill={entry.lucro >= 0 ? C.success : C.terra} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Projeção — próximos 6 meses</CardTitle>
            <p className="text-[11px] text-muted-foreground">Baseado em pagamentos pendentes cadastrados</p>
          </CardHeader>
          <CardContent>
            {projecaoLucro.every((m) => m.receita === 0 && m.despesa === 0) ? (
              <div className="flex flex-col items-center justify-center h-[180px] text-center gap-2">
                <BarChart2 className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Sem pagamentos futuros cadastrados</p>
                <Link to="/financeiro/lancamentos" className="text-xs font-medium text-primary hover:underline">
                  Adicionar lançamentos →
                </Link>
              </div>
            ) : (
              <ChartContainer config={projecaoConfig} className="h-[200px] w-full">
                <BarChart data={projecaoLucro} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={yFmt} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="receita" name="Receita Prevista" fill={C.navyFaint} radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="despesa" name="Despesa Prevista" fill="hsl(6, 40%, 80%)" radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="lucro"   name="Lucro Projetado"  radius={[3, 3, 0, 0]} barSize={10}>
                    {projecaoLucro.map((entry, i) => (
                      <Cell key={i} fill={entry.lucro >= 0 ? C.success : C.terra} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, variation, variationSuffix = "%", variationInvert = false, accent, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variation?: number;
  variationSuffix?: string;
  variationInvert?: boolean;
  accent?: string;
  hint?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden min-w-0">
      {accent && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />}
      <CardContent className="pt-5 pb-4 min-w-0">
        {/* R5: card encolhe, rótulo trunca, número espreme com clamp(). */}
        <div className="flex items-center gap-2 text-muted-foreground mb-2 min-w-0">
          <span className="shrink-0">{icon}</span>
          <span className="label-cat truncate">{label}</span>
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="font-bold tabular-nums truncate"
            style={{ fontSize: "clamp(20px, 2.2vw, 30px)" }}
          >
            {value}
          </span>
          {variation !== undefined && <VariationBadge value={variation} suffix={variationSuffix} invert={variationInvert} />}
        </div>
        {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function VariationBadge({ value, invert = false, suffix = "%" }: { value: number; invert?: boolean; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = invert ? value < 0 : value > 0;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
      {value > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {value > 0 ? "+" : ""}{value}{suffix}
    </span>
  );
}

function DRERow({ label, value, className = "", bold = false }: { label: string; value: string; className?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className={`text-xs ${bold ? "font-semibold" : ""} text-muted-foreground`}>{label}</span>
      <span className={`text-xs tabular-nums ${bold ? "font-semibold text-sm" : ""} ${className}`}>{value}</span>
    </div>
  );
}
