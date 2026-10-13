import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { startOfWeek, format } from "date-fns";
import { Camera, Mic, MicOff, Sparkles, X } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { reportPhotoUrls, weekRangeLabel, type WeeklyReportRecord } from "@/lib/weeklyReport";
import type { WeeklyReportInput } from "@/hooks/useWeeklyReports";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  avgProgress: number;
  onSubmit: (data: WeeklyReportInput) => void;
  isPending: boolean;
  /** Texto vindo do "Gerar Resumo com IA". */
  prefill?: { summary: string; next_steps: string; client_pending?: string };
  /** Relatório existente (modo edição). */
  editing?: WeeklyReportRecord | null;
}

function MicButton({ onTranscript, fieldLabel }: { onTranscript: (t: string) => void; fieldLabel: string }) {
  const { isRecording, isSupported, toggle } = useVoiceInput({ onTranscript });
  if (!isSupported) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      title={isRecording ? "Parar gravação" : `Ditar ${fieldLabel}`}
      className={`flex items-center gap-1 text-xs rounded px-1.5 py-0.5 transition-colors
        ${isRecording ? "text-destructive bg-destructive/10 animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
    >
      {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      {isRecording ? "Parar" : "Áudio"}
    </button>
  );
}

/**
 * Formulário do relatório semanal. O estado nasce do relatório em edição
 * ou do resumo da IA; o pai remonta o modal (key) a cada abertura, então
 * não sobra texto de uma abertura para outra e nada é apagado se salvar
 * falhar.
 */
export function WeeklyReportModal({ open, onOpenChange, avgProgress, onSubmit, isPending, prefill, editing }: Props) {
  const weekStart = useMemo(
    () => editing?.week_start?.slice(0, 10) ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    [editing],
  );

  const [summary, setSummary] = useState(editing?.summary ?? prefill?.summary ?? "");
  const [nextSteps, setNextSteps] = useState(editing?.next_steps ?? prefill?.next_steps ?? "");
  const [completionPercent, setCompletionPercent] = useState(editing?.completion_percent ?? avgProgress);
  const [clientPending, setClientPending] = useState(editing?.client_pending ?? prefill?.client_pending ?? "");
  const [keepPhotos, setKeepPhotos] = useState<string[]>(editing ? reportPhotoUrls(editing) : []);
  const [photos, setPhotos] = useState<File[]>([]);

  const appendSummary = useCallback((t: string) => setSummary((v) => (v ? `${v} ${t}` : t)), []);
  const appendNextSteps = useCallback((t: string) => setNextSteps((v) => (v ? `${v} ${t}` : t)), []);
  const appendClientPending = useCallback((t: string) => setClientPending((v) => (v ? `${v} ${t}` : t)), []);

  const maxNew = Math.max(0, 6 - keepPhotos.length);
  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotos(Array.from(e.target.files || []).slice(0, maxNew));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      week_start: weekStart,
      summary,
      next_steps: nextSteps,
      completion_percent: completionPercent,
      client_pending: clientPending || undefined,
      photos: photos.length > 0 ? photos : undefined,
      keep_photo_urls: keepPhotos,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar relatório semanal" : "Relatório semanal"}</DialogTitle>
          <DialogDescription>{weekRangeLabel(weekStart)}</DialogDescription>
        </DialogHeader>

        {prefill && !editing && (
          <p className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary" data-testid="ai-prefill-note">
            <Sparkles className="h-3.5 w-3.5" /> Texto preenchido pela IA. Revise antes de salvar.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="wr-summary">Resumo do período *</Label>
              <MicButton onTranscript={appendSummary} fieldLabel="resumo" />
            </div>
            <Textarea id="wr-summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Descreva as atividades realizadas nesta semana..." rows={4} required />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="wr-next">Próximas etapas *</Label>
              <MicButton onTranscript={appendNextSteps} fieldLabel="próximas etapas" />
            </div>
            <Textarea id="wr-next" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} placeholder="O que está planejado para a próxima semana..." rows={4} required />
          </div>

          <div>
            <Label htmlFor="wr-pct">% de Conclusão Geral</Label>
            <Input id="wr-pct" type="number" min={0} max={100} value={completionPercent} onChange={(e) => setCompletionPercent(Number(e.target.value))} />
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              Fotos da semana (máx. 6)
            </Label>
            {keepPhotos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {keepPhotos.map((url, i) => (
                  <div key={url} className="relative h-16 w-20 overflow-hidden rounded border">
                    <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label={`Remover foto ${i + 1}`}
                      className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5 text-destructive"
                      onClick={() => setKeepPhotos((p) => p.filter((u) => u !== url))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {maxNew > 0 && <Input type="file" accept="image/*" multiple onChange={handlePhotos} className="mt-2" aria-label="Adicionar fotos" />}
            {photos.length > 0 && <p className="text-xs text-muted-foreground mt-1">{photos.length} foto(s) nova(s) selecionada(s)</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="wr-pending">Pendências do cliente (opcional)</Label>
              <MicButton onTranscript={appendClientPending} fieldLabel="pendências" />
            </div>
            <Textarea id="wr-pending" value={clientPending} onChange={(e) => setClientPending(e.target.value)} placeholder="Itens que precisam de ação ou aprovação do cliente..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : editing ? "Salvar alterações" : "Salvar relatório"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
