import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, GripVertical, Pencil, Trash2, Link2, Users, ChevronDown, ChevronRight, Wand2, Check, X, Loader2, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjectActivities, ProjectActivity } from "@/hooks/useProjectActivities";
import { ActivityForm } from "./ActivityForm";
import { GenerateActivitiesDialog } from "./GenerateActivitiesDialog";
import { SupplierScopeDialog } from "./SupplierScopeDialog";
import { MultiSelectFilter } from "@/components/construction/MultiSelectFilter";
import { getDisciplineColor } from "@/lib/disciplineColors";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProjectScopeTabProps {
  projectId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "hsl(var(--muted-foreground))" },
  em_andamento: { label: "Em Andamento", color: "#1B2A4A" },
  concluida: { label: "Concluída", color: "#16A34A" },
  bloqueada: { label: "Bloqueada", color: "#DC2626" },
};

function ActivityRow({
  activity,
  index,
  onEdit,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  allActivities,
}: {
  activity: ProjectActivity;
  index: number;
  onEdit: (a: ProjectActivity) => void;
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  allActivities: ProjectActivity[];
}) {
  const status = STATUS_MAP[activity.status] || STATUS_MAP.pendente;
  const predecessor = activity.depends_on?.length
    ? allActivities.find(a => a.id === activity.depends_on[0])
    : null;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, activity.id)}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, activity.id)}
      className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 hover:bg-muted/30 transition-colors group cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{index}</span>
      <span className="flex-1 text-sm font-medium truncate min-w-0">{activity.name}</span>

      {activity.discipline && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-0 shrink-0"
          style={{
            backgroundColor: getDisciplineColor(activity.discipline) + "20",
            color: getDisciplineColor(activity.discipline),
          }}
        >
          {activity.discipline}
        </Badge>
      )}

      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
        {activity.area_m2 != null ? `${activity.area_m2} m²` : "-"}
      </span>
      <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
        {activity.duration_days != null ? `${activity.duration_days}d` : "-"}
      </span>

      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 border-0 shrink-0 w-20 justify-center"
        style={{ backgroundColor: status.color + "15", color: status.color }}
      >
        {status.label}
      </Badge>

      {predecessor ? (
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 w-20 shrink-0 truncate">
          <Link2 className="h-3 w-3" /> {predecessor.name.substring(0, 12)}
        </span>
      ) : (
        <span className="w-20 shrink-0" />
      )}

      {activity.progress_percent > 0 && (
        <div className="flex items-center gap-1 w-16 shrink-0">
          <Progress value={activity.progress_percent} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground">{activity.progress_percent}%</span>
        </div>
      )}
      {activity.progress_percent === 0 && <span className="w-16 shrink-0" />}

      <div className="flex gap-0.5 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(activity)} className="p-1 rounded hover:bg-muted">
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
        <ConfirmDeleteDialog title="Excluir esta atividade do escopo?" onConfirm={() => onRemove(activity.id)}>
          <button className="p-1 rounded hover:bg-destructive/10" aria-label="Excluir atividade">
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </ConfirmDeleteDialog>
      </div>
    </div>
  );
}

export function ProjectScopeTab({ projectId }: ProjectScopeTabProps) {
  const { activities, isLoading, create, update, remove } = useProjectActivities(projectId);
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ProjectActivity> | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [groupByDiscipline, setGroupByDiscipline] = useState(true);
  const [disciplineFilter, setDisciplineFilter] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [sequenceSuggestions, setSequenceSuggestions] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const allDisciplines = useMemo(() => {
    const set = new Set<string>();
    activities.forEach(a => { if (a.discipline) set.add(a.discipline); });
    return Array.from(set).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    let list = [...activities];
    if (disciplineFilter.length > 0) {
      list = list.filter(a => a.discipline && disciplineFilter.includes(a.discipline));
    }
    return list;
  }, [activities, disciplineFilter]);

  const grouped = useMemo(() => {
    if (!groupByDiscipline) return null;
    const map: Record<string, ProjectActivity[]> = {};
    filtered.forEach(a => {
      const key = a.discipline || "Sem disciplina";
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupByDiscipline]);

  const handleSubmit = (data: Partial<ProjectActivity>) => {
    if (data.id) {
      const { id, ...rest } = data;
      update.mutate({ id, ...rest });
    } else {
      create.mutate(data);
    }
    setEditingItem(null);
  };

  const handleEdit = (item: ProjectActivity) => { setEditingItem(item); setFormOpen(true); };
  const handleNew = () => { setEditingItem(null); setFormOpen(true); };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const target = activities.find(a => a.id === targetId);
    if (target) update.mutate({ id: dragId, position: target.position });
    setDragId(null);
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const rowProps = {
    onEdit: handleEdit,
    onRemove: (id: string) => remove.mutate(id),
    onDragStart,
    onDragOver,
    onDrop,
    allActivities: activities,
  };

  const hasDependencies = useMemo(() => activities.some(a => a.depends_on?.length > 0), [activities]);

  const handleClearSequence = async () => {
    const withDeps = activities.filter(a => a.depends_on?.length > 0);
    if (withDeps.length === 0) return;
    await Promise.all(
      withDeps.map(a =>
        supabase.from("project_activities").update({ depends_on: [] } as any).eq("id", a.id)
      )
    );
    queryClient.invalidateQueries({ queryKey: ["project_activities", projectId] });
    toast.success("Dependências de sequenciamento removidas.");
  };

  const handleSuggestSequence = async () => {
    if (activities.length < 2) { toast.error("Adicione pelo menos 2 atividades"); return; }
    setSequenceLoading(true);
    setSequenceDialogOpen(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-ai-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          action: "sequence",
          data: { activities: activities.map(a => ({ id: a.id, name: a.name, discipline: a.discipline, depends_on: a.depends_on })) },
        }),
      });
      if (!resp.ok) throw new Error("Erro ao gerar sugestão");
      const result = await resp.json();
      setSequenceSuggestions(result.suggestions || []);
      setSelectedSuggestions(new Set((result.suggestions || []).map((s: any) => s.activity_id)));
    } catch (err: any) {
      toast.error(err.message || "Erro ao sugerir sequenciamento");
      setSequenceDialogOpen(false);
    } finally {
      setSequenceLoading(false);
    }
  };

  const handleApplySequence = async () => {
    for (const s of sequenceSuggestions) {
      if (!selectedSuggestions.has(s.activity_id)) continue;
      const updateData: any = { id: s.activity_id, position: s.suggested_position };
      if (s.depends_on_activity_id) {
        updateData.depends_on = [s.depends_on_activity_id];
      }
      update.mutate(updateData);
    }
    toast.success("Sequenciamento aplicado com sucesso");
    setSequenceDialogOpen(false);
    setSequenceSuggestions([]);
  };

  let globalIndex = 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold text-display">Escopo da Obra</h3>
          <p className="text-sm text-muted-foreground">
            {activities.length} atividade{activities.length !== 1 ? "s" : ""} no escopo
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MultiSelectFilter
            label="Disciplina"
            options={allDisciplines}
            selected={disciplineFilter}
            onChange={setDisciplineFilter}
          />
          <div className="flex items-center gap-1.5">
            <Switch checked={groupByDiscipline} onCheckedChange={setGroupByDiscipline} id="group-toggle" />
            <label htmlFor="group-toggle" className="text-xs text-muted-foreground cursor-pointer">Agrupar</label>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSupplierDialogOpen(true)}>
            <Users className="h-4 w-4 mr-1" /> Escopo Fornecedor
          </Button>
          <Button variant="outline" size="sm" onClick={handleSuggestSequence} disabled={sequenceLoading}>
            <Wand2 className="h-4 w-4 mr-1" /> Sugerir Sequenciamento
          </Button>
          {hasDependencies && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={handleClearSequence} title="Remover todas as dependências entre atividades">
              <RotateCcw className="h-4 w-4 mr-1" /> Limpar Sequenciamento
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Gerar com IA
          </Button>
          <Button onClick={handleNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nova Atividade
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma atividade cadastrada. Clique em "Nova Atividade" para começar.
        </div>
      ) : groupByDiscipline && grouped ? (
        <div className="space-y-2">
          {grouped.map(([disc, items]) => {
            const startIdx = globalIndex + 1;
            const isOpen = !collapsedGroups.has(disc);
            return (
              <Collapsible key={disc} open={isOpen} onOpenChange={() => toggleGroup(disc)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: getDisciplineColor(disc) }}
                    />
                    <span className="text-sm font-medium">{disc}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                      {items.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-lg mt-1 overflow-hidden">
                    {items.map((activity) => {
                      globalIndex++;
                      return (
                        <ActivityRow
                          key={activity.id}
                          activity={activity}
                          index={globalIndex}
                          {...rowProps}
                        />
                      );
                    })}
                  </div>
                </CollapsibleContent>
                {!isOpen && (() => { globalIndex += items.length; return null; })()}
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {filtered.map((activity, i) => (
            <ActivityRow key={activity.id} activity={activity} index={i + 1} {...rowProps} />
          ))}
        </div>
      )}

      <ActivityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingItem}
        allActivities={activities}
        projectId={projectId}
        isLoading={create.isPending || update.isPending}
      />

      <GenerateActivitiesDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        projectId={projectId}
        existingCount={activities.length}
        onCreate={(data) => create.mutate(data)}
      />

      <SupplierScopeDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        projectId={projectId}
        activities={activities}
      />

      {/* Sequence Suggestion Dialog */}
      <Dialog open={sequenceDialogOpen} onOpenChange={setSequenceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sugestão de Sequenciamento</DialogTitle>
          </DialogHeader>
          {sequenceLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analisando dependências técnicas...</p>
            </div>
          ) : sequenceSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma sugestão gerada.</p>
          ) : (
            <>
              <div className="border rounded-lg divide-y max-h-[50vh] overflow-y-auto">
                {sequenceSuggestions.map((s: any) => (
                  <div key={s.activity_id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                    <Checkbox
                      checked={selectedSuggestions.has(s.activity_id)}
                      onCheckedChange={(checked) => {
                        setSelectedSuggestions(prev => {
                          const next = new Set(prev);
                          checked ? next.add(s.activity_id) : next.delete(s.activity_id);
                          return next;
                        });
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5">{s.suggested_position}</Badge>
                        <span className="font-medium truncate">{s.activity_name}</span>
                      </div>
                      {s.depends_on_activity_name && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Link2 className="h-3 w-3" /> Após: {s.depends_on_activity_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSequenceDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleApplySequence} disabled={selectedSuggestions.size === 0}>
                  <Check className="h-4 w-4 mr-1" /> Aplicar Selecionados ({selectedSuggestions.size})
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
