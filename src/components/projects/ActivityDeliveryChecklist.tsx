import { Calendar, CheckCircle2, Circle, ClipboardCheck, Copy, Plus, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";
import { DELIVERY_PRIORITY_CLASSES, DELIVERY_PRIORITY_LABELS, checklistProgress } from "@/lib/deliveryChecklist";
import { ChecklistItemPhotos, type ChecklistPhotoHandlers } from "./ChecklistItemPhotos";

export interface ChecklistHandlers {
  onToggle: (item: DeliveryChecklistItem) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  disabled?: boolean;
  /** Quando informado, cada item ganha miniaturas e botão de foto. */
  photos?: ChecklistPhotoHandlers;
}

interface ActivityDeliveryChecklistProps extends ChecklistHandlers {
  items: DeliveryChecklistItem[];
  emptyText?: string;
  addLabel?: string;
}

/**
 * Lista de pendências de entrega de uma atividade (ou das gerais).
 * Sem percentual — só resolvido/pendente, como pedido na call de 16/04.
 */
export function ActivityDeliveryChecklist({ items, onToggle, onRemove, onAdd, disabled, emptyText, addLabel, photos }: ActivityDeliveryChecklistProps) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText ?? "Nenhuma pendência de entrega para esta atividade."}</p>
      ) : (
        <ul className="divide-y rounded-md border bg-background">
          {items.map((item) => (
            <li key={item.id} className={`flex items-start gap-3 p-2.5 ${item.resolved ? "opacity-60" : ""}`} data-testid={`checklist-item-${item.id}`}>
              <button
                type="button"
                onClick={() => onToggle(item)}
                disabled={disabled}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-60"
                aria-label={item.resolved ? `Marcar "${item.description}" como pendente` : `Marcar "${item.description}" como resolvida`}
                aria-pressed={item.resolved}
              >
                {item.resolved ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.resolved ? "line-through text-muted-foreground" : ""}`}>{item.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className={`text-[10px] h-5 ${DELIVERY_PRIORITY_CLASSES[item.priority] || ""}`}>
                    {DELIVERY_PRIORITY_LABELS[item.priority] || item.priority}
                  </Badge>
                  {item.responsible && (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {item.responsible}</span>
                  )}
                  {item.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  {!photos && (item.photo_paths?.length ?? 0) > 0 && (
                    <span>• {item.photo_paths.length} foto{item.photo_paths.length === 1 ? "" : "s"}</span>
                  )}
                </div>
                {photos && <ChecklistItemPhotos item={item} disabled={disabled} {...photos} />}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                disabled={disabled}
                onClick={() => onRemove(item.id)}
                aria-label={`Excluir pendência "${item.description}"`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAdd} disabled={disabled}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {addLabel ?? "Adicionar pendência"}
      </Button>
    </div>
  );
}

interface GeneralDeliveryChecklistProps extends ChecklistHandlers {
  /** Todos os itens do checklist da obra (o card mostra só os sem atividade). */
  allItems: DeliveryChecklistItem[];
  onCopyPending: () => void;
}

/**
 * Card das pendências gerais de entrega (sem atividade vinculada) com o
 * resumo da obra inteira e o botão de copiar para o WhatsApp.
 */
export function GeneralDeliveryChecklist({ allItems, onCopyPending, ...handlers }: GeneralDeliveryChecklistProps) {
  const general = allItems.filter((i) => !i.activity_id);
  const progress = checklistProgress(allItems);
  return (
    <Card data-testid="general-delivery-checklist">
      <CardHeader className="py-3 px-4 bg-muted/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Checklist de entrega</CardTitle>
            <Badge variant="outline" className="text-[10px]">
              {progress.resolved}/{progress.total} resolvidas
            </Badge>
          </div>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCopyPending} disabled={progress.pending === 0}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar pendências
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          As pendências de cada atividade ficam na coluna Entrega do cronograma. Aqui entram as gerais, sem atividade.
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <ActivityDeliveryChecklist
          items={general}
          emptyText="Nenhuma pendência geral."
          addLabel="Nova pendência geral"
          {...handlers}
        />
      </CardContent>
    </Card>
  );
}
