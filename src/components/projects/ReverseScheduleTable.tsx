import { Fragment, useMemo, useState, type KeyboardEvent } from "react";
import { AlertTriangle, ArrowDownUp, Check, CheckCircle2, ChevronDown, ChevronUp, Circle, ClipboardCheck, Flag, Home, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CascadePreviewDialog } from "./CascadePreviewDialog";
import { ActivityDeliveryChecklist } from "./ActivityDeliveryChecklist";
import type { ChecklistPhotoHandlers } from "./ChecklistItemPhotos";
import { computeCascade, type CascadeChange, type ProjectActivity } from "@/hooks/useProjectActivities";
import type { DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";
import { computeCriticalPath } from "@/lib/criticalPath";
import { checklistProgress, groupChecklistByActivity } from "@/lib/deliveryChecklist";
import {
  applyReverseEdit,
  businessDaysUntil,
  computeReverseMetrics,
  todayIso,
  type ReverseDatePatch,
  type ReverseEditField,
} from "@/lib/reverseSchedule";
import { getDisciplineColor } from "@/lib/disciplineColors";

export type ReverseFilter = "all" | "critical" | "overdue" | "open";

/** Quantas atividades aparecem antes do "Ver mais". */
export const REVERSE_DEFAULT_LIMIT = 5;

interface Props {
  activities: ProjectActivity[];
  isLoading?: boolean;
  /** Data da mudança do cliente (projects.client_move_in_date). */
  moveInDate?: string | null;
  /** Persiste as datas editadas de uma atividade. */
  onUpdateDates: (patch: { id: string } & ReverseDatePatch) => void;
  /** Aplica o deslocamento das atividades dependentes (mesma lógica do Gantt). */
  onCascade?: (updates: { id: string; start_date: string; end_date: string }[]) => void;
  isSaving?: boolean;
  /** Só para testes: fixa a data de hoje (YYYY-MM-DD). */
  today?: string;
  /** Quantas linhas mostrar antes do "Ver mais" (padrão 5). */
  initialLimit?: number;
  /**
   * Checklist de entrega: quando informado, cada atividade ganha a coluna
   * "Entrega" com as pendências dela (marcar, excluir, adicionar).
   */
  checklistItems?: DeliveryChecklistItem[];
  onChecklistToggle?: (item: DeliveryChecklistItem) => void;
  onChecklistRemove?: (id: string) => void;
  onChecklistAdd?: (activityId: string) => void;
  /** Fotos dos itens do checklist (miniatura, upload pelo celular). */
  checklistPhotos?: ChecklistPhotoHandlers;
  /**
   * "Quando entregar já dá o check ali": marca a atividade como concluída
   * (ou reabre) direto na linha, sem abrir o formulário.
   */
  onToggleDone?: (activity: ProjectActivity, done: boolean) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  bloqueada: "Bloqueada",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ------------------------------------------------------------------ */
/* Células editáveis inline                                            */
/* ------------------------------------------------------------------ */

function InlineDateCell({
  value,
  label,
  onCommit,
  disabled,
}: {
  value: string | null;
  label: string;
  onCommit: (iso: string) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="date"
        aria-label={label}
        autoFocus
        defaultValue={value ?? ""}
        className="h-8 w-[140px] rounded-md border border-input bg-background px-2 text-sm"
        onChange={(e) => {
          if (e.target.value) {
            onCommit(e.target.value);
            setEditing(false);
          }
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter" && e.currentTarget.value) {
            onCommit(e.currentTarget.value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => setEditing(true)}
      className="group/cell inline-flex items-center gap-1.5 rounded px-1.5 py-1 -mx-1.5 text-sm hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
    >
      <span className={value ? "" : "text-muted-foreground"}>{fmtDate(value)}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/cell:opacity-100" />
    </button>
  );
}

function InlineNumberCell({
  value,
  label,
  onCommit,
  disabled,
}: {
  value: number | null;
  label: string;
  onCommit: (n: number) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const n = parseInt(draft, 10);
    if (Number.isFinite(n) && n >= 1 && n !== value) onCommit(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        min={1}
        aria-label={label}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-8 w-[72px] rounded-md border border-input bg-background px-2 text-sm text-center"
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        setDraft(value != null ? String(value) : "");
        setEditing(true);
      }}
      className="group/cell inline-flex items-center gap-1.5 rounded px-1.5 py-1 -mx-1.5 text-sm tabular-nums hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
    >
      <span className={value != null ? "" : "text-muted-foreground"}>{value ?? "—"}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/cell:opacity-100" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Tabela                                                              */
/* ------------------------------------------------------------------ */

export function ReverseScheduleTable({
  activities,
  isLoading,
  moveInDate,
  onUpdateDates,
  onCascade,
  isSaving,
  today: todayProp,
  initialLimit = REVERSE_DEFAULT_LIMIT,
  checklistItems,
  onChecklistToggle,
  onChecklistRemove,
  onChecklistAdd,
  onToggleDone,
  checklistPhotos,
}: Props) {
  const today = todayProp ?? todayIso();
  const [filter, setFilter] = useState<ReverseFilter>("all");
  const [reverseOrder, setReverseOrder] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [openChecklists, setOpenChecklists] = useState<Set<string>>(new Set());
  const [pendingCascade, setPendingCascade] = useState<CascadeChange[]>([]);

  const hasChecklist = checklistItems != null;
  const checklistByActivity = useMemo(
    () => groupChecklistByActivity(checklistItems ?? []),
    [checklistItems],
  );

  const cpm = useMemo(
    () =>
      computeCriticalPath(
        activities.map((a) => ({ id: a.id, start_date: a.start_date, duration: a.duration_days, dependencies: a.depends_on })),
      ),
    [activities],
  );

  const rows = useMemo(() => {
    const list = activities.map((a) => ({
      activity: a,
      metrics: computeReverseMetrics(a, today),
      isCritical: cpm.criticalIds.has(a.id),
      float: cpm.floatMap.get(a.id),
    }));
    list.sort((x, y) => {
      const kx = x.activity.end_date ?? x.activity.start_date ?? "";
      const ky = y.activity.end_date ?? y.activity.start_date ?? "";
      if (kx === ky) return (x.activity.position ?? 0) - (y.activity.position ?? 0);
      return reverseOrder ? ky.localeCompare(kx) : kx.localeCompare(ky);
    });
    return list;
  }, [activities, cpm, today, reverseOrder]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "critical":
        return rows.filter((r) => r.isCritical || r.metrics.isOverdue);
      case "overdue":
        return rows.filter((r) => r.metrics.isOverdue);
      case "open":
        return rows.filter((r) => !r.metrics.isFinished);
      default:
        return rows;
    }
  }, [rows, filter]);

  const visible = showAll ? filtered : filtered.slice(0, initialLimit);
  const hiddenCount = filtered.length - visible.length;

  const summary = useMemo(() => {
    const dated = activities.filter((a) => a.end_date || a.start_date);
    const projectEnd = dated.reduce<string | null>((max, a) => {
      const e = a.end_date ?? a.start_date!;
      return !max || e > max ? e : max;
    }, null);
    const overdueCount = rows.filter((r) => r.metrics.isOverdue).length;
    const remainingTotal = rows.reduce((s, r) => s + (r.metrics.remainingDays ?? 0), 0);
    return {
      projectEnd,
      daysToEnd: projectEnd ? businessDaysUntil(projectEnd, today) : null,
      daysToMoveIn: moveInDate ? businessDaysUntil(moveInDate, today) : null,
      exceedsMoveIn: !!(moveInDate && projectEnd && projectEnd > moveInDate),
      criticalCount: cpm.criticalCount,
      overdueCount,
      remainingTotal,
    };
  }, [activities, rows, cpm.criticalCount, moveInDate, today]);

  const handleEdit = (activity: ProjectActivity, field: ReverseEditField, value: string | number) => {
    const patch = applyReverseEdit(activity, field, value);
    if (!patch) return;
    if (patch.start_date === activity.start_date && patch.end_date === activity.end_date && patch.duration_days === activity.duration_days) return;
    onUpdateDates({ id: activity.id, ...patch });

    // Término mudou: dependentes seguem a lógica do Gantt (confirmação em cascata).
    if (onCascade && patch.end_date !== activity.end_date) {
      const changes = computeCascade(activity.id, patch.end_date, activities);
      if (changes.length > 0) setPendingCascade(changes);
    }
  };

  const confirmCascade = () => {
    onCascade?.(pendingCascade.map((c) => ({ id: c.id, start_date: c.newStart, end_date: c.newEnd })));
    setPendingCascade([]);
  };

  const toggleChecklist = (id: string) => {
    setOpenChecklists((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg px-4">
        <p>Nenhuma atividade cadastrada.</p>
        <p className="text-xs mt-1">
          Gere as atividades na aba Escopo: o Cronograma Reverso, o Gantt e a Contagem Regressiva são montados a partir delas.
        </p>
      </div>
    );
  }

  const filterButtons: { value: ReverseFilter; label: string; count?: number }[] = [
    { value: "all", label: "Todas", count: rows.length },
    { value: "critical", label: "Marcos críticos", count: rows.filter((r) => r.isCritical || r.metrics.isOverdue).length },
    { value: "overdue", label: "Atrasadas", count: summary.overdueCount },
    { value: "open", label: "Em aberto", count: rows.filter((r) => !r.metrics.isFinished).length },
  ];

  const colCount = hasChecklist ? 9 : 8;

  return (
    <div className="space-y-4">
      {/* Resumo reverso */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-display">{summary.projectEnd ? fmtDate(summary.projectEnd) : "—"}</p>
            <p className="text-xs text-muted-foreground">Término previsto da obra</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${summary.daysToEnd != null && summary.daysToEnd < 0 ? "text-destructive" : "text-primary"}`} data-testid="days-to-end">
              {summary.daysToEnd == null ? "—" : summary.daysToEnd}
            </p>
            <p className="text-xs text-muted-foreground">Dias úteis até o término</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{summary.criticalCount}</p>
            <p className="text-xs text-muted-foreground">Marcos críticos</p>
          </CardContent>
        </Card>
        <Card className={summary.exceedsMoveIn ? "border-destructive/40" : ""}>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${summary.exceedsMoveIn ? "text-destructive" : "text-success"}`} data-testid="days-to-move-in">
              {summary.daysToMoveIn == null ? "—" : summary.daysToMoveIn}
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Home className="h-3 w-3" /> Dias úteis até a mudança{moveInDate ? ` (${fmtDate(moveInDate)})` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {summary.exceedsMoveIn && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-center gap-2" role="alert">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          O término previsto ({fmtDate(summary.projectEnd)}) passa da data de mudança ({fmtDate(moveInDate)}). Ajuste as datas dos marcos críticos.
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtro do cronograma reverso">
          {filterButtons.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
            >
              {f.value === "critical" && <Flag className="h-3 w-3 mr-1" />}
              {f.label}
              {f.count != null && <span className="ml-1.5 opacity-70">{f.count}</span>}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-muted-foreground">Salvando…</span>}
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setReverseOrder((v) => !v)} title="Inverter ordem">
            <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
            {reverseOrder ? "Do fim para o começo" : "Do começo para o fim"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Clique em uma data ou no prazo para editar direto na tabela. Dias úteis excluem fins de semana, feriados nacionais e o recesso de fim de ano.
        Marcos críticos são as atividades sem folga no caminho crítico (mesmo cálculo do Gantt) e as atrasadas.
        {onToggleDone && " O círculo antes do nome marca a atividade como entregue."}
        {hasChecklist && " Na coluna Entrega, marque as pendências de entrega de cada atividade."}
      </p>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-[220px]">Atividade</TableHead>
              <TableHead>Início previsto</TableHead>
              <TableHead className="text-center">Prazo (dias úteis)</TableHead>
              <TableHead>Prazo final</TableHead>
              <TableHead className="text-center">Dias trabalhados</TableHead>
              <TableHead className="text-center">Dias faltantes</TableHead>
              <TableHead className="text-center">Folga</TableHead>
              <TableHead>Status</TableHead>
              {hasChecklist && <TableHead className="text-center">Entrega</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma atividade neste filtro.
                </TableCell>
              </TableRow>
            )}
            {visible.map(({ activity: a, metrics: m, isCritical, float }) => {
              const disabled = !!isSaving;
              const items = checklistByActivity.get(a.id) ?? [];
              const progress = checklistProgress(items);
              const checklistOpen = openChecklists.has(a.id);
              return (
                <Fragment key={a.id}>
                  <TableRow
                    data-testid={`reverse-row-${a.id}`}
                    className={m.isOverdue ? "bg-destructive/5" : isCritical ? "bg-warning/5" : undefined}
                  >
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {onToggleDone && (
                          <button
                            type="button"
                            data-testid={`done-toggle-${a.id}`}
                            disabled={disabled}
                            aria-pressed={m.isFinished}
                            aria-label={m.isFinished ? `Reabrir ${a.name}` : `Marcar ${a.name} como entregue`}
                            title={m.isFinished ? "Entregue — clique para reabrir" : "Marcar como entregue"}
                            onClick={() => onToggleDone(a, !m.isFinished)}
                            className="shrink-0 text-muted-foreground hover:text-success transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
                          >
                            {m.isFinished ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5" />}
                          </button>
                        )}
                        {isCritical && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Flag className="h-3.5 w-3.5 text-destructive shrink-0" aria-label="Marco crítico" />
                              </TooltipTrigger>
                              <TooltipContent>Marco crítico: sem folga, qualquer atraso adia o fim da obra.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${m.isFinished ? "line-through text-muted-foreground" : ""}`}>{a.name}</p>
                          {a.discipline && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: getDisciplineColor(a.discipline) }} />
                              {a.discipline}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <InlineDateCell
                        value={a.start_date}
                        label={`Editar início de ${a.name}`}
                        disabled={disabled}
                        onCommit={(iso) => handleEdit(a, "start_date", iso)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <InlineNumberCell
                        value={m.totalDays}
                        label={`Editar prazo de ${a.name}`}
                        disabled={disabled}
                        onCommit={(n) => handleEdit(a, "duration_days", n)}
                      />
                    </TableCell>
                    <TableCell>
                      <InlineDateCell
                        value={a.end_date}
                        label={`Editar término de ${a.name}`}
                        disabled={disabled}
                        onCommit={(iso) => handleEdit(a, "end_date", iso)}
                      />
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums" data-testid={`worked-${a.id}`}>
                      {m.workedDays ?? "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums" data-testid={`remaining-${a.id}`}>
                      {m.remainingDays == null ? (
                        "—"
                      ) : m.isOverdue ? (
                        <span className="text-destructive font-semibold">−{m.overdueDays}</span>
                      ) : m.isFinished ? (
                        <Check className="h-4 w-4 text-success inline" aria-label="Concluída" />
                      ) : (
                        <span className={m.remainingDays <= 2 ? "text-warning font-semibold" : ""}>{m.remainingDays}</span>
                      )}
                      {!m.hasStarted && !m.isFinished && m.daysToStart != null && (
                        <span className="block text-[10px] text-muted-foreground">começa em {m.daysToStart}d</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                      {float == null ? "—" : `${float}d`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          m.isOverdue
                            ? "text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                            : a.status === "concluida"
                              ? "text-[10px] bg-success/15 text-success border-success/30"
                              : a.status === "em_andamento"
                                ? "text-[10px] bg-primary/10 text-primary border-primary/30"
                                : "text-[10px]"
                        }
                      >
                        {m.isOverdue ? "Atrasada" : STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                    {hasChecklist && (
                      <TableCell className="text-center">
                        <button
                          type="button"
                          data-testid={`checklist-toggle-${a.id}`}
                          aria-expanded={checklistOpen}
                          aria-label={`Checklist de entrega de ${a.name}`}
                          onClick={() => toggleChecklist(a.id)}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <ClipboardCheck
                            className={`h-3.5 w-3.5 ${
                              progress.total === 0 ? "text-muted-foreground" : progress.pending === 0 ? "text-success" : "text-warning"
                            }`}
                          />
                          {progress.total > 0 ? (
                            <span className="tabular-nums font-medium">{progress.resolved}/{progress.total}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${checklistOpen ? "rotate-180" : ""}`} />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                  {hasChecklist && checklistOpen && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20" data-testid={`checklist-row-${a.id}`}>
                      <TableCell colSpan={colCount} className="py-3 pl-8">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                          <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> Checklist de entrega · {a.name}
                        </p>
                        <ActivityDeliveryChecklist
                          items={items}
                          disabled={disabled}
                          onToggle={(item) => onChecklistToggle?.(item)}
                          onRemove={(id) => onChecklistRemove?.(id)}
                          onAdd={() => onChecklistAdd?.(a.id)}
                          photos={checklistPhotos}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length > initialLimit && (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAll((v) => !v)} data-testid="reverse-toggle-all">
            {showAll ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" /> Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" /> Ver mais ({hiddenCount} {hiddenCount === 1 ? "atividade" : "atividades"})
              </>
            )}
          </Button>
        </div>
      )}

      <CascadePreviewDialog
        open={pendingCascade.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingCascade([]);
        }}
        changes={pendingCascade}
        onConfirm={confirmCascade}
        isLoading={isSaving}
      />
    </div>
  );
}
