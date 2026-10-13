// Sprint 6 — Vobi-like central. Visão unificada de todas as tarefas
// Quadra: por obra, sem obra (pessoais), com filtros, tags, prazo,
// recorrência. Kanban + Lista + Calendário.
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceTasks, type VoiceTask } from "@/hooks/useVoiceTasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KanbanBoard, KanbanColumn, kanbanListClass, kanbanCardClass } from "@/components/visual/KanbanLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutGrid, List, CalendarRange, Plus, Trash2, CheckCircle2, Repeat, Tag, ListChecks, Loader2,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { VoiceTaskForm } from "@/components/construction/VoiceTaskForm";

const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-primary/10 text-primary",
  alta: "bg-warning/10 text-warning-ink",
  urgente: "bg-destructive/10 text-destructive",
};

const KANBAN_COLUMNS = [
  { status: "pendente", label: "A fazer", tone: "bg-muted/30" },
  { status: "em_andamento", label: "Em andamento", tone: "bg-primary/5" },
  { status: "concluido", label: "Concluído", tone: "bg-success/5" },
];

const PROJECT_NONE = "__none__";
const PROJECT_ALL = "all";

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isOverdue(t: VoiceTask, todayIso: string) {
  return t.due_date && t.due_date < todayIso && t.status !== "concluido";
}

/**
 * Sprint 7 — `mode` controla o pré-filtro de projeto:
 *  - "all"     : Quadra + projetos
 *  - "quadra"  : só sem projeto (pessoal)
 *  - "projects": só com project_id (todas as obras)
 */
interface TasksHubProps {
  mode?: "all" | "quadra" | "projects";
  title?: string;
}

export default function TasksHub({ mode = "all", title }: TasksHubProps) {
  const { user } = useAuth();
  const [view, setView] = useState<"kanban" | "lista" | "agenda">("kanban");
  const initialProjectFilter =
    mode === "quadra" ? PROJECT_NONE : PROJECT_ALL;
  const [filterProject, setFilterProject] = useState(initialProjectFilter);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterTag, setFilterTag] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_list"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const projectFilterParam = filterProject === PROJECT_ALL ? undefined : filterProject;
  const { tasks, isLoading, update, remove, createOne, isCreatingOne } = useVoiceTasks(projectFilterParam);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      // Filtro forçado por modo (sobrepõe o filterProject quando aplicável).
      if (mode === "quadra" && t.project_id) return false;
      if (mode === "projects" && !t.project_id) return false;
      if (filterProject === PROJECT_NONE && t.project_id) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterTag && !(t.tags ?? []).some((tg) => tg.toLowerCase().includes(filterTag.toLowerCase()))) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, mode, filterProject, filterCategory, filterPriority, filterTag, search]);

  const projectsMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  // KPIs
  const personalCount = filtered.filter((t) => !t.project_id).length;
  const overdueCount = filtered.filter((t) => isOverdue(t, todayIso)).length;
  const todayCount = filtered.filter((t) => t.due_date === todayIso).length;
  const recurringCount = filtered.filter((t) => t.is_recurring).length;

  // Kanban grouping
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
    update({ id: result.draggableId, status: result.destination.droppableId });
  };

  // Calendar grouping by due_date
  const byDate = useMemo(() => {
    const map = new Map<string, VoiceTask[]>();
    for (const t of filtered) {
      if (!t.due_date) continue;
      const arr = map.get(t.due_date) ?? [];
      arr.push(t);
      map.set(t.due_date, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className={`flex flex-col gap-6 ${view === "kanban" ? "flex-1 md:min-h-0" : ""}`}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-light">
            {title ?? (mode === "quadra" ? "Kanban Quadra" : mode === "projects" ? "Kanban Projetos" : "Tarefas Quadra")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "quadra"
              ? "Tarefas internas da Quadra (sem vínculo a uma obra específica)."
              : mode === "projects"
              ? "Tarefas vinculadas às obras em andamento."
              : "Centro de tarefas pessoais e por obra. Por voz, por digitação ou geradas automaticamente."}
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total filtrado</p>
            <p className="text-2xl font-display">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pessoais (sem obra)</p>
            <p className="text-2xl font-display">{personalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Vence hoje</p>
            <p className="text-2xl font-display text-accent-ink">{todayCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Atrasadas</p>
            <p className="text-2xl font-display text-destructive">{overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + view switch */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-48 h-9" />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-full sm:w-[220px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={PROJECT_ALL}>Todas as obras + pessoais</SelectItem>
            <SelectItem value={PROJECT_NONE}>Só tarefas pessoais (sem obra)</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="cronograma">Cronograma</SelectItem>
            <SelectItem value="escopo">Escopo</SelectItem>
            <SelectItem value="orcamentos">Orçamentos</SelectItem>
            <SelectItem value="materiais">Materiais</SelectItem>
            <SelectItem value="pendencias">Pendências</SelectItem>
            <SelectItem value="financeiro">Financeiro</SelectItem>
            <SelectItem value="compras">Compras</SelectItem>
            <SelectItem value="documentos">Documentos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Tag className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="tag"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="w-32 h-9 pl-7"
          />
        </div>
        <div className="flex-1" />
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" /> Kanban</TabsTrigger>
            <TabsTrigger value="lista" className="gap-1.5"><List className="h-3.5 w-3.5" /> Lista</TabsTrigger>
            <TabsTrigger value="agenda" className="gap-1.5"><CalendarRange className="h-3.5 w-3.5" /> Agenda</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : view === "kanban" ? (
        topLevel.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma tarefa com esses filtros.
          </CardContent></Card>
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
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">Pessoal</Badge>
                                  )}
                                  <Badge className={`text-[10px] h-4 px-1.5 ${priorityColors[task.priority]}`}>
                                    {task.priority}
                                  </Badge>
                                  {task.is_recurring && (
                                    <span title={task.recurrence_rule ?? "Recorrente"}>
                                      <Repeat className="h-3 w-3 text-accent-ink" />
                                    </span>
                                  )}
                                  {task.tags?.map((tg) => (
                                    <span key={tg} className="text-[10px] text-muted-foreground">#{tg}</span>
                                  ))}
                                  {task.due_date && (
                                    <span className={`text-[10px] ${isOverdue(task, todayIso) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                      {fmtDate(task.due_date)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-end gap-1 mt-2">
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
      ) : view === "lista" ? (
        <Card>
          <CardContent className="p-0 divide-y">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground">
                Nenhuma tarefa com esses filtros.
              </p>
            ) : (
              filtered.map((task) => (
                <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => update({ id: task.id, status: task.status === "concluido" ? "pendente" : "concluido" })}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${task.status === "concluido" ? "text-success" : "text-muted-foreground"}`} />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.status === "concluido" ? "line-through text-muted-foreground" : "font-medium"}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {task.project_id ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{projectsMap[task.project_id]}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">Pessoal</Badge>
                      )}
                      <Badge className={`text-[10px] h-4 px-1.5 ${priorityColors[task.priority]}`}>{task.priority}</Badge>
                      {task.is_recurring && <Repeat className="h-3 w-3 text-accent-ink" />}
                      {task.tags?.map((tg) => (
                        <span key={tg} className="text-[10px] text-muted-foreground">#{tg}</span>
                      ))}
                      {task.due_date && (
                        <span className={`text-[10px] ${isOverdue(task, todayIso) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {fmtDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : (
        // Agenda view: agrupada por due_date.
        <Card>
          <CardContent className="p-0 divide-y">
            {byDate.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground">
                Nenhuma tarefa com prazo definido nos filtros aplicados.
              </p>
            ) : (
              byDate.map(([date, items]) => (
                <div key={date} className="px-4 py-3">
                  <p className={`text-xs font-semibold mb-2 ${date < todayIso ? "text-destructive" : date === todayIso ? "text-accent-ink" : "text-foreground"}`}>
                    {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map((task) => (
                      <li key={task.id} className="flex items-center gap-2 text-sm">
                        <ListChecks className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className={task.status === "concluido" ? "line-through text-muted-foreground" : ""}>
                          {task.title}
                        </span>
                        {task.project_id && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{projectsMap[task.project_id]}</Badge>
                        )}
                        {task.is_recurring && <Repeat className="h-3 w-3 text-accent-ink" />}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <VoiceTaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projects={projects}
        defaultProjectId={filterProject !== PROJECT_ALL && filterProject !== PROJECT_NONE ? filterProject : undefined}
        isLoading={isCreatingOne}
        onSubmit={async (data) => { await createOne(data as any); }}
      />
    </div>
  );
}
