import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePendingItems } from "@/hooks/usePendingItems";
import { useScopeItems } from "@/hooks/useScopeItems";
import { PendingItemForm } from "./PendingItemForm";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-destructive/15 text-destructive border-destructive/30" },
  em_andamento: { label: "Em Andamento", className: "bg-warning/15 text-warning-ink border-warning/30" },
  resolvido: { label: "Resolvido", className: "bg-success/15 text-success border-success/30" },
};

export function ProjectPendingTab({ projectId }: { projectId: string }) {
  const { items, isLoading, create, update, remove } = usePendingItems(projectId);
  const { items: scopeItems } = useScopeItems(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDiscipline, setFilterDiscipline] = useState<string>("all");

  const disciplines = useMemo(() => {
    const set = new Set(items.map((i) => i.discipline).filter(Boolean) as string[]);
    scopeItems.forEach((s) => set.add(s.discipline));
    return [...set].sort();
  }, [items, scopeItems]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterDiscipline !== "all" && item.discipline !== filterDiscipline) return false;
      return true;
    });
  }, [items, filterStatus, filterDiscipline]);

  const openCount = items.filter((i) => i.status !== "resolvido").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-display flex items-center gap-2">
            Pendências
            {openCount > 0 && (
              <Badge variant="destructive" className="text-xs">{openCount} abertas</Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">Controle de itens pendentes durante a obra</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Pendência
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Disciplinas</SelectItem>
            {disciplines.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          {items.length === 0 ? "Nenhuma pendência cadastrada." : "Nenhum item corresponde aos filtros."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Inclusão</TableHead>
              <TableHead>Conclusão</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const st = statusConfig[item.status || "pendente"];
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline" className={st?.className}>{st?.label || item.status}</Badge>
                  </TableCell>
                  <TableCell>{item.discipline || "—"}</TableCell>
                  <TableCell className="max-w-[250px]">{item.description}</TableCell>
                  <TableCell>{item.responsible || "—"}</TableCell>
                  <TableCell>{formatDate(item.inclusion_date)}</TableCell>
                  <TableCell>{formatDate(item.conclusion_date)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(item as Record<string, unknown>); setFormOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <PendingItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(data) => {
          if (editing) {
            update.mutate({ id: editing.id as string, ...data });
          } else {
            create.mutate(data);
          }
          setEditing(null);
        }}
        initialData={editing}
        isLoading={create.isPending || update.isPending}
        disciplines={disciplines}
      />
    </div>
  );
}
