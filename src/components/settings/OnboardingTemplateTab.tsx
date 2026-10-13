import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Pencil, Plus, Save, Sparkles, Star, Trash2, Undo2 } from "lucide-react";
import { useOnboardingTemplate, useOnboardingTemplates } from "@/hooks/useOnboardingTemplate";
import { OnboardingSectionsEditor } from "@/components/onboarding/OnboardingSectionsEditor";
import { invalidVideoSections, sectionsEqual, starterSections, type OnboardingSection } from "@/lib/onboarding";
import { InvalidVideosNotice } from "@/components/onboarding/InvalidVideosNotice";

type TemplateDialog = { kind: "create"; copyFromId: string | null } | { kind: "rename"; id: string } | null;

/**
 * Configurações → Onboarding: modelos de onboarding do cliente.
 * Vários modelos por time (ex.: Residencial, Comercial); cada obra escolhe
 * qual segue na aba Onboarding do projeto. O modelo padrão vale para as
 * obras que não escolheram.
 */
export default function OnboardingTemplateTab() {
  const list = useOnboardingTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { template, sections, isLoading, isFetched, dataUpdatedAt, save } = useOnboardingTemplate(selectedId);
  const [draft, setDraft] = useState<OnboardingSection[] | null>(null);
  const [dialog, setDialog] = useState<TemplateDialog>(null);
  const [dialogName, setDialogName] = useState("");
  const [dialogDesc, setDialogDesc] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirtyRef = useRef(false);

  const dirty = draft != null && !sectionsEqual(draft, sections);
  dirtyRef.current = dirty;

  // Recarrega o rascunho quando muda o modelo selecionado ou o que está salvo.
  useEffect(() => {
    if (!isFetched) return;
    if (draft == null || !dirtyRef.current) setDraft(sections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, isFetched, dataUpdatedAt, template?.id]);

  // Modelo apagado ou trocado por fora: volta ao padrão.
  useEffect(() => {
    if (selectedId && list.isFetched && !list.templates.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [selectedId, list.isFetched, list.templates]);

  if (isLoading || !draft) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const selectTemplate = (id: string) => {
    if (id === template?.id) return;
    if (dirty && !window.confirm("Há alterações não salvas neste modelo. Trocar de modelo e descartá-las?")) return;
    setSelectedId(id);
    setDraft(null);
  };

  const openDialog = (next: TemplateDialog) => {
    if (next?.kind === "rename") {
      setDialogName(template?.name ?? "");
      setDialogDesc(template?.description ?? "");
    } else if (next?.kind === "create") {
      setDialogName(next.copyFromId ? `${template?.name ?? "Modelo"} (cópia)` : "");
      setDialogDesc(next.copyFromId ? template?.description ?? "" : "");
    }
    setDialog(next);
  };

  const submitDialog = () => {
    if (!dialog) return;
    const name = dialogName.trim();
    if (!name) return;
    if (dialog.kind === "create") {
      list.create.mutate(
        { name, description: dialogDesc, copyFromId: dialog.copyFromId },
        {
          onSuccess: (id) => {
            setSelectedId(id);
            setDraft(null);
          },
        },
      );
    } else {
      list.rename.mutate({ id: dialog.id, name, description: dialogDesc });
    }
    setDialog(null);
  };

  const others = list.templates.filter((t) => t.id !== template?.id);
  const videoErrors = draft ? invalidVideoSections(draft) : [];
  const canDelete = !!template && (!template.is_default || others.length === 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
        <div>
          <h3 className="font-semibold">Onboarding do cliente: modelos</h3>
          <p className="text-xs text-muted-foreground">
            Monte um modelo para cada tipo de obra. Na aba Onboarding de cada obra você escolhe qual modelo ela segue; obras sem escolha usam o padrão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Alterações não salvas</Badge>}
          <Button size="sm" variant="ghost" onClick={() => setDraft(sections)} disabled={!dirty || save.isPending}>
            <Undo2 className="h-4 w-4 mr-1" /> Descartar
          </Button>
          <Button size="sm" onClick={() => save.mutate(draft)} disabled={!dirty || save.isPending || videoErrors.length > 0}>
            <Save className="h-4 w-4 mr-1" /> {save.isPending ? "Salvando…" : "Salvar modelo"}
          </Button>
        </div>
      </div>

      {/* Lista de modelos */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Modelos de onboarding">
        {list.templates.map((t) => (
          <Button
            key={t.id}
            role="tab"
            aria-selected={t.id === template?.id}
            size="sm"
            variant={t.id === template?.id ? "default" : "outline"}
            onClick={() => selectTemplate(t.id)}
          >
            {t.name}
            {t.is_default && (
              <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                padrão
              </Badge>
            )}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="border-dashed" onClick={() => openDialog({ kind: "create", copyFromId: null })} disabled={list.create.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Novo modelo
        </Button>
      </div>

      {template && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {template.name}
              {template.is_default && <span className="text-muted-foreground font-normal"> · modelo padrão</span>}
            </p>
            {template.description && <p className="text-xs text-muted-foreground truncate">{template.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openDialog({ kind: "rename", id: template.id })}>
              <Pencil className="h-3 w-3 mr-1" /> Renomear
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openDialog({ kind: "create", copyFromId: template.id })} disabled={list.create.isPending}>
              <Copy className="h-3 w-3 mr-1" /> Duplicar
            </Button>
            {!template.is_default && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => list.setDefault.mutate(template.id)} disabled={list.setDefault.isPending}>
                <Star className="h-3 w-3 mr-1" /> Definir como padrão
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={!canDelete || list.remove.isPending}
              title={canDelete ? "Excluir este modelo" : "Defina outro modelo como padrão antes de excluir este"}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Excluir
            </Button>
          </div>
        </div>
      )}

      {draft.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {template ? "Este modelo ainda está vazio." : "Nenhum modelo ainda. Monte as seções e salve: o primeiro modelo vira o padrão."}
          </p>
          <Button size="sm" variant="outline" onClick={() => setDraft(starterSections())}>
            <Sparkles className="h-4 w-4 mr-1" /> Começar com a sugestão do mockup (capa + 3 passos)
          </Button>
        </div>
      )}

      <InvalidVideosNotice errors={videoErrors} />

      <OnboardingSectionsEditor sections={draft} onChange={setDraft} uploadFolder={template ? `template-${template.id}` : "template"} disabled={save.isPending} />

      {/* Novo modelo / renomear */}
      <Dialog open={dialog != null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "rename" ? "Renomear modelo" : dialog?.copyFromId ? "Duplicar modelo" : "Novo modelo de onboarding"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="onb-tpl-name">Nome</Label>
              <Input id="onb-tpl-name" value={dialogName} onChange={(e) => setDialogName(e.target.value)} placeholder="Ex.: Residencial, Comercial, Reforma" autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="onb-tpl-desc">Descrição (opcional)</Label>
              <Textarea id="onb-tpl-desc" value={dialogDesc} onChange={(e) => setDialogDesc(e.target.value)} rows={2} placeholder="Quando usar este modelo" />
            </div>
            {dialog?.kind === "create" && dialog.copyFromId && (
              <p className="text-xs text-muted-foreground">As seções de "{template?.name}" serão copiadas para o novo modelo.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={submitDialog} disabled={!dialogName.trim()}>
              {dialog?.kind === "rename" ? "Salvar" : "Criar modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir o modelo "{template?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              As seções deste modelo serão apagadas. Obras que seguiam este modelo passam a usar o modelo padrão; obras com cópia personalizada não mudam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDelete(false);
                if (template) {
                  list.remove.mutate(template.id);
                  setSelectedId(null);
                  setDraft(null);
                }
              }}
            >
              Excluir modelo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
