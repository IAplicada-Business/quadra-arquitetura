import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientClosingSchedule, type ClosingScheduleItem } from "@/hooks/useClientClosingSchedule";
import { CLOSING_STATUS_CLASS, CLOSING_STATUS_LABEL } from "@/lib/closingStatus";
import { MoveInBanner } from "./MoveInBanner";
import { InfoHint } from "@/components/visual/InfoHint";

interface Props {
  projectId: string;
  moveInDate: string | null;
}

const EMPTY_DRAFT = { description: "", delivery_date: "", closing_date: "", delivery_time: "", estimated_value: "", status: "em_cotacao" as ClosingScheduleItem["status"] };

function fmt(iso: string | null) {
  return iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

/**
 * Subaba "Fechamento Cliente": obrigações que o cliente precisa cumprir
 * (fechar marcenaria, mármores, eletros…) para o cronograma andar.
 * Agrupado por mês da data limite de fechamento.
 */
export function ClientClosingSchedule({ projectId, moveInDate }: Props) {
  const { items, isLoading, create, update, remove } = useClientClosingSchedule(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClosingScheduleItem | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const grouped = useMemo(() => {
    const map = new Map<string, ClosingScheduleItem[]>();
    items.forEach((item) => {
      const key = item.closing_date
        ? format(parseISO(item.closing_date), "MMMM/yyyy", { locale: ptBR }).toUpperCase()
        : "SEM DATA";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  const openForm = (item?: ClosingScheduleItem) => {
    if (item) {
      setEditing(item);
      setDraft({
        description: item.description,
        delivery_date: item.delivery_date ?? "",
        closing_date: item.closing_date ?? "",
        delivery_time: item.delivery_time ?? "",
        estimated_value: item.estimated_value?.toString() ?? "",
        status: item.status,
      });
    } else {
      setEditing(null);
      setDraft(EMPTY_DRAFT);
    }
    setFormOpen(true);
  };

  const save = () => {
    const payload = {
      description: draft.description,
      delivery_date: draft.delivery_date || null,
      closing_date: draft.closing_date || null,
      delivery_time: draft.delivery_time || null,
      estimated_value: draft.estimated_value ? Number(draft.estimated_value) : null,
      status: draft.status,
      display_order: 0,
    };
    if (editing) {
      update.mutate({ id: editing.id, ...payload }, { onSuccess: () => setFormOpen(false) });
    } else {
      create.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-1.5">
            Fechamento do Cliente
            <InfoHint>O que o cliente precisa fechar, e até quando, para a obra seguir no prazo.</InfoHint>
          </h3>
        </div>
        <Button size="sm" onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar item
        </Button>
      </div>

      <MoveInBanner moveInDate={moveInDate} />

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhuma obrigação cadastrada.<br />
          Adicione itens que o cliente precisa fechar (marcenaria, mármores, eletros, etc.).
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([monthLabel, monthItems]) => {
            const monthTotal = monthItems.reduce((s, i) => s + (i.estimated_value ?? 0), 0);
            return (
              <div key={monthLabel}>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-xs font-bold tracking-widest text-muted-foreground">{monthLabel}</span>
                  {monthTotal > 0 && (
                    <span className="text-xs font-semibold text-primary">
                      Total: {monthTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>DATA DE ENTREGA</TableHead>
                        <TableHead>DATA LIMITE DE FECHAMENTO</TableHead>
                        <TableHead className="flex-1">DESCRIÇÃO</TableHead>
                        <TableHead>PRAZO DE ENTREGA</TableHead>
                        <TableHead className="text-right">VALOR PREVISTO</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{fmt(item.delivery_date)}</TableCell>
                          <TableCell className="text-sm">{fmt(item.closing_date)}</TableCell>
                          <TableCell className="text-sm font-medium">{item.description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.delivery_time ?? "—"}</TableCell>
                          <TableCell className="text-sm text-right">
                            {item.estimated_value != null ? item.estimated_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-1.5 ${CLOSING_STATUS_CLASS[item.status]}`}>
                              {CLOSING_STATUS_LABEL[item.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openForm(item)} aria-label={`Editar ${item.description}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(item.id)} aria-label={`Excluir ${item.description}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar item" : "Novo item de fechamento"}</DialogTitle>
            <DialogDescription>Obrigação que o cliente deve cumprir para a obra prosseguir no prazo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Descrição *</label>
              <input className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Ex: Marcenaria — armários da cozinha" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Data limite de fechamento</label>
                <input type="date" className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm" value={draft.closing_date} onChange={(e) => setDraft((d) => ({ ...d, closing_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium">Data de entrega na obra</label>
                <input type="date" className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm" value={draft.delivery_date} onChange={(e) => setDraft((d) => ({ ...d, delivery_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Prazo de entrega</label>
                <input className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm" value={draft.delivery_time} onChange={(e) => setDraft((d) => ({ ...d, delivery_time: e.target.value }))} placeholder="Ex: 60 dias úteis" />
              </div>
              <div>
                <label className="text-xs font-medium">Valor previsto (R$)</label>
                <input type="number" className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm" value={draft.estimated_value} onChange={(e) => setDraft((d) => ({ ...d, estimated_value: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <select className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as ClosingScheduleItem["status"] }))}>
                {(Object.keys(CLOSING_STATUS_LABEL) as ClosingScheduleItem["status"][]).map((s) => (
                  <option key={s} value={s}>{CLOSING_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!draft.description.trim() || create.isPending || update.isPending}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
