import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowUpRight,
  ArrowDownRight,
  Users,
  TrendingUp,
  Clock,
  Send,
  HandCoins,
  XCircle,
  Filter,
  Handshake,
  Star,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { useComercialMetrics, PERIOD_LABELS, ORIGIN_OPTIONS, PROJECT_TYPE_OPTIONS, type ComercialPeriod } from "@/hooks/useComercialMetrics";
import { useChannelMetrics, type ChannelMetric } from "@/hooks/useChannelMetrics";
import { usePartnerMetrics } from "@/hooks/usePartnerMetrics";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { MonthlyStackedChart } from "@/components/dashboard/MonthlyStackedChart";
import { C } from "@/lib/chartColors";
import Reports from "@/pages/Reports";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

type Funil = "comercial" | "parceiros";

/**
 * Dashboard Comercial — uma estrutura só para os dois funis. O filtro
 * "Funil" troca a fonte (leads comerciais ou indicações de parceiros) e
 * a página mantém a mesma ordem: filtros → KPIs → funil → dois blocos
 * lado a lado → distribuição. Antes Comercial e Parceiros eram abas
 * separadas, e a de parceiros não tinha nenhum gráfico.
 */
export default function DashboardEscritorio() {
  const [tab, setTab] = useState<DashTab>("dashboard");
  const [funil, setFunil] = useState<Funil>("comercial");

  const [cmPeriod, setCmPeriod] = useState<ComercialPeriod>("mes_atual");
  const [cmOrigin, setCmOrigin] = useState("todos");
  const [cmType,   setCmType]   = useState("todos");

  const comercial = useComercialMetrics({ period: cmPeriod, origin: cmOrigin, projectType: cmType });
  const channelMetrics = useChannelMetrics();
  // Parceiros só busca quando o filtro está em "Parceiros" (evita 2
  // queries a mais em toda visita, já que "Comercial" é o padrão).
  const partnerMetrics = usePartnerMetrics(tab === "dashboard" && funil === "parceiros", cmPeriod);

  const isParceiros = funil === "parceiros";
  const loading = isParceiros ? partnerMetrics.isLoading || !partnerMetrics.data : comercial.isLoading || !comercial.data;
  const cm = comercial.data;
  const pm = partnerMetrics.data;

  return (
    <div className="space-y-5">
      <SegmentedTabs tab={tab} onChange={setTab} />

      {tab === "dashboard" && (
        <div className="space-y-4">
          {/* Filtros — "Funil" primeiro: decide o resto da página */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={funil} onValueChange={(v) => setFunil(v as Funil)}>
              <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs" aria-label="Funil"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comercial">Funil comercial</SelectItem>
                <SelectItem value="parceiros">Funil de parceiros</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cmPeriod} onValueChange={(v) => setCmPeriod(v as ComercialPeriod)}>
              <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs" aria-label="Período"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(PERIOD_LABELS) as [ComercialPeriod, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isParceiros && (
              <>
                <Select value={cmOrigin} onValueChange={setCmOrigin}>
                  <SelectTrigger className="h-8 w-full sm:w-[150px] text-xs" aria-label="Origem"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORIGIN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={cmType} onValueChange={setCmType}>
                  <SelectTrigger className="h-8 w-full sm:w-[150px] text-xs" aria-label="Tipo de projeto"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6"><div className="h-16 bg-muted rounded" /></CardContent>
                </Card>
              ))}
            </div>
          ) : !isParceiros && cm ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard icon={<Users className="h-4 w-4" />} label="Leads no período" value={String(cm.kpis.leadsThisMonth)} variation={cmPeriod === "mes_atual" ? cm.kpis.leadsVariation : undefined} />
                <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Taxa de conversão" value={`${cm.kpis.taxaConversao}%`} variation={cmPeriod === "mes_atual" ? cm.kpis.taxaVariation : undefined} variationSuffix="pp" />
                <KpiCard icon={<HandCoins className="h-4 w-4" />} label="Receita fechada" value={fmt(cm.kpis.receitaFechada)} accent={C.success} />
                <KpiCard icon={<Clock className="h-4 w-4" />} label="Tempo médio fechamento" value={`${cm.kpis.tempoMedioFechamento}d`} />
                <KpiCard icon={<Send className="h-4 w-4" />} label="Propostas aguardando" value={String(cm.kpis.proposalsAguardando)} badge={cm.kpis.hasUrgent ? { label: "+7d", variant: "destructive" } : undefined} />
                <KpiCard icon={<XCircle className="h-4 w-4" />} label="Perdidos no período" value={String(cm.kpis.leadsPerdidos)} accent={cm.kpis.leadsPerdidos > 0 ? C.danger : undefined} />
              </div>

              {/* Funil — logo abaixo dos cards */}
              <SectionCard
                title={`Funil comercial — ${PERIOD_LABELS[cmPeriod]}`}
                right={
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Conversão total: <strong className="text-foreground tabular-nums">{cm.conversaoTotal}%</strong></span>
                    <span>Ticket médio: <strong className="text-foreground tabular-nums">{fmt(cm.ticketMedio)}</strong></span>
                  </div>
                }
              >
                <FunnelChart funnel={{ stages: cm.funil, rates: cm.funnelRates, total: cm.conversaoTotal }} />
              </SectionCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionCard title="Pipeline — últimos 6 meses" subtitle="Leads por situação, no mês em que entraram (fechados: mês do fechamento)">
                  <MonthlyStackedChart data={cm.pipeline6m} />
                </SectionCard>

                <SectionCard title="Propostas em aberto">
                  {cm.propostasAbertas.length > 0 ? (
                    <div className="space-y-2">
                      {cm.propostasAbertas.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.leadName}</p>
                            <p className="text-[11px] text-muted-foreground">Enviada há {p.daysSinceSent} dias</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold tabular-nums">{fmt(p.value)}</span>
                            <Badge variant="outline" className={`text-[10px] ${p.urgencyColor}`}>{p.urgencyLabel}</Badge>
                          </div>
                        </div>
                      ))}
                      <Separator className="my-2" />
                      <div className="flex justify-end">
                        <span className="text-xs text-muted-foreground">Total em negociação: <strong>{fmt(cm.totalEmNegociacao)}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma proposta enviada no momento.</p>
                  )}
                </SectionCard>
              </div>

              {/* Canais de Aquisição (mantido) */}
              <SectionCard title={`Canais de aquisição — últimos ${channelMetrics.windowDays} dias`}>
                {channelMetrics.isLoading ? (
                  <div className="h-32 animate-pulse bg-muted rounded" />
                ) : channelMetrics.data && channelMetrics.data.length > 0 ? (
                  <Tabs defaultValue="leads">
                    <TabsList className="mb-3">
                      <TabsTrigger value="leads">Leads</TabsTrigger>
                      <TabsTrigger value="conversao">Conversão</TabsTrigger>
                      <TabsTrigger value="ticket">Ticket médio</TabsTrigger>
                    </TabsList>
                    <TabsContent value="leads" className="space-y-2">
                      <ChannelBars metrics={channelMetrics.data} valueOf={(m) => m.leadCount} formatValue={(v) => String(v)} />
                    </TabsContent>
                    <TabsContent value="conversao" className="space-y-2">
                      <ChannelBars metrics={channelMetrics.data} valueOf={(m) => m.conversionRate} formatValue={(v) => `${v}%`} />
                    </TabsContent>
                    <TabsContent value="ticket" className="space-y-2">
                      <ChannelBars metrics={channelMetrics.data} valueOf={(m) => m.ticketMedio} formatValue={fmt} />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Nenhum lead com canal registrado nos últimos {channelMetrics.windowDays} dias.
                  </p>
                )}
              </SectionCard>
            </>
          ) : isParceiros && pm ? (
            <>
              {/* KPIs — mesma faixa de 6 do comercial */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard icon={<Handshake className="h-4 w-4" />} label="Total de parceiros" value={String(pm.totalParceiros)} />
                <KpiCard icon={<Star className="h-4 w-4" />} label="Parceiros ativos" value={String(pm.parceirosAtivos)} accent={C.success} />
                <KpiCard icon={<Send className="h-4 w-4" />} label="Indicações no período" value={String(pm.indicacoesNoPeriodo)} />
                <KpiCard icon={<UserCheck className="h-4 w-4" />} label="Parceiros que indicaram" value={String(pm.parceirosQueIndicaram)} />
                <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Indicações fechadas" value={String(pm.indicacoesFechadas)} accent={pm.indicacoesFechadas > 0 ? C.success : undefined} />
                <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Conversão das indicações" value={`${pm.taxaConversaoIndicacoes}%`} />
              </div>

              <SectionCard
                title={`Funil de indicações — ${PERIOD_LABELS[cmPeriod]}`}
                subtitle="Leads comerciais que chegaram por um parceiro"
                right={
                  <span className="text-xs text-muted-foreground">
                    Conversão total: <strong className="text-foreground tabular-nums">{pm.funil.total}%</strong>
                  </span>
                }
              >
                {pm.funil.stages[0].count > 0 ? (
                  <FunnelChart funnel={pm.funil} />
                ) : (
                  <EmptyPartners text="Nenhuma indicação de parceiro no período" />
                )}
              </SectionCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SectionCard title="Indicações — últimos 6 meses" subtitle="Situação atual das indicações, no mês em que entraram">
                  <MonthlyStackedChart
                    data={pm.indicacoes6m}
                    labels={{ fechados: "Fechadas", propostas: "Com proposta", em_andamento: "Em andamento" }}
                  />
                </SectionCard>

                <SectionCard title="Top parceiros por indicações" subtitle={PERIOD_LABELS[cmPeriod]}>
                  {pm.topParceiros.length > 0 ? (
                    <RankBars items={pm.topParceiros.map((p) => ({ key: p.partnerId, label: p.name, value: p.count, to: `/partners/${p.partnerId}` }))} />
                  ) : (
                    <EmptyPartners text="Nenhuma indicação de parceiro no período" />
                  )}
                </SectionCard>
              </div>

              <SectionCard title="Parceiros por etapa" subtitle="Onde cada parceiro está no pipeline de parceiros">
                {pm.totalParceiros > 0 ? (
                  <RankBars items={pm.porEtapa.map((e) => ({ key: e.stage, label: e.label, value: e.count }))} />
                ) : (
                  <EmptyPartners text="Nenhum parceiro cadastrado ainda" />
                )}
              </SectionCard>
            </>
          ) : null}
        </div>
      )}

      {tab === "relatorios" && <Reports />}
    </div>
  );
}

function EmptyPartners({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Handshake className="h-10 w-10 text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground mb-2">{text}</p>
      <Link to="/partners/pipeline" className="text-sm font-medium text-primary hover:underline">Ver Pipeline de Parceiros →</Link>
    </div>
  );
}

/* ── helpers ── */

function ChannelBars({
  metrics,
  valueOf,
  formatValue,
}: {
  metrics: ChannelMetric[];
  valueOf: (m: ChannelMetric) => number;
  formatValue: (v: number) => string;
}) {
  const maxValue = Math.max(...metrics.map(valueOf), 1);
  return (
    <div className="space-y-2">
      {metrics.map((m) => {
        const value = valueOf(m);
        const widthPct = Math.max(4, (value / maxValue) * 100);
        return (
          <div key={m.channelId ?? "sem-canal"} className="flex items-center gap-3">
            <div className="w-32 sm:w-40 shrink-0 flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
              <span className="truncate font-medium text-foreground">{m.name}</span>
            </div>
            <div className="flex-1 relative h-7 rounded-md overflow-hidden bg-muted/40">
              <div
                className="absolute inset-y-0 left-0 transition-all rounded-md"
                style={{ width: `${widthPct}%`, background: `${m.color}30`, borderLeft: `3px solid ${m.color}` }}
              />
              <div className="absolute inset-0 flex items-center px-3">
                <span className="text-xs font-semibold tabular-nums" style={{ color: m.color }}>{formatValue(value)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type DashTab = "dashboard" | "relatorios";

const TAB_LABELS: Record<DashTab, string> = {
  dashboard:  "Dashboard",
  relatorios: "Relatórios",
};

function SegmentedTabs({ tab, onChange }: { tab: DashTab; onChange: (t: DashTab) => void }) {
  return (
    <div className="inline-flex p-1 bg-muted/50 rounded-lg">
      {(["dashboard", "relatorios"] as const).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-5 py-1.5 text-sm font-medium rounded-md transition-all ${
            tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {TAB_LABELS[t]}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base font-display">{title}</CardTitle>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Barras horizontais simples (ranking/distribuição), no estilo dos canais. */
function RankBars({ items }: { items: { key: string; label: string; value: number; to?: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const row = (
          <>
            <div className="w-32 sm:w-40 shrink-0 text-xs font-medium text-foreground truncate group-hover:underline">{it.label}</div>
            <div className="flex-1 relative h-7 rounded-md overflow-hidden bg-muted/40">
              <div
                className="absolute inset-y-0 left-0 transition-all rounded-r-[4px]"
                style={{ width: `${it.value > 0 ? Math.max(4, (it.value / max) * 100) : 0}%`, background: `${C.navy}30`, borderLeft: `3px solid ${C.navy}` }}
              />
              <div className="absolute inset-0 flex items-center px-3">
                <span className="text-xs font-semibold tabular-nums text-foreground">{it.value}</span>
              </div>
            </div>
          </>
        );
        return it.to ? (
          <Link key={it.key} to={it.to} className="flex items-center gap-3 group">{row}</Link>
        ) : (
          <div key={it.key} className="flex items-center gap-3">{row}</div>
        );
      })}
    </div>
  );
}

function KpiCard({
  icon, label, value, variation, variationSuffix = "%", variationInvert = false, accent, badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  variation?: number;
  variationSuffix?: string;
  variationInvert?: boolean;
  accent?: string;
  badge?: { label: string; variant?: "default" | "destructive" | "outline" };
}) {
  return (
    <Card className="relative overflow-hidden min-w-0">
      {accent && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />}
      <CardContent className="pt-5 pb-4 min-w-0">
        {/* R5: o card encolhe (min-w-0) e o rótulo trunca em vez de quebrar
            linha, para a faixa caber sempre numa linha só. */}
        <div className="flex items-center gap-2 text-muted-foreground mb-2 min-w-0">
          <span className="shrink-0">{icon}</span>
          <span className="label-cat truncate">{label}</span>
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          {/* R5: o número espreme com clamp() em vez de empurrar o card. */}
          <span
            className="font-bold tabular-nums truncate"
            style={{ fontSize: "clamp(20px, 2.2vw, 30px)" }}
          >
            {value}
          </span>
          {variation !== undefined && <VariationBadge value={variation} suffix={variationSuffix} invert={variationInvert} />}
          {badge && <Badge variant={badge.variant ?? "outline"} className="text-[10px] px-1.5 py-0">{badge.label}</Badge>}
        </div>
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
