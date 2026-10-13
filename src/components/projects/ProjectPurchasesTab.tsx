import { useState } from "react";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjectPurchases } from "@/hooks/useProjectPurchases";
import { PurchaseForm } from "./PurchaseForm";

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "A Comprar", className: "bg-warning/15 text-warning-ink border-warning/30" },
  comprado: { label: "Comprado", className: "bg-primary/15 text-primary border-primary/30" },
  entregue: { label: "Entregue", className: "bg-success/15 text-success border-success/30" },
  instalado: { label: "Instalado", className: "bg-muted text-muted-foreground border-border" },
};

export function ProjectPurchasesTab({ projectId }: { projectId: string }) {
  const { items, isLoading, create, update, remove } = useProjectPurchases(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const total = items.reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-display">Lista de Compras</h3>
          <p className="text-sm text-muted-foreground">
            {items.length} itens • Total: {formatCurrency(total)}
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Compra
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          Nenhuma compra cadastrada.
        </div>
      ) : (
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material/Serviço</TableHead>
                <TableHead>Local</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Data Limite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Espec.</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const st = statusConfig[item.status || "pendente"];
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>{item.name}</div>
                      {item.category && <div className="text-xs text-muted-foreground">{item.category}</div>}
                    </TableCell>
                    <TableCell>{item.supplier_name || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.value)}</TableCell>
                    <TableCell>{formatDate(item.deadline)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={st.className}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.specifications ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-primary cursor-help underline underline-offset-2">Ver</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">{item.specifications}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.product_link && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={item.product_link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
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
        </TooltipProvider>
      )}

      <PurchaseForm
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
      />
    </div>
  );
}
