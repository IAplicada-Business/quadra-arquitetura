import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { handleDeleteError } from "@/lib/handleDeleteError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { PROJECT_NUMBERS_QUERY_KEY, prepareProjectNumber } from "@/hooks/useProjectNumbers";
import {
  PROJECT_STATUSES,
  statusLabels,
  statusColors,
} from "@/lib/projectConstants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, subMonths, startOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeLabels: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  saude: "Saúde",
  outro: "Outro",
};

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Record<string, unknown> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (raw: Record<string, unknown>) => {
      // Código digitado no formulário (ou sugestão automática), revalidado no banco.
      const data = await prepareProjectNumber(raw);

      const insertData = {
        name: data.name as string,
        client_id: (data.client_id as string) || null,
        status: (data.status as "proposta" | "contrato" | "projeto" | "planejamento" | "mobilizacao" | "execucao" | "concluido") || "proposta",
        project_type: (data.project_type as "residencial" | "comercial" | "saude" | "outro") || "residencial",
        address: (data.address as string) || null,
        neighborhood: (data.neighborhood as string) || null,
        city: (data.city as string) || null,
        area_sqm: (data.area_sqm as number) || null,
        start_date: (data.start_date as string) || null,
        expected_end_date: (data.expected_end_date as string) || null,
        estimated_budget: (data.estimated_budget as number) || null,
        finish_level: (data.finish_level as number) || null,
        user_id: user!.id,
        client_move_in_date: (data.client_move_in_date as string) || null,
        sub_status: (data.sub_status as string) || null,
        project_number: (data.project_number as string) || null,
      };
      const { error } = await supabase.from("projects").insert([insertData] as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: PROJECT_NUMBERS_QUERY_KEY });
      setFormOpen(false);
      toast({ title: "Projeto criado com sucesso" });
    },
    onError: (e: Error) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...raw }: { id: string } & Record<string, unknown>) => {
      const data = await prepareProjectNumber(raw, id);
      const { error } = await supabase.from("projects").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: PROJECT_NUMBERS_QUERY_KEY });
      setFormOpen(false);
      setEditingProject(null);
      toast({ title: "Projeto atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteId(null);
      toast({ title: "Projeto excluído" });
    },
    onError: (e: any) => handleDeleteError(e, "projects"),
  });

  const filteredProjects = (projects ?? []).filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.clients as { name: string } | null)?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesType = typeFilter === "all" || p.project_type === typeFilter;
    let matchesPeriod = true;
    if (periodFilter !== "all" && p.start_date) {
      const d = new Date(p.start_date);
      const now = new Date();
      if (periodFilter === "este_mes") matchesPeriod = d >= startOfMonth(now);
      else if (periodFilter === "ultimo_mes") matchesPeriod = d >= startOfMonth(subMonths(now, 1)) && d < startOfMonth(now);
      else if (periodFilter === "3_meses") matchesPeriod = d >= subMonths(now, 3);
      else if (periodFilter === "este_ano") matchesPeriod = d >= startOfYear(now);
    }
    return matchesSearch && matchesStatus && matchesType && matchesPeriod;
  });

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id as string, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (project: Record<string, unknown>) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingProject(null);
    setFormOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-display">Projetos</h1>
          <p className="text-muted-foreground text-sm">Pipeline de projetos e gestão de obra</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Projeto
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projeto ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(["residencial", "comercial", "saude", "outro"] as const).map((t) => (
              <SelectItem key={t} value={t}>{typeLabels[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Período (início)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="este_mes">Este mês</SelectItem>
            <SelectItem value="ultimo_mes">Mês passado</SelectItem>
            <SelectItem value="3_meses">Últimos 3 meses</SelectItem>
            <SelectItem value="este_ano">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg text-muted-foreground">
          {projects?.length === 0
            ? 'Nenhum projeto cadastrado. Clique em "Novo Projeto" para começar.'
            : "Nenhum projeto encontrado com os filtros atuais."}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <TableCell className="font-medium">
                    {(p as any).project_number ? (
                      <Badge variant="outline" className="text-xs font-mono mr-2">{(p as any).project_number}</Badge>
                    ) : null}
                    {p.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(p.clients as { name: string } | null)?.name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[p.status || ""] || "bg-muted text-muted-foreground"} variant="outline">
                      {statusLabels[p.status || ""] || p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{typeLabels[p.project_type || ""] || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {p.start_date ? format(new Date(p.start_date), "dd/MM/yy", { locale: ptBR }) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/projects/${p.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(p as Record<string, unknown>)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingProject}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os dados do projeto (escopo, orçamentos, etc.) serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
