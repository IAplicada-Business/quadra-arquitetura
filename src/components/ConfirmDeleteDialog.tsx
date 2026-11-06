import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

interface ConfirmDeleteDialogProps {
  /** Botão que abre a confirmação (o mesmo botão de lixeira que já existia). */
  children: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  children,
  title,
  description = "Esta ação não pode ser desfeita.",
  confirmLabel = "Excluir",
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      {/* O portal ainda propaga eventos pela árvore React; sem isso o clique chega ao card/linha pai. */}
      <AlertDialogContent onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
