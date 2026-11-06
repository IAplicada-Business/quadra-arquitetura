import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSiteLead } from "@/hooks/useSiteLead";

const THROTTLE_KEY = "quadra:checklist-lead-ts";
const THROTTLE_MS = 30_000;

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const phoneDigits = (v: string) => v.replace(/\D/g, "");

function throttled(): boolean {
  try {
    const last = Number(localStorage.getItem(THROTTLE_KEY) ?? 0);
    return Date.now() - last < THROTTLE_MS;
  } catch {
    return false;
  }
}
function markSent() {
  try {
    localStorage.setItem(THROTTLE_KEY, String(Date.now()));
  } catch {
    /* sem storage: segue sem throttle */
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** URL já validada (https ou caminho). Vazia = a equipe envia o material. */
  fileUrl: string;
  /** No preview do editor nada é gravado. */
  preview?: boolean;
}

/**
 * Captura de lead do checklist: nome, e-mail e WhatsApp em troca do material.
 * Grava em `leads` com source_detail "checklist" (cai na coluna Novo do pipeline,
 * com etiqueta). O download é um link comum, aberto pelo clique do visitante.
 */
export function LeadCaptureDialog({ open, onOpenChange, fileUrl, preview = false }: Props) {
  const { mutate: createLead, isPending } = useSiteLead();
  const [form, setForm] = useState({ nome: "", email: "", whatsapp: "", website: "" }); // website = honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const submitting = useRef(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.nome.trim().length < 2) e.nome = "Informe seu nome.";
    if (!isValidEmail(form.email)) e.email = "Informe um e-mail válido.";
    if (phoneDigits(form.whatsapp).length < 10) e.whatsapp = "Informe o WhatsApp com DDD.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting.current || isPending) return;
    setFailed(null);
    if (!validate()) return;
    // Robô preencheu o campo oculto: finge sucesso, não grava.
    if (form.website) {
      setSent(true);
      return;
    }
    if (preview) {
      setSent(true);
      return;
    }
    if (throttled()) {
      setFailed("Já recebemos o seu pedido agora há pouco. Aguarde alguns instantes para enviar de novo.");
      return;
    }
    submitting.current = true;
    createLead(
      {
        name: form.nome.trim(),
        email: form.email.trim(),
        phone: form.whatsapp.trim(),
        projectType: "outro",
        message: "Pediu o checklist",
        sourceDetail: "checklist",
      },
      {
        onSuccess: () => {
          markSent();
          setSent(true);
        },
        onError: (e: Error) => setFailed(e.message || "Não foi possível enviar. Tente de novo."),
        onSettled: () => {
          submitting.current = false;
        },
      },
    );
  };

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      // Fechou depois de enviar: limpa para o próximo visitante. Falha: mantém o que foi digitado.
      if (sent) {
        setSent(false);
        setForm({ nome: "", email: "", whatsapp: "", website: "" });
      }
      setErrors({});
      setFailed(null);
    }
  };

  const field = (id: keyof typeof form, label: string, type: string, auto: string, placeholder?: string) => (
    <div className="space-y-1">
      <Label htmlFor={`lead-${id}`}>{label}</Label>
      <Input
        id={`lead-${id}`}
        type={type}
        autoComplete={auto}
        placeholder={placeholder}
        value={form[id]}
        onChange={(e) => set(id, e.target.value)}
        aria-invalid={!!errors[id]}
        aria-describedby={errors[id] ? `lead-${id}-err` : undefined}
      />
      {errors[id] && (
        <p id={`lead-${id}-err`} role="alert" className="text-xs text-destructive">
          {errors[id]}
        </p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        {sent ? (
          <div className="space-y-4" data-testid="lead-success">
            <DialogHeader>
              <DialogTitle>{preview ? "Prévia do envio" : "Pronto! Recebemos o seu pedido."}</DialogTitle>
              <DialogDescription>
                {fileUrl
                  ? "Seu checklist está liberado para baixar."
                  : "A equipe da Quadra vai enviar o checklist para o seu e-mail ou WhatsApp em breve."}
              </DialogDescription>
            </DialogHeader>
            {fileUrl && (
              <Button asChild className="w-full">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="h-4 w-4 mr-2" /> Baixar checklist
                </a>
              </Button>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <DialogHeader>
              <DialogTitle>Receber o checklist</DialogTitle>
              <DialogDescription>Deixe seus dados e liberamos o material.</DialogDescription>
            </DialogHeader>
            {field("nome", "Nome", "text", "name")}
            {field("email", "E-mail", "email", "email")}
            {field("whatsapp", "WhatsApp", "tel", "tel", "(31) 90000-0000")}
            {/* Campo-isca: invisível para pessoas, preenchido por robôs. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="lead-website">Não preencha</label>
              <input id="lead-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
            {failed && (
              <p role="alert" className="text-sm text-destructive">
                {failed}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Ao enviar, você concorda que a Quadra Arquitetura use seus dados para enviar o material e entrar em contato, conforme a LGPD.
            </p>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {failed && !isPending ? "Tentar de novo" : "Receber checklist"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
