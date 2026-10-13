import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Pencil, Trash2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  cotado: { label: "Cotado", variant: "secondary" },
  aprovado: { label: "Aprovado", variant: "default" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
};

interface BudgetQuoteTableProps {
  quotes: Record<string, unknown>[];
  onEdit: (quote: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onApprove: (quote: Record<string, unknown>) => void;
}

/**
 * Cotações em linhas, não em cards.
 *
 * Uma obra chega a ter dezenas de cotações numa disciplina só; em card,
 * cada uma ocupava um bloco com valor, prazo, pagamento e três botões, e a
 * tela virava um paredão. Aqui a linha mostra só o que identifica a cotação
 * (serviço, fornecedor, valores e status) e o resto — prazo, pagamento,
 * descrição completa e as ações — aparece ao clicar.
 */
export function BudgetQuoteTable({ quotes, onEdit, onDelete, onApprove }: BudgetQuoteTableProps) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const alternar = (id: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead>Serviço</TableHead>
            <TableHead className="w-44">Fornecedor</TableHead>
            <TableHead className="w-32 text-right">Serviço</TableHead>
            <TableHead className="w-32 text-right">Material</TableHead>
            <TableHead className="w-24">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((q) => {
            const id = q.id as string;
            const aberto = expandidos.has(id);
            const aprovado = q.status === "aprovado";
            const fornecedor =
              (q.suppliers as { name: string } | null)?.name ||
              (q.supplier_name as string) ||
              "Não informado";
            const statusInfo = statusConfig[(q.status as string) || "pendente"];
            const descricao = (q.services_description as string) || "Sem descrição";

            return (
              <Fragment key={id}>
                <TableRow
                  role="button"
                  tabIndex={0}
                  aria-expanded={aberto}
                  onClick={() => alternar(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      alternar(id);
                    }
                  }}
                  className={cn(
                    "cursor-pointer",
                    aprovado && "bg-success/5 hover:bg-success/10",
                    aberto && !aprovado && "bg-muted/40",
                  )}
                >
                  <TableCell className="py-2 pr-0 text-muted-foreground">
                    {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </TableCell>
                  <TableCell className="py-2 font-medium">
                    <span className="flex items-start gap-1.5">
                      {aprovado && <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />}
                      {/* Aberta, a linha mostra a descrição inteira — por isso o
                          detalhe abaixo não a repete. */}
                      <span className={aberto ? undefined : "line-clamp-1"}>{descricao}</span>
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-muted-foreground">
                    <span className="line-clamp-1">{fornecedor}</span>
                  </TableCell>
                  <TableCell className="py-2 text-right font-semibold tabular-nums">
                    {formatCurrency(q.value as number)}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(q.material_estimate as number)}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant={statusInfo.variant} className="text-[10px]">
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                </TableRow>

                {aberto && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="bg-muted/20 py-3">
                      <div className="space-y-3 pl-6">
                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                          <div>
                            <span className="block text-xs text-muted-foreground">Prazo de entrega</span>
                            <span>{(q.delivery_time as string) || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Forma de pagamento</span>
                            <span>{(q.payment_terms as string) || "—"}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Total</span>
                            <span className="font-semibold tabular-nums">
                              {formatCurrency(
                                ((q.value as number) || 0) + ((q.material_estimate as number) || 0),
                              )}
                            </span>
                          </div>
                        </div>
                        {/* Ações só aqui dentro: em card elas ficavam sempre à
                            mostra e multiplicavam por cotação. */}
                        <div className="flex flex-wrap gap-1 border-t border-border pt-2">
                          {!aprovado && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onApprove(q)}>
                              <CheckCircle className="mr-1 h-3 w-3" /> Aprovar
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onEdit(q)}>
                            <Pencil className="mr-1 h-3 w-3" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => onDelete(id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Remover
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
