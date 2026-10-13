import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImageUp, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { uploadSiteImage } from "@/hooks/useSiteContent";
import { RichTextField } from "@/components/settings/proposal-blocks/RichTextField";
import type { SiteFieldDef, SiteListItem } from "@/lib/siteContent";

/* ------------------------------------------------------------------ */
/* Imagem                                                              */
/* ------------------------------------------------------------------ */

interface ImageFieldProps {
  id: string;
  label: string;
  value: string;
  /** Imagem que o site usa quando value = "". */
  defaultSrc: string;
  folder: string;
  maxWidth?: number;
  onChange: (url: string) => void;
  compact?: boolean;
}

export function SiteImageField({ id, label, value, defaultSrc, folder, maxWidth, onChange, compact }: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSiteImage(file, folder, maxWidth);
      onChange(url);
    } catch (e) {
      toast({ title: "Erro ao enviar imagem", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={compact ? "flex items-center gap-3" : "space-y-2"}>
      {!compact && <Label htmlFor={id} className="text-xs font-semibold">{label}</Label>}
      <div className={compact ? "flex items-center gap-3" : "flex items-start gap-3"}>
        <img
          src={value || defaultSrc}
          alt={label}
          className={`${compact ? "h-14 w-14" : "h-24 w-36"} object-cover rounded border bg-muted`}
          data-testid={`${id}-thumb`}
        />
        <div className="flex flex-col gap-1.5">
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label={`Enviar ${label}`}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ImageUp className="h-3.5 w-3.5 mr-1" />}
            {uploading ? "Enviando..." : "Trocar imagem"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange("")}>
              <RotateCcw className="h-3 w-3 mr-1" /> Usar imagem padrão
            </Button>
          )}
          {!compact && maxWidth && (
            <span className="text-[11px] text-muted-foreground">Redimensionada automaticamente para até {maxWidth}px de largura.</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lista                                                               */
/* ------------------------------------------------------------------ */

interface ListFieldProps {
  id: string;
  field: SiteFieldDef;
  items: SiteListItem[];
  folder: string;
  defaultImageFor: (index: number) => string;
  onChange: (items: SiteListItem[]) => void;
}

export function SiteListField({ id, field, items, folder, defaultImageFor, onChange }: ListFieldProps) {
  const labels = field.itemLabels ?? { title: "Título", desc: "Descrição" };
  const longDesc = labels.desc === "Descrição";

  const update = (i: number, patch: Partial<SiteListItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () =>
    onChange([
      ...items,
      {
        title: "",
        desc: "",
        ...(field.itemImage ? { image: "" } : null),
        ...(field.itemTag ? { tag: "" } : null),
        ...(field.itemBullets ? { bullets: "" } : null),
      },
    ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{field.label}</Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      </div>
      {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
      {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item. O bloco fica vazio no site.</p>}
      {items.map((item, i) => (
        <div key={i} className="border rounded-md p-2.5 space-y-2 bg-background" data-testid={`${id}-item-${i}`}>
          {field.itemTag && (
            <Input
              value={item.tag ?? ""}
              placeholder={field.itemTag}
              aria-label={`${field.label} ${i + 1}: ${field.itemTag}`}
              onChange={(e) => update(i, { tag: e.target.value })}
              className="h-8 text-xs"
            />
          )}
          <div className="flex items-center gap-2">
            <Input
              value={item.title}
              placeholder={labels.title}
              aria-label={`${field.label} ${i + 1}: ${labels.title}`}
              onChange={(e) => update(i, { title: e.target.value })}
              className="h-8 text-sm"
            />
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Mover para cima" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Mover para baixo" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Remover item" aria-label={`Remover ${field.label} ${i + 1}`} onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {longDesc ? (
            <Textarea
              value={item.desc}
              rows={3}
              placeholder={labels.desc}
              aria-label={`${field.label} ${i + 1}: ${labels.desc}`}
              onChange={(e) => update(i, { desc: e.target.value })}
              className="text-sm"
            />
          ) : (
            <Input
              value={item.desc}
              placeholder={labels.desc}
              aria-label={`${field.label} ${i + 1}: ${labels.desc}`}
              onChange={(e) => update(i, { desc: e.target.value })}
              className="h-8 text-sm"
            />
          )}
          {field.itemBullets && (
            <Textarea
              value={item.bullets ?? ""}
              rows={4}
              placeholder={field.itemBullets}
              aria-label={`${field.label} ${i + 1}: ${field.itemBullets}`}
              onChange={(e) => update(i, { bullets: e.target.value })}
              className="text-sm"
            />
          )}
          {field.itemImage && (
            <SiteImageField
              id={`${id}-item-${i}-image`}
              label={`Foto de ${item.title || `item ${i + 1}`}`}
              value={item.image ?? ""}
              defaultSrc={defaultImageFor(i)}
              folder={folder}
              maxWidth={field.maxWidth}
              onChange={(url) => update(i, { image: url })}
              compact
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campo genérico                                                      */
/* ------------------------------------------------------------------ */

interface SiteFieldProps {
  id: string;
  field: SiteFieldDef;
  value: unknown;
  folder: string;
  defaultImageFor: (index: number) => string;
  onChange: (value: unknown) => void;
}

export function SiteField({ id, field, value, folder, defaultImageFor, onChange }: SiteFieldProps) {
  if (field.type === "list") {
    return (
      <SiteListField
        id={id}
        field={field}
        items={(value as SiteListItem[]) ?? []}
        folder={folder}
        defaultImageFor={defaultImageFor}
        onChange={onChange}
      />
    );
  }
  if (field.type === "image") {
    return (
      <SiteImageField
        id={id}
        label={field.label}
        value={(value as string) ?? ""}
        defaultSrc={defaultImageFor(0)}
        folder={folder}
        maxWidth={field.maxWidth}
        onChange={onChange}
      />
    );
  }
  const text = (value as string) ?? "";

  if (field.type === "select") {
    const atual = field.options?.find((o) => o.value === text) ?? field.options?.[0];
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs font-semibold">
          {field.label}
        </Label>
        <select
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {atual?.hint && <p className="text-[11px] text-muted-foreground">{atual.hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold">{field.label}</Label>
      {field.type === "richtext" ? (
        <>
          <RichTextField id={id} value={text} onChange={onChange} rows={field.name === "body" ? 8 : 3} aria-label={field.label} />
          {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
        </>
      ) : (
        <Input id={id} value={text} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
      )}
    </div>
  );
}
