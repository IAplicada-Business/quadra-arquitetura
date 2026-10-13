import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VoiceInputButton } from "@/components/ui/voice-input-button";
import type { DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";
import { DELIVERY_PRIORITY_LABELS } from "@/lib/deliveryChecklist";

export interface DeliveryChecklistDraft {
  description: string;
  activity_id: string | null;
  discipline: string | null;
  responsible: string | null;
  due_date: string | null;
  priority: DeliveryChecklistItem["priority"];
  /** Fotos escolhidas no cadastro (enviadas depois que o item é criado). */
  photos: File[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: { id: string; name: string; discipline: string | null }[];
  /** Atividade pré-selecionada ao abrir (null = pendência geral). */
  defaultActivityId?: string | null;
  onSubmit: (draft: DeliveryChecklistDraft) => void;
  isPending?: boolean;
}

/**
 * Formulário de pendência de entrega (antes vivia na aba "Checklist
 * Entrega"; agora abre a partir do Cronograma Reverso, já com a
 * atividade escolhida).
 */
export function DeliveryChecklistItemDialog({ open, onOpenChange, activities, defaultActivityId, onSubmit, isPending }: Props) {
  const [desc, setDesc] = useState("");
  const [activityId, setActivityId] = useState<string>("none");
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<string>("media");
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setDesc("");
    setActivityId(defaultActivityId ?? "none");
    setResponsible("");
    setDueDate("");
    setPriority("media");
    setPhotos([]);
  }, [open, defaultActivityId]);

  const selected = activities.find((a) => a.id === activityId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;
    onSubmit({
      description: desc.trim(),
      activity_id: activityId !== "none" ? activityId : null,
      discipline: selected?.discipline ?? null,
      responsible: responsible.trim() || null,
      due_date: dueDate || null,
      priority: priority as DeliveryChecklistItem["priority"],
      photos,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova pendência de entrega</DialogTitle>
          <DialogDescription>
            {selected ? `Pendência de entrega de "${selected.name}".` : "Pendência geral da entrega da obra."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="delivery-desc">Descrição *</Label>
              <VoiceInputButton
                title="Ditar pendência"
                onTranscript={(t) => setDesc((prev) => (prev ? prev + " " + t : t))}
              />
            </div>
            <Textarea
              id="delivery-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: passar rejunte na pedra da bancada"
              rows={2}
              required
            />
          </div>
          <div>
            <Label>Atividade do cronograma</Label>
            <Select value={activityId} onValueChange={setActivityId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem vínculo (pendência geral)</SelectItem>
                {activities.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    {a.discipline ? ` — ${a.discipline}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="delivery-resp">Responsável</Label>
              <Input id="delivery-resp" value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Ex: Pedreiro João" />
            </div>
            <div>
              <Label htmlFor="delivery-due">Prazo</Label>
              <Input id="delivery-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DELIVERY_PRIORITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="delivery-photos">Fotos (opcional)</Label>
            <Input
              id="delivery-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
              className="cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              No celular abre a câmera ou a galeria. A foto é reduzida antes de enviar.
              {photos.length > 0 && ` ${photos.length} selecionada${photos.length === 1 ? "" : "s"}.`}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending || !desc.trim()}>Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
