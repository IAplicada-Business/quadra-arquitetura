import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export interface CascadeChange {
  id: string;
  name: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
}

interface CascadePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: CascadeChange[];
  onConfirm: () => void;
  isLoading?: boolean;
  title?: string;
}

function fmt(d: string) {
  return format(new Date(d), "dd/MM");
}

export function CascadePreviewDialog({ open, onOpenChange, changes, onConfirm, isLoading, title }: CascadePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-ink" />
            {title || `Esta alteração afeta ${changes.length} atividade${changes.length !== 1 ? "s" : ""}`}
          </DialogTitle>
          <DialogDescription>
            As datas das atividades dependentes serão recalculadas automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {changes.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
              <span className="font-medium truncate mr-2">{c.name}</span>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {fmt(c.oldStart)}–{fmt(c.oldEnd)} → {fmt(c.newStart)}–{fmt(c.newEnd)}
              </span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            Confirmar recálculo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
