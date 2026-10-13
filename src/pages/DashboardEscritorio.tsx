import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
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
} from "lucide-react";
import { useComercialMetrics, PERIOD_LABELS, ORIGIN_OPTIONS, PROJECT_TYPE_OPTIONS, type ComercialPeriod } from "@/hooks/useComercialMetrics";
import { useChannelMetrics, type ChannelMetric } from "@/hooks/useChannelMetrics";
import { usePartnerMetrics } from "@/hooks/usePartnerMetrics";
import { C } from "@/lib/chartColors";
import Reports from "@/pages/Reports";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const pipelineConfig: ChartConfig = {
  fechados:     { label: "Fechados",     color: C.navy      },
  propostas:    { label: "Propostas",    color: C.terra     },
  em_andamento: { label: "Em andamento", color: C.navyFaint },
};

function oportBorderColor(days: number) {
  if (days >= 7) return C.danger;
  if (days >= 3) return C.warning;
  return C.success;
}

export default function DashboardEscritorio() {
  const [tab, setTab] = useState<"comercial" | "parceiros" | "relatorios">("comercial");

  const [cmPeriod, setCmPeriod] = useState<ComercialPeriod>("mes_atual");
  const [cmOrigin, setCmOrigin] = useState("todos");
  const [cmType,   setCmType]   = useState("todos");

  const comercial = useComercialMetrics({ period: cmPeriod, origin: cmOrigin, projectType: cmType });
  const channelMetrics = useChannelMetrics();
  // Métricas de parceiros são isoladas do comercial — hook próprio, sem
  // filtro de período/origem/tipo compartilhado com `comercial`. Só
  // busca quando a aba é aberta (evita 2 queries a mais em toda visita
  // ao dashboard, já que "Comercial" é a aba default).
  const partnerMetrics = usePartnerMetrics(tab === "parceiros");

  if (comercial.isLoading) {
    return (
      <div className="space-y-5">
        <SegmentedTabs tab={tab} onChange={setTab} />
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6"><div className="h-16 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const cm = comercial.data;

  return (
    <div className="space-y-5">
      <SegmentedTabs tab={tab} onChange={setTab} />

      {/* ═══════════════════ ABA COMERCIAL ═══════════════════ */}
      {tab === "comercial" && cm && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={cmPeriod} onValueChange={(v) => setCmPeriod(v as ComercialPeriod)}>
              <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(PERIOD_LABELS) as [ComercialPeriod, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cmOrigin} onValueChange={setCmOrigin}>
              <SelectTrigger className="h-8 w-full sm:w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGIN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cmType} onValueChange={setCmType}>
              <SelectTrigger className="h-8 w-full sm:w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Funil */}
          <Card>
            <CardContent className="pt-5 pb-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Funil comercial — {PERIOD_LABELS[cmPeriod]}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Conversão total: <strong className="text-foreground tabular-nums">{cm.conversaoTotal}%</strong></span>
                  <span>Ticket médio: <strong className="text-foreground tabular-nums">{fmt(cm.ticketMedio)}</strong></span>
                </div>
              </div>
              {(() => {
                const maxCount = Math.max(...cm.funil.map((s) => s.count), 1);
                return (
                  <div className="space-y-2">
                    {cm.funil.map((stage, i) => {
                      const widthPct = Math.max(8, (stage.count / maxCount) * 100);
                      const conversionFromPrev = i > 0 ? cm.funnelRates[i - 1] : null;
                      return (
                        <div key={stage.label} className="flex items-center gap-3">
                          <div className="w-28 sm:w-32 shrink-0 text-xs">
                            <p className="font-medium text-foreground">{stage.label}</p>
                            {conversionFromPrev != null && (
                              <p className="text-[10px] text-muted-foreground">{conversionFromPrev}% da etapa anterior</p>
                            )}
                          </div>
                          <div className="flex-1 relative h-9 rounded-md overflow-hidden bg-muted/40">
                            <div
                              className="absolute inset-y-0 left-0 transition-all"
                              style={{
                                width: `${widthPct}%`,
                                background: `linear-gradient(90deg, ${stage.color}25 0%, ${stage.color}40 100%)`,
                                borderLeft: `3px solid ${stage.color}`,
                              }}
                            />
                            <div className="absolute inset-0 flex items-center px-3 gap-2">
                              <span className="text-lg font-display tabular-nums" style={{ color: stage.color }}>{stage.count}</span>
                              {stage.count > 0 && cm.funil[0].count > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({Math.round((stage.count / cm.funil[0].count) * 100)}% do topo)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={<Users className="h-4 w-4" />} label="Leads no período" value={String(cm.kpis.leadsThisMonth)} variation={cmPeriod === "mes_atual" ? cm.kpis.leadsVariation : undefined} />
            <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Taxa de conversão" value={`${cm.kpis.taxaConversao}%`} variation={cmPeriod === "mes_atual" ? cm.kpis.taxaVariation : undefined} variationSuffix="pp" />
            <KpiCard icon={<HandCoins className="h-4 w-4" />} label="Receita fechada" value={fmt(cm.kpis.receitaFechada)} accent={C.success} />
            <KpiCard icon={<Clock className="h-4 w-4" />} label="Tempo médio fechamento" value={`${cm.kpis.tempoMedioFechamento}d`} />
            <KpiCard icon={<Send className="h-4 w-4" />} label="Propostas aguardando" value={String(cm.kpis.proposalsAguardando)} badge={cm.kpis.hasUrgent ? { label: "+7d", variant: "destructive" } : undefined} />
            <KpiCard icon={<XCircle className="h-4 w-4" />} label="Perdidos no período" value={String(cm.kpis.leadsPerdidos)} accent={cm.kpis.leadsPerdidos > 0 ? C.danger : undefined} />
          </div>

          {/* Oportunidades + Propostas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base font-display">Oportunidades quentes</CardTitle></CardHeader>
              <CardContent>
                {cm.oportunidades.length > 0 ? (
                  <div className="space-y-2">
                    {cm.oportunidades.map((o) => (
                      <div key={o.leadId} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderLeftWidth: 3, borderLeftColor: oportBorderColor(o.daysSinceContact) }}>
                        <p className="text-sm font-medium">{o.leadName}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]" style={{ color: oportBorderColor(o.daysSinceContact) }}>{o.daysSinceContact}d sem contato</Badge>
                          <span className="text-sm font-semibold tabular-nums">{fmt(o.proposalValue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Nenhuma oportunidade no momento</p>
                    <Link to="/leads/pipeline" className="text-sm font-medium text-primary hover:underline">Adicionar lead →</Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base font-display">Propostas em aberto</CardTitle></CardHeader>
              <CardContent>
                {cm.propostasAbertas.length > 0 ? (
                  <div className="space-y-2">
                    {cm.propostasAbertas.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{p.leadName}</p>
                          <p className="text-[11px] text-muted-foreground">Enviada há {p.daysSinceSent} dias</p>
                        </div>
                        <div className="flex items-center gap-2">
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
              </CardContent>
            </Card>
          </div>

          {/* Pipeline 6 meses */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-display">Pipeline — últimos 6 meses</CardTitle>
                <div className="flex items-center gap-3">
                  {[{ label: "Fechados", color: C.navy }, { label: "Propostas", color: C.terra }, { label: "Em andamento", color: C.navyFaint }].map((item) => (
                    <div key={item.label} className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={pipelineConfig} className="h-[200px] w-full">
                <BarChart data={cm.pipeline6m} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="fechados"     stackId="a" fill={C.navy}      radius={[0, 0, 0, 0]} />
                  <Bar dataKey="propostas"    stackId="a" fill={C.terra} />
                  <Bar dataKey="em_andamento" stackId="a" fill={C.navyFaint} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Canais de Aquisição */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">Canais de aquisição — últimos {channelMetrics.windowDays} dias</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════ ABA PARCEIROS ═══════════════════ */}
      {tab === "parceiros" && (
        <div className="space-y-4">
          {partnerMetrics.isLoading || !partnerMetrics.data ? (
            <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6"><div className="h-16 bg-muted rounded" /></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4 gap-3">
                <KpiCard icon={<Handshake className="h-4 w-4" />} label="Total de parceiros" value={String(partnerMetrics.data.totalParceiros)} />
                <KpiCard icon={<Star className="h-4 w-4" />} label="Parceiros ativos" value={String(partnerMetrics.data.parceirosAtivos)} accent={C.success} />
                <KpiCard icon={<Send className="h-4 w-4" />} label="Indicações no mês" value={String(partnerMetrics.data.indicacoesNoMes)} />
                <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Conversão das indicações" value={`${partnerMetrics.data.taxaConversaoIndicacoes}%`} />
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-display">Top parceiros por volume de indicações</CardTitle>
                </CardHeader>
                <CardContent>
                  {partnerMetrics.data.topParceiros.length > 0 ? (
                    <div className="space-y-2">
                      {(() => {
                        const maxCount = Math.max(...partnerMetrics.data.topParceiros.map((p) => p.count), 1);
                        return partnerMetrics.data.topParceiros.map((p) => (
                          <Link key={p.partnerId} to={`/partners/${p.partnerId}`} className="flex items-center gap-3 group">
                            <div className="w-32 sm:w-40 shrink-0 text-xs font-medium text-foreground truncate group-hover:underline">{p.name}</div>
                            <div className="flex-1 relative h-7 rounded-md overflow-hidden bg-muted/40">
                              <div
                                className="absolute inset-y-0 left-0 transition-all rounded-md"
                                style={{ width: `${Math.max(4, (p.count / maxCount) * 100)}%`, background: `${C.navy}30`, borderLeft: `3px solid ${C.navy}` }}
                              />
                              <div className="absolute inset-0 flex items-center px-3">
                                <span className="text-xs font-semibold tabular-nums" style={{ color: C.navy }}>{p.count}</span>
                              </div>
                            </div>
                          </Link>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Handshake className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">Nenhuma indicação de parceiro registrada ainda</p>
                      <Link to="/partners/pipeline" className="text-sm font-medium text-primary hover:underline">Ver Pipeline de Parceiros →</Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════ ABA RELATÓRIOS ═══════════════════ */}
      {tab === "relatorios" && <Reports />}
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

const TAB_LABELS: Record<"comercial" | "parceiros" | "relatorios", string> = {
  comercial:  "Comercial",
  parceiros:  "Parceiros",
  relatorios: "Relatórios",
};

function SegmentedTabs({ tab, onChange }: { tab: "comercial" | "parceiros" | "relatorios"; onChange: (t: "comercial" | "parceiros" | "relatorios") => void }) {
  return (
    <div className="inline-flex p-1 bg-muted/50 rounded-lg">
      {(["comercial", "parceiros", "relatorios"] as const).map((t) => (
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
