import { useState } from "react";
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle, Hammer, HardHat, MapPin, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { PROJECT_NUMBERS_QUERY_KEY, prepareProjectNumber } from "@/hooks/useProjectNumbers";
import { DuplicateProjectNumberError } from "@/lib/projectNumber";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SiteTracking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: projects = [] } = useQuery({
    queryKey: ["active_projects_tracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name)")
        .in("status", ["mobilizacao", "execucao"])
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const projectIds = projects.map((p) => p.id);

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["tracking_pending_count", projectIds],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pending_items")
        .select("*", { count: "exact", head: true })
        .in("project_id", projectIds)
        .neq("status", "resolvido");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: projectIds.length > 0,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const { data: deliveriesToday = 0 } = useQuery({
    queryKey: ["tracking_deliveries_today", projectIds, todayStr],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("schedule_tasks")
        .select("*", { count: "exact", head: true })
        .in("project_id", projectIds)
        .eq("end_date", todayStr);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: projectIds.length > 0,
  });

  const { data: visitsThisWeek = 0 } = useQuery({
    queryKey: ["tracking_visits_week", projectIds, todayStr, weekEndStr],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true })
        .in("project_id", projectIds)
        .gte("visit_date", todayStr)
        .lte("visit_date", weekEndStr);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: projectIds.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (raw: Record<string, unknown>) => {
      const values = await prepareProjectNumber(raw);
      const { error } = await supabase.from("projects").insert({ ...values, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active_projects_tracking"] });
      queryClient.invalidateQueries({ queryKey: PROJECT_NUMBERS_QUERY_KEY });
      toast.success("Obra criada com sucesso!");
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e instanceof DuplicateProjectNumberError ? e.message : "Erro ao criar obra."),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { id, ...raw } = values;
      const rest = await prepareProjectNumber(raw, id as string);
      const { error } = await supabase.from("projects").update(rest as any).eq("id", id as string);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active_projects_tracking"] });
      queryClient.invalidateQueries({ queryKey: PROJECT_NUMBERS_QUERY_KEY });
      toast.success("Obra atualizada!");
      setFormOpen(false);
      setEditingProject(null);
    },
    onError: (e: Error) => toast.error(e instanceof DuplicateProjectNumberError ? e.message : "Erro ao atualizar obra."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active_projects_tracking"] });
      toast.success("Obra excluída!");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir obra."),
  });

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingProject) {
      updateMutation.mutate({ ...data, id: editingProject.id });
    } else {
      createMutation.mutate({ ...data, status: data.status || "execucao" });
    }
  };

  const handleNewObra = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const filtered = projects.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const order = { execucao: 0, mobilizacao: 1 };
    return (order[a.status as keyof typeof order] ?? 2) - (order[b.status as keyof typeof order] ?? 2);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-display">Acompanhamento de Obras</h1>
          <p className="text-muted-foreground">Projetos em Mobilização ou Execução aparecem automaticamente aqui. Você também pode criar obras diretamente.</p>
        </div>
        <Button onClick={handleNewObra}><Plus className="h-4 w-4 mr-2" />Nova Obra</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Hammer className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Obras Ativas</p>
              <p className="text-2xl font-bold text-primary">{projects.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-warning/10 rounded-full text-warning-ink">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Pendências</p>
              <p className="text-2xl font-bold text-warning-ink">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-full text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Entregas Hoje</p>
              <p className="text-2xl font-bold text-success">{deliveriesToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-full text-accent-ink">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Visitas Semana</p>
              <p className="text-2xl font-bold text-accent-ink">{visitsThisWeek}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Input placeholder="Buscar obra..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-56 h-9" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="execucao">Em Execução</SelectItem>
            <SelectItem value="mobilizacao">Mobilização</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <h2 className="text-lg font-semibold text-display mt-8 mb-4">Progresso das Obras</h2>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
            Nenhuma obra em fase de execução ou mobilização.
          </div>
        ) : (
          sorted.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Status indicator dot */}
                  <div className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-primary/10">
                    <HardHat className="h-5 w-5 text-primary" />
                  </div>
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">{project.name}</p>
                      <Badge variant="secondary" className="capitalize shrink-0 text-xs">{project.status === "execucao" ? "Em Execução" : project.status === "mobilizacao" ? "Mobilização" : project.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{(project.clients as any)?.name || "—"}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${project.finish_level || 0}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground shrink-0">{project.finish_level || 0}%</span>
                    </div>
                  </div>
                  {/* Right side: date + city + actions */}
                  <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{project.start_date ? format(new Date(project.start_date), "dd/MM/yy") : "—"}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{project.city || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/projects/${project.id}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />Ver
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(project)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(project.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ProjectForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingProject(null); }}
        onSubmit={handleSubmit}
        initialData={editingProject}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Obra</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta obra? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
