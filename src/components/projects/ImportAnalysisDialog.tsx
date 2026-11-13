import { useRef, useState } from "react";
import { FileUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBudgetAnalysisImports } from "@/hooks/useBudgetAnalysisImports";
import { readAnalysisFile } from "@/lib/analysisImport";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Importar análise de orçamento/cenários em HTML. Aparece na Trilha do cliente; não muda o orçamento. */
export function ImportAnalysisDialog({ projectId, open, onOpenChange }: Props) {
  const { imports, importHtml, remove } = useBudgetAnalysisImports(projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      importHtml.mutate(await readAnalysisFile(file));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar análise (HTML)</DialogTitle>
          <DialogDescription>
            Suba o HTML gerado fora do sistema. Ele aparece na aba Análise orçamentária da Trilha do cliente, sem alterar o orçamento.
          </DialogDescription>
        </DialogHeader>

        <input ref={inputRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={onPick} data-testid="analysis-file-input" />
        <Button onClick={() => inputRef.current?.click()} disabled={importHtml.isPending}>
          {importHtml.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
          Escolher arquivo HTML
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        {imports.length > 0 && (
          <ul className="divide-y rounded-md border text-sm" data-testid="analysis-list">
            {imports.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <Button size="icon" variant="ghost" aria-label={`Remover ${i.title}`} disabled={remove.isPending} onClick={() => remove.mutate(i.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
