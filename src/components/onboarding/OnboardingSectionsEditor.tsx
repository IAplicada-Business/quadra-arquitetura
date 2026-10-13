import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, ChevronDown, ChevronUp, GripVertical, HelpCircle, ImagePlus, Loader2, Plus, Trash2, Upload, Video, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RichTextField } from "@/components/settings/proposal-blocks/RichTextField";
import { OnboardingView } from "./OnboardingView";
import { uploadOnboardingMedia } from "@/hooks/useOnboardingTemplate";
import { cardNumbers, emptySection, layoutLabel, moveSection, ONBOARDING_LAYOUTS, ONBOARDING_PLACEHOLDERS, sectionLayout, type OnboardingLayout, parseVideoUrl, SAMPLE_PLACEHOLDERS, validateVideoUrl, type OnboardingPlaceholders, type OnboardingSection } from "@/lib/onboarding";
import { InfoHint } from "@/components/visual/InfoHint";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Props {
  sections: OnboardingSection[];
  onChange: (sections: OnboardingSection[]) => void;
  /** Pasta no bucket onboarding-media (ex.: "template" ou o id da obra). */
  uploadFolder: string;
  disabled?: boolean;
  /** Título mostrado no preview (nome da obra). */
  previewHeading?: string;
  /**
   * Dados reais da obra para as variáveis ({cliente}, {fase}...). Sem isso
   * (editor de modelos), o preview usa valores de exemplo.
   */
  placeholders?: OnboardingPlaceholders;
}

const VIDEO_KIND_LABEL: Record<string, string> = {
  youtube: "YouTube reconhecido (vale vídeo não listado)",
  drive: "Google Drive reconhecido. O arquivo precisa estar em \"Qualquer pessoa com o link\".",
  vimeo: "Vimeo reconhecido",
  file: "Arquivo de vídeo",
  unknown: "Link não reconhecido",
};

/** Passo a passo curto, no próprio campo (o guia completo está em docs/onboarding-videos.md). */
function VideoHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-[11px]">
      <button type="button" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <HelpCircle className="h-3 w-3" /> Como colocar o vídeo
      </button>
      {open && (
        <div className="mt-1.5 rounded-md border bg-muted/40 p-2.5 space-y-2 text-muted-foreground" data-testid="video-help">
          <div>
            <p className="font-semibold text-foreground">YouTube (recomendado)</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>No YouTube Studio, clique em Criar → Enviar vídeos e escolha o arquivo.</li>
              <li>Em Visibilidade, marque <strong>Não listado</strong> (só quem tem o link assiste) e salve.</li>
              <li>Abra o vídeo, clique em Compartilhar → Copiar e cole o link aqui.</li>
            </ol>
          </div>
          <div>
            <p className="font-semibold text-foreground">Google Drive</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Envie o vídeo para o Drive e espere terminar o processamento.</li>
              <li>Clique com o botão direito → Compartilhar → em Acesso geral escolha <strong>Qualquer pessoa com o link</strong>.</li>
              <li>Clique em Copiar link e cole aqui.</li>
            </ol>
          </div>
          <p>Depois de colar, confira o vídeo na prévia ao lado antes de salvar.</p>
        </div>
      )}
    </div>
  );
}

/** Miniatura de cada layout, pra escolher olhando. */
function LayoutThumb({ layout }: { layout: OnboardingLayout }) {
  const base = "h-7 w-10 rounded-sm border bg-background p-0.5 flex gap-0.5";
  switch (layout) {
    case "capa":
      return <span className={base}><span className="flex-1 rounded-[2px] bg-primary" /></span>;
    case "card":
      return <span className={base}><span className="flex-1 rounded-[2px] border" /><span className="flex-1 rounded-[2px] border" /></span>;
    case "texto":
      return <span className={`${base} flex-col justify-center`}><span className="h-0.5 w-3/4 bg-muted-foreground/60" /><span className="h-0.5 w-full bg-muted-foreground/40" /><span className="h-0.5 w-2/3 bg-muted-foreground/40" /></span>;
    case "destaque":
      return <span className={base}><span className="flex-1 rounded-[2px] border-l-2 border-accent bg-accent/20" /></span>;
    case "midia":
      return <span className={base}><span className="flex-1 rounded-[2px] bg-muted-foreground/30" /><span className="flex-1 flex flex-col justify-center gap-0.5"><span className="h-0.5 w-full bg-muted-foreground/50" /><span className="h-0.5 w-2/3 bg-muted-foreground/40" /></span></span>;
  }
}

function LayoutPicker({ value, onChange, disabled }: { value: OnboardingLayout; onChange: (l: OnboardingLayout) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold">Layout</Label>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-label="Layout da seção">
        {ONBOARDING_LAYOUTS.map((l) => (
          <button
            key={l.key}
            type="button"
            role="radio"
            aria-checked={value === l.key}
            disabled={disabled}
            title={l.description}
            onClick={() => onChange(l.key)}
            className={`flex flex-col items-center gap-1 rounded-md border p-1.5 text-[11px] transition ${value === l.key ? "border-primary bg-primary/5 text-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            <LayoutThumb layout={l.key} />
            {l.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{ONBOARDING_LAYOUTS.find((l) => l.key === value)?.description}</p>
    </div>
  );
}

function SectionFields({
  section,
  index,
  onPatch,
  uploadFolder,
  disabled,
}: {
  section: OnboardingSection;
  index: number;
  onPatch: (patch: Partial<OnboardingSection>) => void;
  uploadFolder: string;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState<"video" | "image" | null>(null);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const id = (f: string) => `onb-${section.id}-${f}`;
  const video = parseVideoUrl(section.video_url);
  const videoError = validateVideoUrl(section.video_url);

  const upload = async (files: FileList | null, kind: "video" | "image") => {
    if (!files || files.length === 0) return;
    setUploading(kind);
    try {
      if (kind === "video") {
        const url = await uploadOnboardingMedia(files[0], `${uploadFolder}/videos`);
        onPatch({ video_url: url });
      } else {
        const urls: string[] = [];
        for (const f of Array.from(files)) urls.push(await uploadOnboardingMedia(f, `${uploadFolder}/images`));
        onPatch({ image_urls: [...section.image_urls, ...urls] });
      }
    } catch (e) {
      toast({ title: "Erro no upload", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const addImageUrl = () => {
    const u = imageUrlDraft.trim();
    if (!u) return;
    onPatch({ image_urls: [...section.image_urls, u] });
    setImageUrlDraft("");
  };

  return (
    <div className="space-y-4">
      <LayoutPicker value={sectionLayout(section, index)} onChange={(layout) => onPatch({ layout })} disabled={disabled} />

      <div className="space-y-1">
        <Label htmlFor={id("title")} className="text-xs font-semibold">Título</Label>
        <Input id={id("title")} value={section.title} disabled={disabled} className="h-8 text-sm" onChange={(e) => onPatch({ title: e.target.value })} placeholder={`Seção ${index + 1}`} />
      </div>

      <div className="space-y-1">
        <Label htmlFor={id("body")} className="text-xs font-semibold">Texto</Label>
        <RichTextField id={id("body")} value={section.body} rows={5} onChange={(v) => onPatch({ body: v })} placeholder="O que o cliente precisa saber nesta etapa" />
      </div>

      <div className="space-y-1">
        <Label htmlFor={id("video")} className="text-xs font-semibold flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Vídeo (YouTube não listado ou Google Drive)</Label>
        <div className="flex gap-2">
          <Input
            id={id("video")}
            value={section.video_url ?? ""}
            disabled={disabled}
            className={`h-8 text-sm ${videoError ? "border-destructive focus-visible:ring-destructive" : ""}`}
            aria-invalid={!!videoError}
            placeholder="https://youtu.be/... ou https://drive.google.com/file/d/..."
            onChange={(e) => onPatch({ video_url: e.target.value.trim() ? e.target.value : null })}
          />
          <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted">
            {uploading === "video" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
            <input type="file" accept="video/*" className="hidden" disabled={disabled || uploading !== null} aria-label={`Enviar vídeo da seção ${index + 1}`} onChange={(e) => upload(e.target.files, "video")} />
          </label>
          {section.video_url && (
            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Remover vídeo" aria-label={`Remover vídeo da seção ${index + 1}`} onClick={() => onPatch({ video_url: null })}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {videoError ? (
          <p className="text-[11px] text-destructive flex items-start gap-1" role="alert" data-testid={`video-error-${section.id}`}>
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {videoError}
          </p>
        ) : (
          video && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1" data-testid={`video-kind-${section.id}`}>
              <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-success" /> {VIDEO_KIND_LABEL[video.kind]}
            </p>
          )
        )}
        <VideoHelp />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1"><ImagePlus className="h-3.5 w-3.5" /> Imagens</Label>
        {section.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {section.image_urls.map((url, j) => (
              <div key={j} className="relative h-16 w-24 overflow-hidden rounded border">
                <img src={url} alt={`Imagem ${j + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5 text-destructive"
                  aria-label={`Remover imagem ${j + 1} da seção ${index + 1}`}
                  onClick={() => onPatch({ image_urls: section.image_urls.filter((_, k) => k !== j) })}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input value={imageUrlDraft} disabled={disabled} className="h-8 text-sm" placeholder="Cole a URL de uma imagem" aria-label={`URL de imagem da seção ${index + 1}`} onChange={(e) => setImageUrlDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl(); } }} />
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={addImageUrl} disabled={!imageUrlDraft.trim()}>Adicionar</Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted">
            {uploading === "image" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
            <input type="file" accept="image/*" multiple className="hidden" disabled={disabled || uploading !== null} aria-label={`Enviar imagens da seção ${index + 1}`} onChange={(e) => upload(e.target.files, "image")} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={id("cta_label")} className="text-xs font-semibold">Botão (opcional)</Label>
          <Input id={id("cta_label")} value={section.cta_label ?? ""} disabled={disabled} className="h-8 text-sm" placeholder="Ex: Falar no WhatsApp" onChange={(e) => onPatch({ cta_label: e.target.value.trim() ? e.target.value : null })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id("cta_url")} className="text-xs font-semibold">Link do botão</Label>
          <Input id={id("cta_url")} value={section.cta_url ?? ""} disabled={disabled} className="h-8 text-sm" placeholder="https://..." onChange={(e) => onPatch({ cta_url: e.target.value.trim() ? e.target.value : null })} />
        </div>
      </div>
    </div>
  );
}

/**
 * Editor de seções do onboarding (compartilhado entre Configurações e
 * a aba da obra): adicionar, remover, reordenar, ligar/desligar e editar
 * cada seção, com preview ao lado do jeito que o cliente vê.
 */
export function OnboardingSectionsEditor({ sections, onChange, uploadFolder, disabled, previewHeading, placeholders }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const patch = (id: string, p: Partial<OnboardingSection>) => onChange(sections.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const remove = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
    if (expanded === id) setExpanded(null);
  };
  const add = (layout: OnboardingLayout) => {
    const s = emptySection({ layout });
    onChange([...sections, s]);
    setExpanded(s.id);
  };
  const numbers = cardNumbers(sections);
  const onDragEnd = (r: DropResult) => {
    if (!r.destination || r.destination.index === r.source.index) return;
    onChange(moveSection(sections, r.source.index, r.destination.index));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] gap-6 items-start">
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-1.5">
          Seções
          <InfoHint>
            Cada seção tem um <strong>layout</strong>: capa, card numerado, texto corrido, destaque ou mídia ao lado. Escolha ao adicionar a seção ou depois, ao editá-la.
            Os textos aceitam as variáveis abaixo, que o portal preenche com os dados da obra (clique para copiar).
          </InfoHint>
        </p>
        <div className="flex flex-wrap gap-1.5" aria-label="Variáveis disponíveis">
          {ONBOARDING_PLACEHOLDERS.map((v) => (
            <button
              key={v.key}
              type="button"
              title={`${v.label}. Clique para copiar.`}
              className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => {
                navigator.clipboard?.writeText(`{${v.key}}`);
                toast({ title: `{${v.key}} copiado`, description: v.label });
              }}
            >
              {`{${v.key}}`}
            </button>
          ))}
        </div>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="onboarding-sections">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {sections.map((s, index) => {
                  const isOpen = expanded === s.id;
                  const label = s.title.trim() || `Seção ${index + 1}`;
                  return (
                    <Draggable key={s.id} draggableId={s.id} index={index} isDragDisabled={disabled}>
                      {(drag, snapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={`rounded-lg border bg-background ${snapshot.isDragging ? "shadow-lg" : ""} ${!s.is_active ? "opacity-70" : ""}`}
                          data-testid={`section-${s.id}`}
                        >
                          <div className="flex items-center gap-2 p-2.5">
                            <span {...drag.dragHandleProps} className="cursor-grab text-muted-foreground/50 active:cursor-grabbing" aria-label={`Arrastar ${label}`}>
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <span className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {(() => {
                                const l = sectionLayout(s, index);
                                return l === "card" ? `Card ${String(numbers.get(s.id) ?? 0).padStart(2, "0")}` : layoutLabel(l);
                              })()}
                            </span>
                            <Switch checked={s.is_active} disabled={disabled} aria-label={`Mostrar ${label} ao cliente`} onCheckedChange={(v) => patch(s.id, { is_active: v })} />
                            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded(isOpen ? null : s.id)}>
                              <p className="truncate text-sm font-medium">{label}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[s.video_url ? "vídeo" : null, s.image_urls.length ? `${s.image_urls.length} imagem(ns)` : null, s.cta_label ? "botão" : null].filter(Boolean).join(" · ") || "só texto"}
                              </p>
                            </button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={disabled || index === 0} aria-label={`Subir ${label}`} onClick={() => onChange(moveSection(sections, index, index - 1))}>
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={disabled || index === sections.length - 1} aria-label={`Descer ${label}`} onClick={() => onChange(moveSection(sections, index, index + 1))}>
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" disabled={disabled} aria-label={`Remover ${label}`} onClick={() => remove(s.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-8 px-2" aria-expanded={isOpen} aria-label={`Editar ${label}`} onClick={() => setExpanded(isOpen ? null : s.id)}>
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                          {isOpen && (
                            <div className="border-t bg-muted/20 p-3">
                              <SectionFields section={s} index={index} uploadFolder={uploadFolder} disabled={disabled} onPatch={(p) => patch(s.id, p)} />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" disabled={disabled}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar seção
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="text-xs">Escolha o layout da nova seção</DropdownMenuLabel>
            {ONBOARDING_LAYOUTS.map((l) => (
              <DropdownMenuItem key={l.key} onSelect={() => add(l.key)} className="items-start gap-2.5 py-2">
                <LayoutThumb layout={l.key} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{l.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{l.description}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="lg:sticky lg:top-14">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            Preview: como o cliente vê
            <InfoHint>
              Tela de boas-vindas do portal, {placeholders ? "com os dados desta obra" : "com dados de exemplo"}. Seções desligadas aparecem esmaecidas aqui e somem no portal.
            </InfoHint>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto p-2">
          {sections.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma seção ainda.</p>
          ) : (
            <OnboardingView
              sections={sections}
              placeholders={placeholders ?? { ...SAMPLE_PLACEHOLDERS, projeto: previewHeading || SAMPLE_PLACEHOLDERS.projeto }}
              onEnter={() => undefined}
              showInactive
              compact
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
