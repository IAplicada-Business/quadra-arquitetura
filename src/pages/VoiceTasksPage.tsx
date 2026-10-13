// Sprint 4d (vídeo 16) — "Agenda" desativada; o módulo de Tarefas
// Quadra ganha vista kanban estilo Trello. A Mariana descreveu a
// agenda como inadequada para registro de cronograma e pediu uma
// lista de atividades visual (Trello-like).
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceTasks, VoiceTask } from "@/hooks/useVoiceTasks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanBoard, KanbanColumn, kanbanListClass, kanbanCardClass } from "@/components/visual/KanbanLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Clock, Plus, ListChecks, LayoutGrid, List, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { VoiceTaskForm } from "@/components/construction/VoiceTaskForm";
import { toast } from "@/hooks/use-toast";
import { PageTitle } from "@/components/layout/PageTitle";

const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-primary/10 text-primary",
  alta: "bg-warning/10 text-warning-ink",
  urgente: "bg-destructive/10 text-destructive",
};

const statusIcons: Record<string, any> = {
  pendente: Clock,
  concluido: CheckCircle2,
};

const categoryLabels: Record<string, string> = {
  cronograma: "Cronograma",
  escopo: "Escopo",
  orcamentos: "Orçamentos",
  materiais: "Materiais",
  pendencias: "Pendências",
  financeiro: "Financeiro",
  compras: "Compras",
  documentos: "Documentos",
};

const KANBAN_COLUMNS: Array<{ status: string; label: string; tone: string }> = [
  { status: "pendente", label: "A fazer", tone: "bg-muted/30" },
  { status: "em_andamento", label: "Em andamento", tone: "bg-primary/5" },
  { status: "concluido", label: "Concluído", tone: "bg-success/5" },
];

export default function VoiceTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"lista" | "kanban">("kanban");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { tasks, isLoading, update, remove, createOne, isCreatingOne } = useVoiceTasks(
    filterProject === "all" ? undefined : filterProject,
  );
  const [formOpen, setFormOpen] = useState(false);

  const filtered = tasks.filter((t) => {
    if (filterType !== "all" && t.task_type !== filterType) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by project for list view — tasks without project go to "Pessoal"
  const grouped = filtered.reduce<Record<string, { name: string; tasks: VoiceTask[] }>>((acc, task) => {
    const key = task.project_id ?? "__pessoal__";
    if (!acc[key]) {
      const proj = projects.find((p) => p.id === task.project_id);
      acc[key] = { name: proj?.name || "Pessoal / Sem projeto", tasks: [] };
    }
    acc[key].tasks.push(task);
    return acc;
  }, {});

  const projectsMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const topLevel = filtered.filter((t) => !t.parent_id);
  const byStatus: Record<string, VoiceTask[]> = {};
  for (const col of KANBAN_COLUMNS) byStatus[col.status] = [];
  for (const t of topLevel) {
    const col = byStatus[t.status] ? t.status : "pendente";
    byStatus[col].push(t);
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.droppableId === result.destination.droppableId) return;
    const newStatus = result.destination.droppableId;
    if (!KANBAN_COLUMNS.find((c) => c.status === newStatus)) return;
    update({ id: result.draggableId, status: newStatus });
  };

  const sendToKanbanQuadra = async (task: VoiceTask) => {
    if (!task.project_id) {
      toast({ title: "Tarefa já está no Kanban Quadra", description: "Esta tarefa não tem projeto vinculado." });
      return;
    }
    const { error } = await supabase
      .from("voice_tasks")
      .update({ project_id: null } as any)
      .eq("id", task.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["voice_tasks"] });
    toast({ title: "Enviada para Kanban Quadra", description: `"${task.title}" agora aparece no Kanban Quadra.` });
  };

  return (
    <div className={`flex flex-col gap-6 ${view === "kanban" ? "flex-1 md:min-h-0" : ""}`}>
      <div className="flex items-center justify-between">
        <PageTitle
          title="Audio Tasks"
          description={<>Tarefas criadas por voz, digitação ou geradas automaticamente. Use <Send className="h-3 w-3 inline-block" /> para enviar ao Kanban Quadra.</>}
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ListChecks className="h-3 w-3" />
            {tasks.length} tarefas
          </Badge>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-48 h-9" />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue placeholder="Projeto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="projeto">Projeto</SelectItem>
            <SelectItem value="obra">Obra</SelectItem>
            <SelectItem value="compras">Compras</SelectItem>
            <SelectItem value="financeiro">Financeiro</SelectItem>
            <SelectItem value="administrativo">Administrativo</SelectItem>
            <SelectItem value="geral">Geral</SelectItem>
          </SelectContent>
        </Select>
        {view === "lista" && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
            <TabsTrigger value="lista" className="gap-1.5"><List className="h-3.5 w-3.5" /> Lista</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : view === "kanban" ? (
        topLevel.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ListChecks className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
              <p className="text-sm text-muted-foreground">
                Use o botão <strong>Nova Tarefa</strong> ou o assistente de voz no header.
              </p>
            </CardContent>
          </Card>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <KanbanBoard>
              {KANBAN_COLUMNS.map((col) => (
                <KanbanColumn key={col.status} label={col.label} count={byStatus[col.status].length} tone={col.tone}>
                  <Droppable droppableId={col.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={kanbanListClass(snapshot.isDraggingOver)}
                      >
                        {byStatus[col.status].map((task, idx) => (
                          <Draggable key={task.id} draggableId={task.id} index={idx}>
                            {(p, s) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                                className={kanbanCardClass(s.isDragging)}
                              >
                                <p className="text-sm font-medium leading-snug">{task.title}</p>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  {task.project_id ? (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                      {projectsMap[task.project_id] ?? "—"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-success border-success/40">Kanban Quadra</Badge>
                                  )}
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                    {categoryLabels[task.category] || task.category}
                                  </Badge>
                                  <Badge className={`text-[10px] h-4 px-1.5 ${priorityColors[task.priority]}`}>
                                    {task.priority}
                                  </Badge>
                                  {task.responsible && (
                                    <span className="text-[10px] text-muted-foreground">→ {task.responsible}</span>
                                  )}
                                  {task.due_date && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-end gap-1 mt-2">
                                  {task.project_id && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-primary"
                                      title="Enviar para Kanban Quadra"
                                      onClick={() => sendToKanbanQuadra(task)}
                                    >
                                      <Send className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => remove(task.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </KanbanColumn>
              ))}
            </KanbanBoard>
          </DragDropContext>
        )
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ListChecks className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([key, group]) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {group.name}
                {key === "__pessoal__" && (
                  <Badge variant="outline" className="text-[10px] text-success border-success/40">Kanban Quadra</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.tasks
                .filter((t) => !t.parent_id)
                .map((task) => {
                  const subtasks = group.tasks.filter((t) => t.parent_id === task.id);
                  const StatusIcon = statusIcons[task.status] || Clock;
                  return (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <StatusIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{task.title}</p>
                            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px] h-5">{categoryLabels[task.category] || task.category}</Badge>
                              <Badge className={`text-[10px] h-5 ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                              {task.responsible && <span className="text-[10px] text-muted-foreground">→ {task.responsible}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {task.project_id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-primary"
                              title="Enviar para Kanban Quadra"
                              onClick={() => sendToKanbanQuadra(task)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {task.status === "pendente" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => update({ id: task.id, status: "concluido" })}>
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(task.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {subtasks.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1.5 border-l-2 border-border pl-3">
                          {subtasks.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={sub.status === "concluido" ? "line-through text-muted-foreground" : ""}>{sub.title}</span>
                                {sub.responsible && <span className="text-muted-foreground">→ {sub.responsible}</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                {sub.status === "pendente" && (
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => update({ id: sub.id, status: "concluido" })}>
                                    <CheckCircle2 className="h-3 w-3 text-success" />
                                  </Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(sub.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ))
      )}

      <VoiceTaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projects={projects}
        defaultProjectId={filterProject !== "all" ? filterProject : undefined}
        isLoading={isCreatingOne}
        onSubmit={async (data) => { await createOne(data); }}
      />
    </div>
  );
}
