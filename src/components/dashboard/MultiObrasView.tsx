import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  CalendarOff,
  CalendarRange,
  CheckCircle2,
  HardHat,
  Truck,
  Users,
  Gauge,
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProgressRing } from "@/components/visual/ProgressRing";
import { C } from "@/lib/chartColors";
import type { MultiObrasData, Ritmo } from "@/lib/multiObras";

/** Estado de cada obra: cor reservada de status, sempre com ícone e texto. */
const RITMO: Record<Ritmo, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  no_ritmo:       { label: "No ritmo",       color: C.success, icon: CheckCircle2 },
  atencao:        { label: "Atenção",        color: C.warning, icon: AlertTriangle },
  atrasada:       { label: "Atrasada",       color: C.danger,  icon: AlertCircle },
  sem_cronograma: { label: "Sem cronograma", color: "hsl(var(--muted-foreground))", icon: CalendarOff },
};

function RitmoPill({ ritmo }: { ritmo: Ritmo }) {
  const r = RITMO[ritmo];
  const Icon = r.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap text-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: r.color }} aria-hidden />
      {r.label}
    </span>
  );
}

function KpiTile({ icon, label, value, hint, extra }: { icon: React.ReactNode; label: string; value: string; hint?: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardContent className="pt-5 pb-4 min-w-0 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-2 min-w-0">
            <span className="shrink-0">{icon}</span>
            <span className="label-cat truncate">{label}</span>
          </div>
          <p className="font-bold tabular-nums truncate" style={{ fontSize: "clamp(20px, 2.2vw, 30px)" }}>{value}</p>
          {hint && <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div>}
        </div>
        {extra}
      </CardContent>
    </Card>
  );
}

function SectionCard({ icon, title, subtitle, right, children, className }: {
  icon: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={`min-w-0 ${className ?? ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <span style={{ color: C.navy }}>{icon}</span>
              {title}
            </CardTitle>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-primary/30 mb-3">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/**
 * Visão Multi-obras do Dashboard Obras, no mesmo padrão visual da Visão
 * geral: faixa de indicadores, ritmo de cada obra (real x esperado),
 * conflitos de agenda, linha do tempo comparativa, mapa e carga dos
 * fornecedores.
 */
export function MultiObrasView({ data }: { data: MultiObrasData }) {
  const { obras, contagemRitmo, conflitos, carga, timeline, suppliers, matrix, activeProjects } = data;
  const emRisco = contagemRitmo.atrasada + contagemRitmo.atencao;
  const comCrono = obras.filter((o) => o.ritmo !== "sem_cronograma");
  const maxCarga = Math.max(...carga.map((c) => c.obras), 1);

  if (activeProjects.length === 0) {
    return (
      <Card>
        <CardContent>
          <Empty icon={<HardHat className="h-12 w-12" />} text="Nenhuma obra ativa com esses filtros" />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-5">
        {/* ── Indicadores ── */}
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4 gap-3">
          <KpiTile
            icon={<HardHat className="h-4 w-4" />}
            label="Obras ativas"
            value={String(activeProjects.length)}
            hint={`${comCrono.length} com cronograma`}
          />
          <KpiTile
            icon={<Gauge className="h-4 w-4" />}
            label="Progresso médio"
            value={`${data.progressoMedio}%`}
            hint="atividades concluídas"
            extra={<ProgressRing value={data.progressoMedio} size={48} thickness={5} color={C.navy} label={`${data.progressoMedio}% concluído`} />}
          />
          <KpiTile
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Obras fora do ritmo"
            value={String(emRisco)}
            hint={
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1"><b className="text-foreground tabular-nums">{contagemRitmo.atrasada}</b> <RitmoPill ritmo="atrasada" /></span>
                <span className="inline-flex items-center gap-1"><b className="text-foreground tabular-nums">{contagemRitmo.atencao}</b> <RitmoPill ritmo="atencao" /></span>
              </span>
            }
          />
          <KpiTile
            icon={<Truck className="h-4 w-4" />}
            label="Conflitos de fornecedor"
            value={String(conflitos.length)}
            hint={`${suppliers.length} fornecedores alocados`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Ritmo das obras ── */}
          <SectionCard
            className="lg:col-span-2"
            icon={<Gauge className="h-4 w-4" />}
            title="Ritmo das obras"
            subtitle="Atividades concluídas x onde a obra deveria estar pelo calendário"
            right={
              <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: C.navy }} /> Realizado</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 rounded" style={{ backgroundColor: C.terra }} /> Esperado hoje</span>
              </div>
            }
          >
            <ul className="space-y-3">
              {obras.map((o) => (
                <li key={o.projectId}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={`/projects/${o.projectId}`}
                        className="grid grid-cols-1 sm:grid-cols-[minmax(0,190px)_1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 min-w-0 text-sm">
                            {o.number && <span className="font-mono text-xs text-muted-foreground shrink-0">{o.number}</span>}
                            <span className="truncate font-medium">{o.name}</span>
                          </span>
                          <RitmoPill ritmo={o.ritmo} />
                        </span>
                        <span className="relative h-3 w-full rounded-[4px]" style={{ backgroundColor: C.navyBg }}>
                          <span
                            className="absolute inset-y-0 left-0 rounded-[4px]"
                            style={{ width: `${o.progress}%`, backgroundColor: C.navy, minWidth: o.progress > 0 ? 3 : 0 }}
                          />
                          {o.ritmo !== "sem_cronograma" && (
                            <span
                              className="absolute -top-1 -bottom-1 w-0.5 rounded"
                              style={{ left: `calc(${o.expected}% - 1px)`, backgroundColor: C.terra, boxShadow: "0 0 0 2px hsl(var(--card))" }}
                            />
                          )}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground sm:text-right whitespace-nowrap">
                          <span className="font-semibold text-foreground">{o.progress}%</span>
                          {o.ritmo !== "sem_cronograma" && <> · esperado {o.expected}%</>}
                        </span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-medium">{o.number ? `${o.number} · ` : ""}{o.name}</p>
                      <p className="text-xs">Realizado: {o.progress}% das atividades</p>
                      {o.ritmo !== "sem_cronograma" && <p className="text-xs">Esperado hoje: {o.expected}% do prazo</p>}
                      {o.start && o.end && <p className="text-xs">{format(o.start, "dd/MM/yy")} → {format(o.end, "dd/MM/yy")}</p>}
                      {o.nextDelivery && <p className="text-xs">Próxima: {o.nextDelivery}</p>}
                    </TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* ── Conflitos de agenda ── */}
          <SectionCard
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Conflitos de agenda"
            subtitle="Fornecedor em mais de uma obra na mesma semana"
          >
            {conflitos.length > 0 ? (
              <ul className="space-y-2">
                {conflitos.map((c) => (
                  <li key={c.supplier} className="rounded-lg border p-3" style={{ borderLeftWidth: 3, borderLeftColor: C.warning }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{c.supplier}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">{c.weeks.length} sem.</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.projectNames.join(" · ")}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{c.weeks.slice(0, 6).join(", ")}{c.weeks.length > 6 ? "…" : ""}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={<CheckCircle2 className="h-10 w-10" />} text="Nenhum fornecedor em duas obras na mesma semana" />
            )}
          </SectionCard>
        </div>

        {/* ── Linha do tempo comparativa ── */}
        <SectionCard
          icon={<CalendarRange className="h-4 w-4" />}
          title="Linha do tempo comparativa"
          subtitle="Prazo de cada obra pelo cronograma; o preenchimento é o que já foi concluído"
        >
          {timeline.start && obras.some((o) => o.start && o.end) ? (
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* régua de meses */}
                <div className="grid grid-cols-[170px_1fr_48px] gap-3 mb-1">
                  <span />
                  <div className="relative h-5">
                    {timeline.months.map((m) => (
                      <span key={m.label} className="absolute text-[10px] text-muted-foreground -translate-x-1/2 whitespace-nowrap" style={{ left: `${m.leftPct}%` }}>
                        {m.label}
                      </span>
                    ))}
                  </div>
                  <span />
                </div>
                <div className="relative">
                  {/* grade dos meses + hoje, atrás das barras */}
                  <div className="absolute inset-0 grid grid-cols-[170px_1fr_48px] gap-3 pointer-events-none">
                    <span />
                    <div className="relative">
                      {timeline.months.map((m) => (
                        <span key={m.label} className="absolute inset-y-0 w-px bg-border/60" style={{ left: `${m.leftPct}%` }} />
                      ))}
                      {timeline.todayPct != null && (
                        <span className="absolute -top-1 bottom-0 w-0.5 rounded" style={{ left: `${timeline.todayPct}%`, backgroundColor: C.terra }}>
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-foreground whitespace-nowrap">Hoje</span>
                        </span>
                      )}
                    </div>
                    <span />
                  </div>
                  <ul className="relative space-y-2 py-1">
                    {obras.filter((o) => o.start && o.end).map((o) => (
                      <li key={o.projectId} className="grid grid-cols-[170px_1fr_48px] gap-3 items-center">
                        <Link to={`/projects/${o.projectId}`} className="text-sm font-medium truncate hover:underline" title={o.name}>
                          {o.name}
                        </Link>
                        <div className="relative h-6">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute inset-y-0 rounded-[4px] overflow-hidden cursor-default"
                                style={{ left: `${o.leftPct}%`, width: `${o.widthPct}%`, backgroundColor: C.navyFaint }}
                              >
                                <div className="h-full" style={{ width: `${o.progress}%`, backgroundColor: C.navy }} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{o.name}</p>
                              <p className="text-xs">{format(o.start!, "dd/MM/yy")} → {format(o.end!, "dd/MM/yy")}</p>
                              <p className="text-xs">Concluído: {o.progress}% · esperado {o.expected}%</p>
                              {o.nextDelivery && <p className="text-xs">Próxima: {o.nextDelivery}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-right">{o.progress}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3" aria-hidden>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: C.navy }} /> Concluído</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: C.navyFaint }} /> Prazo restante</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 rounded" style={{ backgroundColor: C.terra }} /> Hoje</span>
                </div>
              </div>
            </div>
          ) : (
            <Empty icon={<CalendarRange className="h-12 w-12" />} text="Nenhuma obra com cronograma definido" />
          )}
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Mapa de fornecedores ── */}
          <SectionCard
            className="lg:col-span-2"
            icon={<Users className="h-4 w-4" />}
            title="Mapa de fornecedores por obra"
            subtitle="Semanas em que cada fornecedor está alocado em cada obra"
            right={
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" style={{ color: C.success }} aria-hidden /> Alocado</span>
                <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" style={{ color: C.warning }} aria-hidden /> Conflito</span>
              </div>
            }
          >
            {suppliers.length > 0 ? (
              <div className="overflow-auto max-h-[420px] scrollbar-elegant">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Fornecedor</TableHead>
                      {activeProjects.map((p) => (
                        <TableHead key={p.id} className="text-center min-w-[110px] text-xs">{p.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((s) => (
                      <TableRow key={s}>
                        <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{s}</TableCell>
                        {activeProjects.map((p) => {
                          const cell = matrix[s]?.[p.id];
                          if (!cell || cell.weeks.length === 0) {
                            return <TableCell key={p.id} className="text-center text-muted-foreground/40">—</TableCell>;
                          }
                          const Icon = cell.conflict ? AlertTriangle : CheckCircle2;
                          const color = cell.conflict ? C.warning : C.success;
                          const shown = cell.weeks.length > 4 ? `${cell.weeks[0]}–${cell.weeks[cell.weeks.length - 1]}` : cell.weeks.join(", ");
                          return (
                            <TableCell key={p.id} className="text-center">
                              <span
                                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-foreground whitespace-nowrap"
                                style={{ borderColor: color }}
                                title={cell.weeks.join(", ")}
                              >
                                <Icon className="h-3 w-3" style={{ color }} aria-hidden />
                                {shown}
                              </span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty icon={<Users className="h-12 w-12" />} text="Nenhum fornecedor alocado no cronograma das obras ativas" />
            )}
          </SectionCard>

          {/* ── Carga dos fornecedores ── */}
          <SectionCard icon={<Truck className="h-4 w-4" />} title="Carga dos fornecedores" subtitle="Em quantas obras cada um está">
            {carga.length > 0 ? (
              <ul className="space-y-2">
                {carga.slice(0, 8).map((c) => (
                  <li key={c.supplier} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium truncate" title={c.supplier}>{c.supplier}</span>
                    <span className="flex-1 relative h-6 rounded-md bg-muted/40 overflow-hidden">
                      <span
                        className="absolute inset-y-0 left-0 rounded-r-[4px]"
                        style={{ width: `${(c.obras / maxCarga) * 100}%`, background: C.navyTint, borderLeft: `3px solid ${C.navy}` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2.5 text-xs font-semibold tabular-nums">
                        {c.obras} {c.obras === 1 ? "obra" : "obras"}
                      </span>
                    </span>
                    {c.conflito && <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: C.warning }} aria-label="Com conflito" />}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={<Truck className="h-10 w-10" />} text="Sem fornecedores no cronograma" />
            )}
          </SectionCard>
        </div>
      </div>
    </TooltipProvider>
  );
}
