import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, FileSpreadsheet, FlaskConical, Loader2, MoreHorizontal, Plus, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectActivities, computeRecalculateAll, type ProjectActivity } from "@/hooks/useProjectActivities";
import { useClientClosingSchedule } from "@/hooks/useClientClosingSchedule";
import { useDeliveryChecklist, type DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { csvRow, downloadCsv } from "@/lib/csv";
import { buildPendingSummary } from "@/lib/deliveryChecklist";
import { computeReverseMetrics, todayIso } from "@/lib/reverseSchedule";
import { GanttChart } from "./GanttChart";
import { ReverseScheduleTable } from "./ReverseScheduleTable";
import { ActivityForm } from "./ActivityForm";
import { CascadePreviewDialog, type CascadeChange } from "./CascadePreviewDialog";
import { ApplyCalendarDialog } from "./ApplyCalendarDialog";
import { ScheduleScenariosDialog } from "./ScheduleScenariosDialog";
import { ClientClosingSchedule } from "./ClientClosingSchedule";
import { ClientCountdownList } from "./ClientCountdownList";
import { DeliveryChecklistItemDialog, type DeliveryChecklistDraft } from "./DeliveryChecklistItemDialog";
import { GeneralDeliveryChecklist } from "./ActivityDeliveryChecklist";

/** Status de project_activities → status de schedule_tasks (portal do cliente). */
const ACTIVITY_TO_TASK_STATUS: Record<string, string> = {
  pendente: "planejado",
  em_andamento: "em_execucao",
  concluida: "executado",
  bloqueada: "atrasado",
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const ACTIVITY_STATUS_COLOR: Record<string, string> = {
  pendente: "#9CA3AF",
  em_andamento: "#1B2A4A",
  concluida: "#16A34A",
  bloqueada: "#DC2626",
};

/**
 * Aba Cronograma da obra.
 *
 * Fonte única: project_activities (geradas no Escopo). O Cronograma
 * Reverso é a subaba principal e editável; Gantt e Contagem Regressiva
 * são visões derivadas dele. O checklist de entrega vive dentro do
 * reverso (coluna Entrega de cada atividade).
 */
export function ProjectScheduleTab({ projectId }: { projectId: string }) {
  const {
    activities,
    isLoading: activitiesLoading,
    create: createActivity,
    update: updateActivity,
    batchUpdateDates,
    updateDates,
  } = useProjectActivities(projectId);
  const { items: closingItems } = useClientClosingSchedule(projectId);
  const checklist = useDeliveryChecklist(projectId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ProjectActivity | null>(null);
  const [ganttView, setGanttView] = useState<"day" | "week" | "month">("month");
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [recalcChanges, setRecalcChanges] = useState<CascadeChange[]>([]);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [projectStartDate, setProjectStartDate] = useState<string | null>(null);
  const [scenariosDialogOpen, setScenariosDialogOpen] = useState(false);
  const [generatingCheckpoints, setGeneratingCheckpoints] = useState(false);
  const [syncingPortal, setSyncingPortal] = useState(false);
  const [checklistDialog, setChecklistDialog] = useState<{ open: boolean; activityId: string | null }>({ open: false, activityId: null });

  // client_move_in_date — contagem regressiva e alerta do reverso
  const { data: projectMeta } = useQuery({
    queryKey: ["project_meta_move_in", projectId],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("client_move_in_date, name").eq("id", projectId).maybeSingle();
      return data as { client_move_in_date: string | null; name: string } | null;
    },
    enabled: !!projectId,
  });
  const moveInDate: string | null = projectMeta?.client_move_in_date ?? null;

  const disciplines = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => { if (a.discipline) set.add(a.discipline); });
    return Array.from(set).sort();
  }, [activities]);

  const ganttAll = useMemo(
    () =>
      activities.map((a) => ({
        id: a.id,
        task_name: a.name,
        start_date: a.start_date,
        end_date: a.end_date,
        status: ACTIVITY_TO_TASK_STATUS[a.status] || "planejado",
        discipline: a.discipline,
        supplier_name: null,
        progress_percentage: a.progress_percent,
        color: ACTIVITY_STATUS_COLOR[a.status] || "#9CA3AF",
        requires_presence: null,
        is_daily_detail: null,
        dependencies: a.depends_on,
        environment: null,
        estimated_days: a.duration_days,
      })),
    [activities],
  );

  const ganttFiltered = useMemo(
    () => (filterDiscipline === "all" ? ganttAll : ganttAll.filter((t) => t.discipline === filterDiscipline)),
    [ganttAll, filterDiscipline],
  );

  const stats = useMemo(() => {
    const today = todayIso();
    let overdue = 0;
    activities.forEach((a) => { if (computeReverseMetrics(a, today).isOverdue) overdue++; });
    return {
      total: activities.length,
      inProgress: activities.filter((a) => a.status === "em_andamento").length,
      completed: activities.filter((a) => a.status === "concluida").length,
      undated: activities.filter((a) => !a.start_date).length,
      overdue,
    };
  }, [activities]);

  /* ---------------- ações do cronograma ---------------- */

  const openActivityForm = (activity: ProjectActivity | null) => {
    setEditingActivity(activity);
    setActivityFormOpen(true);
  };

  // Check "entregue" na linha do reverso: conclui (100%) ou reabre a atividade.
  const handleToggleDone = (activity: ProjectActivity, done: boolean) => {
    if (done) {
      updateActivity.mutate({ id: activity.id, status: "concluida", progress_percent: 100 });
      return;
    }
    const started = !!activity.start_date && activity.start_date <= todayIso();
    updateActivity.mutate({ id: activity.id, status: started ? "em_andamento" : "pendente", progress_percent: 0 });
  };

  const handleGanttEdit = (task: { id: string }) => {
    openActivityForm(activities.find((a) => a.id === task.id) ?? null);
  };

  const handleRecalculateAll = () => {
    const changes = computeRecalculateAll(activities);
    if (changes.length === 0) {
      toast({ title: "Nenhuma alteração necessária. Todas as datas estão consistentes." });
      return;
    }
    setRecalcChanges(changes);
  };

  const handleRecalcConfirm = () => {
    batchUpdateDates.mutate(recalcChanges.map((c) => ({ id: c.id, start_date: c.newStart, end_date: c.newEnd })));
    setRecalcChanges([]);
  };

  const openCalendarDialog = async () => {
    const { data } = await supabase.from("projects").select("real_start_date").eq("id", projectId).maybeSingle();
    setProjectStartDate((data?.real_start_date as string | null) ?? null);
    setCalendarDialogOpen(true);
  };

  const handleApplyCalendar = (changes: { id: string; start_date: string; end_date: string }[]) => {
    batchUpdateDates.mutate(changes);
    setCalendarDialogOpen(false);
  };

  // Gera checkpoints (visitas técnicas) a partir das atividades datadas.
  const handleGenerateCheckpoints = async () => {
    if (activities.length === 0) return;
    setGeneratingCheckpoints(true);
    try {
      const payload = activities
        .filter((a) => a.start_date && a.end_date)
        .map((a) => ({ id: a.id, name: a.name, discipline: a.discipline, start_date: a.start_date, end_date: a.end_date }));
      if (payload.length === 0) {
        toast({ title: "Aplique o calendário antes para que as atividades tenham datas." });
        return;
      }
      const { data, error } = await supabase.functions.invoke("generate-checkpoints", {
        body: { project_id: projectId, activities: payload, replace_existing: true },
      });
      if (error) throw error;
      toast({ title: `${data?.created ?? 0} checkpoints criados`, description: "Verifique em Acompanhamento da obra (visitas)." });
    } catch (e) {
      toast({ title: "Erro ao gerar checkpoints", description: errorMessage(e), variant: "destructive" });
    } finally {
      setGeneratingCheckpoints(false);
    }
  };

  const handleExportScheduleCSV = () => {
    let csv = csvRow(["Atividade", "Disciplina", "Duração (dias úteis)", "Início", "Término", "Predecessoras"]);
    activities.forEach((a) => {
      const predecessors = (a.depends_on ?? [])
        .map((id) => activities.find((x) => x.id === id)?.name)
        .filter(Boolean)
        .join(" | ");
      csv += csvRow([a.name, a.discipline ?? "", a.duration_days ?? "", a.start_date ?? "", a.end_date ?? "", predecessors]);
    });
    downloadCsv(`cronograma_${projectId}.csv`, csv);
  };

  // O portal do cliente lê schedule_tasks: espelha o reverso lá
  // (cria/atualiza uma etapa por atividade datada, visível ao cliente).
  const handleSyncPortal = async () => {
    if (!user) return;
    const dated = activities.filter((a) => a.start_date);
    if (dated.length === 0) {
      toast({ title: "Aplique o calendário antes: o portal só mostra atividades com data." });
      return;
    }
    setSyncingPortal(true);
    try {
      const { data: existingTasks, error: fetchError } = await supabase
        .from("schedule_tasks")
        .select("id, source_activity_id")
        .eq("project_id", projectId);
      if (fetchError) throw fetchError;
      const existing = existingTasks ?? [];
      const existingMap = new Map<string, string>();
      existing.forEach((t) => { if (t.source_activity_id) existingMap.set(t.source_activity_id, t.id); });
      let created = 0;
      let updated = 0;
      let order = existing.length;
      for (const a of dated) {
        const taskData = {
          task_name: a.name,
          start_date: a.start_date,
          end_date: a.end_date,
          status: ACTIVITY_TO_TASK_STATUS[a.status] || "planejado",
          discipline: a.discipline,
          progress_percentage: a.progress_percent ?? 0,
        };
        const existingId = existingMap.get(a.id);
        if (existingId) {
          const { error } = await supabase.from("schedule_tasks").update(taskData).eq("id", existingId);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase.from("schedule_tasks").insert({
            ...taskData,
            project_id: projectId,
            user_id: user.id,
            source_activity_id: a.id,
            order_index: ++order,
            is_client_visible: true,
          });
          if (error) throw error;
          created++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["schedule_tasks", projectId] });
      const parts: string[] = [];
      if (created > 0) parts.push(`${created} criadas`);
      if (updated > 0) parts.push(`${updated} atualizadas`);
      toast({ title: "Cronograma do portal atualizado", description: parts.join(", ") || "Nada a alterar." });
    } catch (e) {
      toast({ title: "Erro ao atualizar o portal", description: errorMessage(e), variant: "destructive" });
    } finally {
      setSyncingPortal(false);
    }
  };

  /* ---------------- checklist de entrega ---------------- */

  const handleChecklistToggle = (item: DeliveryChecklistItem) => {
    checklist.update.mutate({ id: item.id, resolved: !item.resolved });
  };

  const handleChecklistSubmit = ({ photos, ...draft }: DeliveryChecklistDraft) => {
    checklist.create.mutate(draft, {
      onSuccess: (created) => {
        setChecklistDialog({ open: false, activityId: null });
        if (photos.length > 0 && created) checklist.addPhotos.mutate({ item: created, files: photos });
      },
    });
  };

  const checklistPhotos = {
    onAddPhotos: (item: DeliveryChecklistItem, files: File[]) => checklist.addPhotos.mutate({ item, files }),
    onRemovePhoto: (item: DeliveryChecklistItem, path: string) => checklist.removePhoto.mutate({ item, path }),
    uploadingItemId: checklist.addPhotos.isPending ? checklist.addPhotos.variables?.item.id ?? null : null,
  };

  const handleCopyPending = () => {
    const text = buildPendingSummary(checklist.items, activities);
    if (!text) {
      toast({ title: "Nenhuma pendência de entrega em aberto." });
      return;
    }
    navigator.clipboard?.writeText(text);
    toast({ title: "Pendências copiadas para a área de transferência!" });
  };

  const checklistHandlers = {
    onToggle: handleChecklistToggle,
    onRemove: (id: string) => checklist.remove.mutate(id),
    disabled: checklist.update.isPending || checklist.remove.isPending,
  };

  const scheduleBusy = updateDates.isPending || batchUpdateDates.isPending;

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="reverso">
        <TabsList>
          <TabsTrigger value="reverso">Cronograma Reverso</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento Cliente</TabsTrigger>
          <TabsTrigger value="contagem">Contagem Regressiva</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
        </TabsList>

        {/* ===== CRONOGRAMA REVERSO (principal, editável) ===== */}
        <TabsContent value="reverso" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Cronograma Reverso</h3>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Base única do cronograma: as atividades vêm do Escopo; o Gantt e a Contagem Regressiva são gerados daqui.
                Marque a atividade como entregue no círculo antes do nome e as pendências de entrega na coluna Entrega.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={stats.undated > 0 ? "default" : "outline"}
                onClick={openCalendarDialog}
                disabled={scheduleBusy || activities.length === 0}
                title="Aplica o calendário brasileiro: pula fim de semana, feriados e recesso"
              >
                <CalendarCheck className="h-4 w-4 mr-1" /> Aplicar calendário BR
              </Button>
              <Button size="sm" variant="outline" onClick={handleRecalculateAll} disabled={scheduleBusy || activities.length === 0}>
                <RefreshCw className="h-4 w-4 mr-1" /> Recalcular
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" aria-label="Mais ações do cronograma">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Mais ações</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => openActivityForm(null)}>
                    <Plus className="h-4 w-4 mr-2" /> Nova atividade
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSyncPortal} disabled={syncingPortal || activities.length === 0}>
                    {syncingPortal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                    Atualizar cronograma do portal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleGenerateCheckpoints} disabled={generatingCheckpoints || activities.length === 0}>
                    {generatingCheckpoints ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarCheck className="h-4 w-4 mr-2" />}
                    Gerar checkpoints de visita
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setScenariosDialogOpen(true)} disabled={activities.length === 0}>
                    <FlaskConical className="h-4 w-4 mr-2" /> Cenários (e se…)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportScheduleCSV} disabled={activities.length === 0}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <ReverseScheduleTable
            activities={activities}
            isLoading={activitiesLoading}
            moveInDate={moveInDate}
            isSaving={scheduleBusy}
            onUpdateDates={(patch) => updateDates.mutate(patch)}
            onCascade={(updates) => batchUpdateDates.mutate(updates)}
            checklistItems={checklist.items}
            onChecklistToggle={handleChecklistToggle}
            onChecklistRemove={(id) => checklist.remove.mutate(id)}
            onChecklistAdd={(activityId) => setChecklistDialog({ open: true, activityId })}
            onToggleDone={handleToggleDone}
            checklistPhotos={checklistPhotos}
          />

          {(activities.length > 0 || checklist.items.length > 0) && (
            <GeneralDeliveryChecklist
              allItems={checklist.items}
              onCopyPending={handleCopyPending}
              onAdd={() => setChecklistDialog({ open: true, activityId: null })}
              {...checklistHandlers}
              photos={checklistPhotos}
            />
          )}
        </TabsContent>

        {/* ===== FECHAMENTO CLIENTE ===== */}
        <TabsContent value="fechamento" className="mt-4">
          <ClientClosingSchedule projectId={projectId} moveInDate={moveInDate} />
        </TabsContent>

        {/* ===== CONTAGEM REGRESSIVA (antiga Lista Cliente) ===== */}
        <TabsContent value="contagem" className="mt-4">
          <ClientCountdownList activities={activities} closingItems={closingItems} moveInDate={moveInDate} />
        </TabsContent>

        {/* ===== GANTT (visão gráfica do reverso) ===== */}
        <TabsContent value="gantt" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Gantt</h3>
              <p className="text-xs text-muted-foreground">
                Visão gráfica do Cronograma Reverso. Clique em uma barra para editar a atividade.
              </p>
              {activities.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs" data-testid="gantt-stats">
                  <span><strong className="text-display">{stats.total}</strong> atividades</span>
                  <span className="text-primary"><strong>{stats.inProgress}</strong> em andamento</span>
                  <span className="text-destructive"><strong>{stats.overdue}</strong> atrasadas</span>
                  <span className="text-success"><strong>{stats.completed}</strong> concluídas</span>
                  {stats.undated > 0 && <span className="text-muted-foreground"><strong>{stats.undated}</strong> sem data</span>}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={ganttView} onValueChange={(v) => setGanttView(v as "day" | "week" | "month")}>
                <SelectTrigger className="w-[120px] h-8 text-xs" aria-label="Escala do Gantt"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Dia (14d)</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                </SelectContent>
              </Select>
              {disciplines.length > 1 && (
                <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
                  <SelectTrigger className="w-[160px] h-8 text-xs" aria-label="Filtrar disciplina"><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas disciplinas</SelectItem>
                    {disciplines.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {activitiesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg px-4">
              <p>Nenhuma atividade no cronograma.</p>
              <p className="text-xs mt-1">Gere as atividades na aba Escopo e aplique o calendário no Cronograma Reverso. O Gantt é desenhado a partir dele.</p>
            </div>
          ) : stats.undated === activities.length ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg px-4">
              <p>As atividades ainda não têm datas.</p>
              <p className="text-xs mt-1">Use "Aplicar calendário BR" no Cronograma Reverso para gerar o Gantt.</p>
            </div>
          ) : (
            <GanttChart tasks={ganttFiltered} allTasks={ganttAll} onEdit={handleGanttEdit} viewMode={ganttView} showSummary={false} />
          )}
        </TabsContent>
      </Tabs>

      <ActivityForm
        open={activityFormOpen}
        onOpenChange={setActivityFormOpen}
        onSubmit={async (data) => {
          const { id: _ignore, ...rest } = data;
          if (editingActivity?.id) {
            await updateActivity.mutateAsync({ id: editingActivity.id, ...rest });
          } else {
            await createActivity.mutateAsync(rest);
          }
          setEditingActivity(null);
        }}
        onCascade={(updates) => batchUpdateDates.mutate(updates)}
        initialData={editingActivity}
        allActivities={activities}
        projectId={projectId}
        isLoading={createActivity.isPending || updateActivity.isPending}
      />

      <CascadePreviewDialog
        open={recalcChanges.length > 0}
        onOpenChange={(open) => { if (!open) setRecalcChanges([]); }}
        changes={recalcChanges}
        onConfirm={handleRecalcConfirm}
        isLoading={batchUpdateDates.isPending}
        title="Recalcular todo o cronograma"
      />

      <ApplyCalendarDialog
        open={calendarDialogOpen}
        onOpenChange={setCalendarDialogOpen}
        activities={activities}
        defaultStartDate={projectStartDate}
        onApply={handleApplyCalendar}
        isApplying={batchUpdateDates.isPending}
      />

      <ScheduleScenariosDialog
        open={scenariosDialogOpen}
        onOpenChange={setScenariosDialogOpen}
        projectId={projectId}
        projectStartDate={projectStartDate}
        activities={activities}
      />

      <DeliveryChecklistItemDialog
        open={checklistDialog.open}
        onOpenChange={(open) => setChecklistDialog((s) => ({ ...s, open }))}
        activities={activities}
        defaultActivityId={checklistDialog.activityId}
        onSubmit={handleChecklistSubmit}
        isPending={checklist.create.isPending}
      />
    </div>
  );
}
