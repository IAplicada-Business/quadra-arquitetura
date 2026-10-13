import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, LayoutGrid, List, MapPin, Calendar, Ruler, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  PROJECT_STATUSES,
  statusLabels,
  statusEmojis,
  type ProjectStatus,
} from "@/lib/projectConstants";
import { PageTitle } from "@/components/layout/PageTitle";

const columnBorderColors: Record<string, string> = {
  proposta: "border-muted",
  contrato: "border-primary",
  projeto: "border-blue-400",
  planejamento: "border-indigo-400",
  mobilizacao: "border-amber-400",
  execucao: "border-orange-400",
  concluido: "border-green-400",
};

const headerBgColors: Record<string, string> = {
  proposta: "bg-muted/30",
  contrato: "bg-primary/10",
  projeto: "bg-blue-100/60",
  planejamento: "bg-indigo-100/60",
  mobilizacao: "bg-amber-100/60",
  execucao: "bg-orange-100/60",
  concluido: "bg-green-100/60",
};

const typeLabels: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Corporativo",
  saude: "Health Care",
  outro: "Outro",
};

interface ProjectRow {
  id: string;
  name: string;
  status: ProjectStatus;
  project_number: string | null;
  project_type: string | null;
  address: string | null;
  area_sqm: number | null;
  start_date: string | null;
  sub_status: string | null;
  clients: { name: string } | null;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export default function ProjectsKanban() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects_kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, name, status, project_number, project_type, address, area_sqm, start_date, sub_status, clients(name)",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectRow[];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase.from("projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects_kanban"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: `Projeto movido para ${statusLabels[vars.status]}` });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao mover", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    let result = projects;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.project_number || "").toLowerCase().includes(q) ||
          (p.clients?.name || "").toLowerCase().includes(q),
      );
    }
    if (filterType !== "todos") {
      result = result.filter((p) => p.project_type === filterType);
    }
    return result;
  }, [projects, search, filterType]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStatus(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, newStatus: ProjectStatus) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      setDraggingId(null);
      setDragOverStatus(null);
      if (!id) return;
      const project = projects.find((p) => p.id === id);
      if (!project || project.status === newStatus) return;
      updateStatus.mutate({ id, status: newStatus });
    },
    [projects, updateStatus],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title="Kanban de Projetos" description="Visão macro de todos os projetos por fase. Arraste para mover." />
        <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
          <List className="h-4 w-4 mr-1" /> Ver lista
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar projeto, nº, cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          {["todos", "residencial", "comercial", "saude"].map((t) => (
            <Button
              key={t}
              size="sm"
              variant={filterType === t ? "default" : "outline"}
              className="text-xs h-8"
              onClick={() => setFilterType(t)}
            >
              {t === "todos" ? "Todos" : typeLabels[t] || t}
            </Button>
          ))}
        </div>
        <div className="flex-1" />
        <Badge variant="outline" className="text-xs">
          <LayoutGrid className="h-3 w-3 mr-1" />
          {filtered.length} {filtered.length === 1 ? "projeto" : "projetos"}
        </Badge>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
        {PROJECT_STATUSES.map((status) => {
          const items = filtered.filter((p) => p.status === status);
          const isOver = dragOverStatus === status;
          return (
            <div
              key={status}
              className="min-w-[260px] w-[260px] flex-shrink-0 flex flex-col"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragEnter={() => setDragOverStatus(status)}
              onDragLeave={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const { clientX, clientY } = e;
                if (
                  clientX < rect.left ||
                  clientX > rect.right ||
                  clientY < rect.top ||
                  clientY > rect.bottom
                ) {
                  if (dragOverStatus === status) setDragOverStatus(null);
                }
              }}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div
                className={`rounded-t-lg px-3 py-2 border ${columnBorderColors[status]} ${headerBgColors[status]} font-medium text-sm flex items-center justify-between`}
              >
                <span>{statusLabels[status]}</span>
                <Badge variant="outline" className="text-[10px] bg-background">
                  {items.length}
                </Badge>
              </div>
              <div
                className={`border border-t-0 rounded-b-lg bg-muted/20 flex-1 p-2 space-y-2 overflow-y-auto transition-all duration-200 ${
                  isOver ? `border-2 border-dashed ${columnBorderColors[status]} bg-accent/20` : ""
                }`}
              >
                {items.map((project) => (
                  <Card
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    onDragEnd={handleDragEnd}
                    className={`shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
                      draggingId === project.id ? "opacity-50" : ""
                    }`}
                    onClick={(e) => {
                      // Não navega se estiver começando o drag
                      if (draggingId) return;
                      // Ignora clique no handle
                      const target = e.target as HTMLElement;
                      if (target.closest("[data-dnd-handle]")) return;
                      navigate(`/projects/${project.id}`);
                    }}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start gap-1">
                        <GripVertical
                          data-dnd-handle
                          className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {project.project_number && (
                              <Badge variant="outline" className="text-[10px] font-mono h-5">
                                {project.project_number}
                              </Badge>
                            )}
                            <p className="font-semibold text-sm leading-tight hover:underline">
                              {project.name}
                            </p>
                          </div>
                          {project.clients?.name && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {project.clients.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {project.sub_status && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {project.sub_status}
                        </Badge>
                      )}

                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {project.project_type && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {typeLabels[project.project_type] || project.project_type}
                          </span>
                        )}
                        {project.area_sqm != null && (
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3 w-3" />
                            {project.area_sqm} m²
                          </span>
                        )}
                        {project.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(project.start_date)}
                          </span>
                        )}
                      </div>

                      {project.address && (
                        <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{project.address}</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {items.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground/60 py-6 italic">
                    Sem projetos nesta fase
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
