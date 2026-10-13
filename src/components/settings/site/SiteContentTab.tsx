import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, RotateCcw, Send, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSiteContentAdmin } from "@/hooks/useSiteContent";
import {
  SITE_DEFAULTS,
  SITE_SECTION_DEFINITIONS,
  diffSiteContent,
  siteContentEqual,
  siteSectionEqual,
  type SiteContent,
  type SiteSectionKey,
} from "@/lib/siteContent";
import carousel1 from "@/assets/carousel-1.jpg";
import carousel2 from "@/assets/carousel-2.jpg";
import carousel3 from "@/assets/carousel-3.jpg";
import foundersPhoto from "@/assets/founders-photo.png";
import logoBege from "@/assets/logo-bege.png";
import { SiteField } from "./SiteFields";
import { SitePreview } from "./SitePreview";
import { InfoHint } from "@/components/visual/InfoHint";

/** Imagem que o site usa quando o campo está vazio (mesma lógica das seções). */
function defaultImage(section: SiteSectionKey, field: string, index: number): string {
  if (section === "hero" && field === "image") return carousel1;
  if (section === "about" && field === "photo") return foundersPhoto;
  if (section === "footer" && field === "logo") return logoBege;
  if (section === "portfolio") return [carousel1, carousel2, carousel3][index % 3];
  return carousel1;
}

/**
 * Configurações → Site: edição do conteúdo do site institucional.
 *
 * Rascunho local para todas as seções; o preview mostra a seção com o
 * rascunho e "Publicar" grava em site_content, que o site lê a cada acesso.
 */
export default function SiteContentTab() {
  const { rows, content, lastUpdatedAt, isLoading, isFetched, dataUpdatedAt, publish } = useSiteContentAdmin();
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [active, setActive] = useState<SiteSectionKey>("hero");
  const dirtyRef = useRef(false);

  const dirty = draft != null && !siteContentEqual(draft, content);
  dirtyRef.current = dirty;

  // Recarrega o rascunho quando o publicado muda, a menos que haja edição em curso.
  useEffect(() => {
    if (!isFetched) return;
    if (draft == null || !dirtyRef.current) setDraft(content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isFetched, dataUpdatedAt]);

  if (isLoading || !draft) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const def = SITE_SECTION_DEFINITIONS.find((d) => d.key === active)!;
  const sectionDraft = draft[active] as unknown as Record<string, unknown>;
  const sectionDirty = !siteSectionEqual(draft, content, active);
  const sectionIsDefault = siteSectionEqual(draft, SITE_DEFAULTS, active);

  const setField = (name: string, value: unknown) =>
    setDraft((d) => (d ? ({ ...d, [active]: { ...d[active], [name]: value } } as SiteContent) : d));

  const handlePublish = () => {
    const changes = diffSiteContent(draft, content, rows.map((r) => r.key));
    if (changes.upserts.length === 0 && changes.deletes.length === 0) return;
    publish.mutate(changes);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
        <div>
          <h3 className="font-semibold flex items-center gap-1.5">
            Site institucional
            <InfoHint>Edite textos e imagens do site. Ao publicar, a mudança vale no próximo acesso ao site, sem novo deploy.</InfoHint>
          </h3>
          {lastUpdatedAt && (
            <p className="text-xs text-muted-foreground">
              Última publicação: {format(new Date(lastUpdatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="secondary">Alterações não publicadas</Badge>}
          <Button asChild variant="ghost" size="sm">
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" /> Ver site
            </a>
          </Button>
          <Button variant="outline" size="sm" disabled={!dirty || publish.isPending} onClick={() => setDraft(content)}>
            <Undo2 className="h-4 w-4 mr-1" /> Descartar
          </Button>
          <Button size="sm" disabled={!dirty || publish.isPending} onClick={handlePublish}>
            <Send className="h-4 w-4 mr-1" /> {publish.isPending ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seções do site">
        {SITE_SECTION_DEFINITIONS.map((s) => {
          const changed = !siteSectionEqual(draft, content, s.key);
          return (
            <Button
              key={s.key}
              role="tab"
              aria-selected={active === s.key}
              size="sm"
              variant={active === s.key ? "default" : "outline"}
              onClick={() => setActive(s.key)}
            >
              {s.label}
              {changed && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="alterada" />}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-1.5">
                  {def.label}
                  <InfoHint>{def.description}</InfoHint>
                </CardTitle>
              </div>
              <div className="flex gap-1">
                {sectionDirty && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setDraft((d) => (d ? ({ ...d, [active]: content[active] } as SiteContent) : d))}
                  >
                    <Undo2 className="h-3 w-3 mr-1" /> Desfazer seção
                  </Button>
                )}
                {!sectionIsDefault && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    title="Volta os textos e imagens desta seção para o original do site"
                    onClick={() => setDraft((d) => (d ? ({ ...d, [active]: structuredClone(SITE_DEFAULTS[active]) } as SiteContent) : d))}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Restaurar padrão
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {def.fields.map((field) => (
              <SiteField
                key={`${active}.${field.name}`}
                id={`site-${active}-${field.name}`}
                field={field}
                value={sectionDraft[field.name]}
                folder={active}
                defaultImageFor={(i) => defaultImage(active, field.name, i)}
                onChange={(v) => setField(field.name, v)}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3 xl:sticky xl:top-16">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-1.5">
              Preview
              <InfoHint>Como a seção vai ficar no site depois de publicar.</InfoHint>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SitePreview section={active} content={draft} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
