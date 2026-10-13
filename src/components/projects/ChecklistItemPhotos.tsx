import { useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, ImageOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useChecklistPhotoUrls, type DeliveryChecklistItem } from "@/hooks/useDeliveryChecklist";

export interface ChecklistPhotoHandlers {
  onAddPhotos: (item: DeliveryChecklistItem, files: File[]) => void;
  onRemovePhoto: (item: DeliveryChecklistItem, path: string) => void;
  /** Id do item que está recebendo upload agora (mostra o carregando). */
  uploadingItemId?: string | null;
}

interface Props extends ChecklistPhotoHandlers {
  item: DeliveryChecklistItem;
  disabled?: boolean;
}

/**
 * Fotos de um item do checklist de entrega: miniaturas na lista, botão
 * de câmera (no celular abre câmera ou galeria) e ampliação ao clicar.
 */
export function ChecklistItemPhotos({ item, onAddPhotos, onRemovePhoto, uploadingItemId, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const paths = item.photo_paths ?? [];
  const { urls } = useChecklistPhotoUrls(paths);
  const uploading = uploadingItemId === item.id;

  const pick = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (files.length > 0) onAddPhotos(item, files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const current = openIndex != null ? paths[openIndex] : null;
  const go = (delta: number) => {
    if (openIndex == null || paths.length === 0) return;
    setOpenIndex((openIndex + delta + paths.length) % paths.length);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2" data-testid={`checklist-photos-${item.id}`}>
      {paths.map((path, i) => (
        <button
          key={path}
          type="button"
          onClick={() => setOpenIndex(i)}
          className="h-12 w-12 rounded-md overflow-hidden border bg-muted shrink-0 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={`Ampliar foto ${i + 1} de "${item.description}"`}
        >
          {urls[path] ? (
            <img src={urls[path]} alt={`Foto ${i + 1} de ${item.description}`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-4 w-4" />
            </span>
          )}
        </button>
      ))}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label={`Enviar foto de "${item.description}"`}
        onChange={(e) => pick(e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-12 px-3 text-xs"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        title="Tirar foto ou escolher da galeria"
      >
        {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
        {uploading ? "Enviando…" : paths.length > 0 ? "Mais fotos" : "Foto"}
      </Button>

      <Dialog open={openIndex != null} onOpenChange={(open) => { if (!open) setOpenIndex(null); }}>
        <DialogContent className="max-w-3xl p-3 sm:p-4">
          <DialogHeader>
            <DialogTitle className="text-sm pr-6">{item.description}</DialogTitle>
            <DialogDescription className="text-xs">
              Foto {openIndex != null ? openIndex + 1 : 0} de {paths.length}
            </DialogDescription>
          </DialogHeader>
          {current && (
            <div className="relative flex items-center justify-center bg-muted rounded-md min-h-[240px]">
              {urls[current] ? (
                <img src={urls[current]} alt={`Foto ampliada de ${item.description}`} className="max-h-[70vh] w-auto rounded-md object-contain" />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
              {paths.length > 1 && (
                <>
                  <Button size="icon" variant="secondary" className="absolute left-2 h-9 w-9" onClick={() => go(-1)} aria-label="Foto anterior">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="absolute right-2 h-9 w-9" onClick={() => go(1)} aria-label="Próxima foto">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={disabled}
              onClick={() => {
                if (!current) return;
                onRemovePhoto(item, current);
                setOpenIndex(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remover foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
