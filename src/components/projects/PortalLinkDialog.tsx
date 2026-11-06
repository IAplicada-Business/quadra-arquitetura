import { useRef, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Loader2, MessageCircle, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useClientPortalToken } from "@/hooks/useClientPortalToken";
import { toast } from "@/hooks/use-toast";
import { buildPortalUrl, portalWhatsappUrl } from "@/lib/portalUrl";

interface Props {
  projectId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function copyText(text: string, input: HTMLInputElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* cai no fallback */
  }
  try {
    input?.focus();
    input?.select();
    return document.execCommand?.("copy") ?? false;
  } catch {
    return false;
  }
}

export function PortalLinkDialog({ projectId, open, onOpenChange }: Props) {
  const {
    activeToken, isLoading, isError, refetch,
    createToken, rotateToken, deactivateToken, isCreating, isRotating, isDeactivating,
  } = useClientPortalToken(projectId);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = activeToken?.token ? buildPortalUrl(activeToken.token) : null;
  const busy = isCreating || isRotating || isDeactivating;

  const handleCopy = async () => {
    if (!url) return;
    const ok = await copyText(url, inputRef.current);
    if (ok) {
      setCopied(true);
      toast({ title: "Link copiado!" });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({ title: "Não foi possível copiar", description: "Selecione o link e copie manualmente.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Portal do Cliente</DialogTitle>
          <DialogDescription>
            Link público para o cliente acompanhar a obra. Quem tem o link vê o portal, sem precisar de login.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">Não foi possível carregar o link.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar de novo</Button>
          </div>
        ) : url ? (
          <div className="space-y-4">
            <Input
              ref={inputRef}
              readOnly
              value={url}
              aria-label="Link do portal do cliente"
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs break-all"
            />
            <Button className="w-full" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado" : "Copiar link"}
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild variant="outline" className="flex-1">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir portal
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href={portalWhatsappUrl(url)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" /> Enviar por WhatsApp
                </a>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 border-t border-border pt-4">
              <ConfirmDeleteDialog
                title="Regenerar o link?"
                description="O link atual deixa de funcionar para o cliente. Você precisará enviar o novo."
                confirmLabel="Regenerar"
                onConfirm={() => { void rotateToken(); }}
              >
                <Button variant="outline" size="sm" disabled={busy} className="flex-1">
                  {isRotating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Regenerar link
                </Button>
              </ConfirmDeleteDialog>
              <ConfirmDeleteDialog
                title="Desativar o link?"
                description="O link atual deixa de funcionar para o cliente. Você pode gerar um novo depois."
                confirmLabel="Desativar"
                onConfirm={() => { void deactivateToken(activeToken.id); }}
              >
                <Button variant="outline" size="sm" disabled={busy} className="flex-1 text-destructive">
                  {isDeactivating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Desativar link
                </Button>
              </ConfirmDeleteDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Esta obra ainda não tem link do portal.</p>
            <Button onClick={() => { void createToken(); }} disabled={busy}>
              {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              {isCreating ? "Gerando..." : "Gerar link"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
