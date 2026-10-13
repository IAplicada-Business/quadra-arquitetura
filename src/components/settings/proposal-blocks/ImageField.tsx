import { useState } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useProposalAssets } from "@/hooks/useProposalAssets";

/** Campo de imagem dos blocos do PDF: URL, upload (bucket proposal-assets/blocos) e sugestões. */
export function ImageField({
  id,
  field,
  value,
  onChange,
  suggestions,
}: {
  id: string;
  field: { label: string; hint?: string };
  value: string;
  onChange: (url: string) => void;
  suggestions: { id: string; name: string; url: string }[];
}) {
  const { uploadFile } = useProposalAssets();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const url = await uploadFile(files[0], "blocos");
      onChange(url);
    } catch (e) {
      toast({ title: "Erro no upload", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-semibold flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> {field.label}</Label>
      <div className="flex items-start gap-3">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded border bg-muted/40 flex items-center justify-center">
          {value ? <img src={value} alt={field.label} className="h-full w-full object-cover" /> : <span className="text-[10px] text-muted-foreground text-center px-1">padrão do app</span>}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Input id={id} value={value} placeholder="URL da imagem ou envie um arquivo" className="h-8 text-sm" onChange={(e) => onChange(e.target.value)} />
            <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted whitespace-nowrap">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload
              <input type="file" accept="image/*" className="hidden" disabled={uploading} aria-label={`Enviar ${field.label}`} onChange={(e) => handleUpload(e.target.files)} />
            </label>
            {value && (
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onChange("")}>Usar padrão</Button>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.name}
                  aria-label={`Usar ${s.name}`}
                  onClick={() => onChange(s.url)}
                  className={`h-10 w-14 overflow-hidden rounded border hover:ring-2 hover:ring-primary ${value === s.url ? "ring-2 ring-primary" : ""}`}
                >
                  <img src={s.url} alt={s.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
        </div>
      </div>
    </div>
  );
}

