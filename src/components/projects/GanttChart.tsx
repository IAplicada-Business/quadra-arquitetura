import { useMemo, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, User, Pencil, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { addDays, startOfWeek, endOfWeek, format, differenceInDays, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getDisciplineColor } from "@/lib/disciplineColors";
import { computeCriticalPath, type CpmResult } from "@/lib/criticalPath";

interface GanttTask {
  id: string;
  task_name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  discipline: string | null;
  supplier_name: string | null;
  progress_percentage: number | null;
  color: string | null;
  requires_presence: boolean | null;
  is_daily_detail: boolean | null;
  dependencies?: string[] | null;
  environment?: string | null;
  estimated_days?: number | null;
}

interface GanttChartProps {
  tasks: GanttTask[];
  allTasks?: GanttTask[];
  onEdit?: (task: GanttTask) => void;
  viewMode: "day" | "week" | "month";
  /** Card de resumo do caminho crítico abaixo do gráfico (o reverso já mostra isso). */
  showSummary?: boolean;
}

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 28;

// ─── CPM calculation (compartilhado com o Cronograma Reverso) ───
function computeCpm(allTasks: GanttTask[]): CpmResult {
  return computeCriticalPath(
    allTasks.map((t) => ({ id: t.id, start_date: t.start_date, duration: t.estimated_days, dependencies: t.dependencies })),
  );
}

// ─── Flat row types ───
type FlatRow =
  | { type: "header"; discipline: string; tasks: GanttTask[]; yOffset: number }
  | { type: "task"; task: GanttTask; yOffset: number };

export function GanttChart({ tasks, allTasks, onEdit, viewMode, showSummary = true }: GanttChartProps) {
  const [offset, setOffset] = useState(0);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [collapsedDisciplines, setCollapsedDisciplines] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = (disc: string) => {
    setCollapsedDisciplines(prev => {
      const next = new Set(prev);
      if (next.has(disc)) next.delete(disc); else next.add(disc);
      return next;
    });
  };

  const getDependencyChain = useMemo(() => {
    const allSource = allTasks || tasks;
    return (taskId: string): Set<string> => {
      const chain = new Set<string>();
      function traverse(id: string) {
        const dependents = allSource.filter(a => a.dependencies?.includes(id));
        for (const dep of dependents) {
          if (!chain.has(dep.id)) { chain.add(dep.id); traverse(dep.id); }
        }
      }
      traverse(taskId);
      return chain;
    };
  }, [allTasks, tasks]);

  const hoveredChain = useMemo(() => {
    if (!hoveredTaskId) return null;
    return getDependencyChain(hoveredTaskId);
  }, [hoveredTaskId, getDependencyChain]);

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    const today = new Date();
    let start: Date, end: Date;
    if (viewMode === "day") {
      const base = addDays(today, offset * 14);
      start = addDays(base, -7); end = addDays(base, 6);
    } else if (viewMode === "week") {
      const base = addWeeks(today, offset);
      start = startOfWeek(base, { weekStartsOn: 1 }); end = endOfWeek(base, { weekStartsOn: 1 });
    } else {
      const base = addMonths(today, offset);
      start = startOfMonth(base); end = endOfMonth(base);
    }
    const numDays = differenceInDays(end, start) + 1;
    const dayList = Array.from({ length: numDays }, (_, i) => addDays(start, i));
    return { rangeStart: start, rangeEnd: end, days: dayList };
  }, [offset, viewMode]);

  const visibleTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.start_date) return false;
      const s = new Date(t.start_date);
      const e = t.end_date ? new Date(t.end_date) : s;
      return s <= rangeEnd && e >= rangeStart;
    });
  }, [tasks, rangeStart, rangeEnd]);

  // Group visible tasks by discipline
  const disciplineGroups = useMemo(() => {
    const map = new Map<string, GanttTask[]>();
    visibleTasks.forEach(task => {
      const disc = task.discipline || "Sem Disciplina";
      if (!map.has(disc)) map.set(disc, []);
      map.get(disc)!.push(task);
    });
    return Array.from(map.entries());
  }, [visibleTasks]);

  // Flat list of rows (headers + tasks) with Y offsets for SVG arrows
  const flatRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = [];
    let y = 0;
    disciplineGroups.forEach(([discipline, groupTasks]) => {
      rows.push({ type: "header", discipline, tasks: groupTasks, yOffset: y });
      y += HEADER_HEIGHT;
      if (!collapsedDisciplines.has(discipline)) {
        groupTasks.forEach(task => {
          rows.push({ type: "task", task, yOffset: y });
          y += ROW_HEIGHT;
        });
      }
    });
    return rows;
  }, [disciplineGroups, collapsedDisciplines]);

  const totalHeight = useMemo(() => {
    if (flatRows.length === 0) return 0;
    const last = flatRows[flatRows.length - 1];
    return last.yOffset + (last.type === "header" ? HEADER_HEIGHT : ROW_HEIGHT);
  }, [flatRows]);

  // Map task id → flat Y offset (for arrows)
  const taskYMap = useMemo(() => {
    const map = new Map<string, number>();
    flatRows.forEach(row => {
      if (row.type === "task") map.set(row.task.id, row.yOffset);
    });
    return map;
  }, [flatRows]);

  const allTasksSource = allTasks || tasks;
  const allTasksMap = useMemo(() => {
    const map = new Map<string, GanttTask>();
    allTasksSource.forEach(t => map.set(t.id, t));
    return map;
  }, [allTasksSource]);

  const cpm = useMemo(() => computeCpm(allTasksSource), [allTasksSource]);

  const nav = (dir: -1 | 1) => setOffset(prev => prev + dir);
  const goToday = () => setOffset(0);

  const totalDays = days.length;
  const colWidth = viewMode === "month" ? "minmax(20px, 1fr)" : "minmax(40px, 1fr)";

  const arrows = useMemo(() => {
    const result: { fromX: number; fromY: number; toX: number; toY: number; isCritical: boolean }[] = [];
    flatRows.forEach(row => {
      if (row.type !== "task") return;
      const task = row.task;
      if (!task.dependencies?.length) return;
      task.dependencies.forEach(depId => {
        const toY = taskYMap.get(task.id);
        const fromYBase = taskYMap.get(depId);
        if (toY === undefined || fromYBase === undefined) return;
        const depTask = allTasksMap.get(depId);
        if (!depTask?.end_date || !task.start_date) return;

        const depEnd = new Date(depTask.end_date);
        const taskStart = new Date(task.start_date);
        const depEndCol = Math.min(totalDays - 1, Math.max(0, differenceInDays(depEnd, rangeStart)));
        const taskStartCol = Math.max(0, differenceInDays(taskStart, rangeStart));
        const isCritical = cpm.criticalIds.has(task.id) && cpm.criticalIds.has(depId);

        result.push({
          fromX: depEndCol + 1,
          fromY: fromYBase + ROW_HEIGHT / 2,
          toX: taskStartCol,
          toY: toY + ROW_HEIGHT / 2,
          isCritical,
        });
      });
    });
    return result;
  }, [flatRows, taskYMap, allTasksMap, totalDays, rangeStart, cpm.criticalIds]);

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => nav(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={goToday}>Hoje</Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => nav(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-display">
          {format(rangeStart, "dd MMM", { locale: ptBR })} — {format(rangeEnd, "dd MMM yyyy", { locale: ptBR })}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {showCriticalPath && cpm.criticalCount > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm border-2 border-destructive bg-destructive/20" /> Caminho crítico</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-muted border border-border" /> Com folga</span>
            </div>
          )}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <Switch checked={showCriticalPath} onCheckedChange={setShowCriticalPath} className="scale-75" />
            Caminho crítico
          </label>
        </div>
      </div>

      {/* Gantt grid */}
      <div className="border rounded-lg overflow-x-auto relative" ref={containerRef}>
        {/* Column headers */}
        <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `200px repeat(${totalDays}, ${colWidth})` }}>
          <div className="p-2 text-xs font-medium text-muted-foreground border-r">Disciplina / Etapa</div>
          {days.map((day, i) => {
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div key={i} className={`p-1 text-center text-[10px] border-r last:border-r-0 ${isToday ? "bg-primary/10 font-bold" : isWeekend ? "bg-muted/50" : ""}`}>
                <div>{format(day, "EEE", { locale: ptBR })}</div>
                <div className="font-medium">{format(day, "dd")}</div>
              </div>
            );
          })}
        </div>

        {/* Rows */}
        {flatRows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhuma tarefa neste período.
          </div>
        ) : (
          <div className="relative">
            {flatRows.map((row, i) => {
              if (row.type === "header") {
                const disc = row.discipline;
                const discColor = getDisciplineColor(disc);
                const isCollapsed = collapsedDisciplines.has(disc);
                return (
                  <div
                    key={`header-${disc}`}
                    className="grid border-b cursor-pointer select-none"
                    style={{
                      gridTemplateColumns: `200px repeat(${totalDays}, ${colWidth})`,
                      height: `${HEADER_HEIGHT}px`,
                      backgroundColor: `${discColor}18`,
                    }}
                    onClick={() => toggleCollapse(disc)}
                  >
                    <div className="px-2 border-r flex items-center gap-1.5 min-w-0">
                      <ChevronDown
                        className="h-3 w-3 text-muted-foreground shrink-0 transition-transform"
                        style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                      />
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: discColor }} />
                      <span className="text-[11px] font-bold text-display truncate">{disc}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto mr-1 shrink-0">{row.tasks.length}</span>
                    </div>
                    {days.map((day, j) => {
                      const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div key={j} className={`border-r last:border-r-0 ${isToday ? "bg-primary/5" : isWeekend ? "bg-muted/20" : ""}`} />
                      );
                    })}
                  </div>
                );
              }

              // Task row
              const task = row.task;
              const taskStart = new Date(task.start_date!);
              const taskEnd = task.end_date ? new Date(task.end_date) : taskStart;
              const startCol = Math.max(0, differenceInDays(taskStart, rangeStart));
              const endCol = Math.min(totalDays - 1, differenceInDays(taskEnd, rangeStart));
              const baseBarColor = task.color || getDisciplineColor(task.discipline);
              const isCritical = showCriticalPath && cpm.criticalIds.has(task.id);
              const taskFloat = cpm.floatMap.get(task.id);

              const finishedStatuses = ["concluido", "executado"];
              const isFinished = finishedStatuses.includes(task.status || "");
              const nowDate = new Date();
              const hasEndDate = !!task.end_date;
              const taskEndDate = hasEndDate ? new Date(task.end_date!) : null;
              const isOverdue = hasEndDate && !isFinished && isBefore(taskEndDate!, new Date(format(nowDate, "yyyy-MM-dd")));
              const isExpiringSoon = hasEndDate && !isFinished && !isOverdue && isBefore(taskEndDate!, addDays(nowDate, 4)) && !isBefore(taskEndDate!, new Date(format(nowDate, "yyyy-MM-dd")));
              const daysUntilDeadline = hasEndDate ? differenceInDays(taskEndDate!, new Date(format(nowDate, "yyyy-MM-dd"))) : null;
              const barColor = isOverdue ? "#DC2626" : isExpiringSoon ? "#D97706" : baseBarColor;
              const barOpacity = isOverdue ? 0.85 : isCritical ? 1 : 0.8;
              const isHovered = hoveredTaskId === task.id;
              const isInChain = hoveredChain?.has(task.id) ?? false;
              const dimmed = hoveredTaskId !== null && !isHovered && !isInChain;
              const chainHighlight = isInChain && !isHovered;

              return (
                <div
                  key={task.id}
                  className="grid border-b last:border-b-0 hover:bg-muted/20 group transition-opacity duration-150"
                  style={{
                    gridTemplateColumns: `200px repeat(${totalDays}, ${colWidth})`,
                    height: `${ROW_HEIGHT}px`,
                    opacity: dimmed ? 0.3 : 1,
                  }}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                >
                  {/* Task label */}
                  <div className="px-2 pl-6 border-r flex items-center gap-1 min-w-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col justify-center cursor-pointer min-w-0 overflow-hidden" onClick={() => onEdit?.(task)}>
                            <div className="truncate text-xs font-medium flex items-center gap-1">
                              {task.requires_presence && <User className="h-3 w-3 text-warning-ink shrink-0" />}
                              {(isOverdue || isExpiringSoon) && (
                                <AlertTriangle className="h-3 w-3 shrink-0" style={{ color: isOverdue ? "#DC2626" : "#D97706" }} />
                              )}
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                              <span className="truncate">{task.task_name}</span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-semibold">{task.task_name}</p>
                          {task.discipline && <p className="text-xs text-muted-foreground">Disc: {task.discipline}</p>}
                          {task.supplier_name && <p className="text-xs text-muted-foreground">Resp: {task.supplier_name}</p>}
                          {task.environment && <p className="text-xs text-muted-foreground">Amb: {task.environment}</p>}
                          <p className="text-xs text-muted-foreground">Progresso: {task.progress_percentage ?? 0}%</p>
                          {task.start_date && <p className="text-xs text-muted-foreground">Prazo: {format(new Date(task.start_date), "dd/MM")} — {task.end_date ? format(new Date(task.end_date), "dd/MM/yyyy") : "—"}</p>}
                          {isOverdue && daysUntilDeadline !== null && (
                            <p className="text-xs font-medium" style={{ color: "#DC2626" }}>Atrasada {Math.abs(daysUntilDeadline)} dia{Math.abs(daysUntilDeadline) !== 1 ? "s" : ""}</p>
                          )}
                          {isExpiringSoon && daysUntilDeadline !== null && (
                            <p className="text-xs font-medium" style={{ color: "#D97706" }}>Vence em {daysUntilDeadline} dia{daysUntilDeadline !== 1 ? "s" : ""}</p>
                          )}
                          {taskFloat !== undefined && (
                            <p className="text-xs text-muted-foreground">Folga: {taskFloat} dia{taskFloat !== 1 ? "s" : ""}</p>
                          )}
                          <p className={`text-xs font-medium ${isCritical ? "text-destructive" : "text-muted-foreground"}`}>
                            Caminho crítico: {cpm.criticalIds.has(task.id) ? "Sim" : "Não"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {onEdit && (
                      <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => onEdit(task)}>
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                  {/* Day cells with bar */}
                  {days.map((day, j) => {
                    const isInRange = j >= startCol && j <= endCol;
                    const isStart = j === startCol;
                    const isEnd = j === endCol;
                    const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div key={j} className={`relative border-r last:border-r-0 ${isToday ? "bg-primary/5" : isWeekend ? "bg-muted/30" : ""}`}>
                        {isInRange && (
                          <div
                            className="absolute top-1 bottom-1 flex items-center cursor-pointer"
                            onClick={() => onEdit?.(task)}
                            style={{
                              left: isStart ? "2px" : 0,
                              right: isEnd ? "2px" : 0,
                              backgroundColor: barColor,
                              borderRadius: `${isStart ? "4px" : "0"} ${isEnd ? "4px" : "0"} ${isEnd ? "4px" : "0"} ${isStart ? "4px" : "0"}`,
                              opacity: barOpacity,
                              border: chainHighlight ? "2px solid hsl(var(--primary))" : isCritical ? "2.5px solid hsl(var(--destructive))" : "none",
                              boxSizing: "border-box",
                            }}
                          >
                            {isStart && (endCol - startCol) >= 2 && (
                              <span className="text-[9px] text-white px-1 truncate font-medium">
                                {task.task_name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* SVG overlay for dependency arrows */}
            {arrows.length > 0 && (
              <svg
                className="absolute top-0 left-[200px] pointer-events-none"
                style={{ width: `calc(100% - 200px)`, height: `${totalHeight}px` }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--muted-foreground))" opacity="0.6" />
                  </marker>
                  <marker id="arrowhead-critical" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                    <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--destructive))" opacity="0.9" />
                  </marker>
                </defs>
                {arrows.map((arrow, i) => {
                  const fromXPct = (arrow.fromX / totalDays) * 100;
                  const toXPct = (arrow.toX / totalDays) * 100;
                  const midX = `${Math.min(fromXPct, toXPct) + Math.abs(toXPct - fromXPct) / 2}%`;
                  const critical = showCriticalPath && arrow.isCritical;
                  return (
                    <path
                      key={i}
                      d={`M ${fromXPct}% ${arrow.fromY} L ${midX} ${arrow.fromY} L ${midX} ${arrow.toY} L ${toXPct}% ${arrow.toY}`}
                      fill="none"
                      stroke={critical ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
                      strokeWidth={critical ? "2.5" : "1.5"}
                      opacity={critical ? "0.9" : "0.5"}
                      markerEnd={critical ? "url(#arrowhead-critical)" : "url(#arrowhead)"}
                    />
                  );
                })}
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Critical Path Summary Card */}
      {showSummary && showCriticalPath && cpm.criticalCount > 0 && (
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Duração do caminho crítico</p>
                <p className="font-bold text-display text-lg">{cpm.totalCriticalDays} dias</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Conclusão estimada</p>
                <p className="font-bold text-display text-lg">
                  {cpm.estimatedEndDate ? format(cpm.estimatedEndDate, "dd/MM/yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Atividades no caminho crítico</p>
                <p className="font-bold text-display text-lg">
                  <span className="text-destructive">{cpm.criticalCount}</span>
                  <span className="text-muted-foreground text-sm font-normal"> / {cpm.totalWithDeps} elegíveis</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
