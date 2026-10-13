import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, ExternalLink, Layers, Link2, RotateCcw, Save, Undo2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useProjectOnboarding } from "@/hooks/useProjectOnboarding";
import { useClientPortalToken } from "@/hooks/useClientPortalToken";
import { OnboardingSectionsEditor } from "@/components/onboarding/OnboardingSectionsEditor";
import { useScheduleTasks } from "@/hooks/useScheduleTasks";
import { useWeeklyReports } from "@/hooks/useWeeklyReports";
import { buildOnboardingPlaceholders, cloneSectionsForProject, invalidVideoSections, sectionsEqual, type OnboardingSection } from "@/lib/onboarding";
import type { PortalTask, PortalWeeklyReport } from "@/lib/portal";
import { InvalidVideosNotice } from "@/components/onboarding/InvalidVideosNotice";
import { LinkClientNotice } from "./LinkClientNotice";
import { InfoHint } from "@/components/visual/InfoHint";

interface Props {
  projectId: string;
  projectName?: string;
  /** Dados da obra para as variáveis do onboarding ({cliente}, {entrega}...). */
  clientName?: string | null;
  address?: string | null;
  city?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  moveInDate?: string | null;
}

/**
 * Aba Onboarding da obra.
 *
 * A obra escolhe qual modelo de onboarding segue (Configurações →
 * Onboarding). Sem escolha, segue o padrão do time. Ao salvar qualquer
 * mudança nas seções, a obra ganha a própria cópia e deixa de ser afetada
 * pelo modelo; "Voltar a seguir o modelo" apaga a cópia.
 */
export function ProjectOnboardingTab({ projectId, projectName, clientName, address, city, startDate, expectedEndDate, moveInDate }: Props) {
  const {
    effectiveSections, templateSections, template, templates, defaultTemplate, followedTemplateId,
    usesTemplate, isEnabled, isLoading, isFetched, dataUpdatedAt,
    saveOverride, setTemplate, setEnabled, resetToTemplate,
  } = useProjectOnboarding(projectId);
  const { activeToken, createToken, isCreating } = useClientPortalToken(projectId);
  const { items: scheduleTasks } = useScheduleTasks(projectId);
  const { reports } = useWeeklyReports(projectId);

  // Mesmas variáveis que o portal preenche, com os dados reais desta obra.
  const placeholders = useMemo(
    () =>
      buildOnboardingPlaceholders({
        clientName,
        projectName,
        address,
        city,
        startDate,
        expectedEndDate,
        moveInDate,
        tasks: (scheduleTasks ?? []) as unknown as PortalTask[],
        reports: (reports ?? []) as unknown as PortalWeeklyReport[],
      }),
    [clientName, projectName, address, city, startDate, expectedEndDate, moveInDate, scheduleTasks, reports],
  );

  // Rascunho: quando a obra segue um modelo, o rascunho é uma cópia com
  // ids novos (é o que vira cópia personalizada ao salvar).
  const baseline = useMemo(
    () => (usesTemplate ? cloneSectionsForProject(effectiveSections) : effectiveSections),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveSections, usesTemplate, dataUpdatedAt],
  );
  const [draft, setDraft] = useState<OnboardingSection[] | null>(null);
  const [pulledFromTemplate, setPulledFromTemplate] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  const dirty = draft != null && (pulledFromTemplate || !sectionsEqual(draft, baseline));
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!isFetched) return;
    if (draft == null || !dirtyRef.current) {
      setDraft(baseline);
      setPulledFromTemplate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline, isFetched]);

  const portalUrl = activeToken?.token ? `${window.location.origin}/client/${activeToken.token}` : null;

  if (isLoading || !draft) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const selectedTemplateId = followedTemplateId ?? defaultTemplate?.id ?? null;

  const chooseTemplate = (id: string) => {
    if (id === selectedTemplateId && usesTemplate) return;
    // Com cópia personalizada, trocar de modelo descarta a cópia: confirma antes.
    if (!usesTemplate) {
      setConfirmSwitch(id);
      return;
    }
    setTemplate.mutate(id);
  };

  const pullFromTemplate = () => {
    setDraft(cloneSectionsForProject(templateSections));
    setPulledFromTemplate(true);
  };

  const videoErrors = invalidVideoSections(draft);

  const handleSave = () => {
    saveOverride.mutate({ sections: draft }, { onSuccess: () => setPulledFromTemplate(false) });
  };

  const templateName = template?.name ?? "padrão";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            Onboarding do cliente
            <InfoHint>
              {usesTemplate
                ? `Esta obra segue o modelo "${templateName}" ao vivo. Ao salvar qualquer alteração aqui, ela ganha a própria versão e o modelo não muda.`
                : "Alterações aqui valem só para esta obra. Os modelos continuam iguais."}
            </InfoHint>
            {usesTemplate ? (
              <Badge variant="secondary" className="text-[10px]"><Layers className="h-3 w-3 mr-1" /> Modelo: {templateName}</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Personalizado para esta obra</Badge>
            )}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={isEnabled} aria-label="Mostrar onboarding no portal desta obra" onCheckedChange={(v) => setEnabled.mutate(v)} disabled={setEnabled.isPending} />
            Visível no portal
          </label>
          {portalUrl ? (
            <>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(portalUrl); toast({ title: "Link do portal copiado" }); }}>
                <Copy className="h-4 w-4 mr-1" /> Copiar link do portal
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Abrir portal</a>
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => createToken()} disabled={isCreating}>
              <Link2 className="h-4 w-4 mr-1" /> {isCreating ? "Gerando link…" : "Gerar link do portal"}
            </Button>
          )}
        </div>
      </div>

      {!clientName?.trim() && <LinkClientNotice projectId={projectId} projectName={projectName} />}

      {/* Escolha do modelo */}
      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          Modelo de onboarding desta obra
          {!usesTemplate && templates.length > 0 && (
            <InfoHint>Esta obra tem uma cópia personalizada. Escolher um modelo descarta a cópia e volta a seguir o modelo ao vivo.</InfoHint>
          )}
        </p>
        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum modelo cadastrado ainda. Crie os modelos em Configurações → Onboarding, ou monte as seções só para esta obra abaixo.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Modelo de onboarding">
            {templates.map((t) => {
              const selected = t.id === selectedTemplateId;
              return (
                <Button
                  key={t.id}
                  role="radio"
                  aria-checked={selected && usesTemplate}
                  size="sm"
                  variant={selected && usesTemplate ? "default" : "outline"}
                  onClick={() => chooseTemplate(t.id)}
                  disabled={setTemplate.isPending}
                  title={t.description ?? undefined}
                >
                  {t.name}
                  {t.is_default && <span className="ml-1.5 text-[10px] opacity-70">padrão</span>}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {!portalUrl && (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
          Você já pode montar, ajustar e ver o onboarding desta obra. O link do portal só é necessário para enviar ao cliente: use "Gerar link do portal" quando quiser compartilhar.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={pullFromTemplate} disabled={saveOverride.isPending || templateSections.length === 0} title={`Substitui o rascunho pelas seções do modelo "${templateName}" para você personalizar em cima`}>
            <Layers className="h-4 w-4 mr-1" /> Copiar do modelo
          </Button>
          {!usesTemplate && (
            <Button size="sm" variant="ghost" onClick={() => setConfirmReset(true)} disabled={resetToTemplate.isPending}>
              <RotateCcw className="h-4 w-4 mr-1" /> Voltar a seguir o modelo
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Alterações não salvas</Badge>}
          <Button size="sm" variant="ghost" onClick={() => { setDraft(baseline); setPulledFromTemplate(false); }} disabled={!dirty || saveOverride.isPending}>
            <Undo2 className="h-4 w-4 mr-1" /> Descartar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saveOverride.isPending || videoErrors.length > 0}>
            <Save className="h-4 w-4 mr-1" /> {saveOverride.isPending ? "Salvando…" : "Salvar para esta obra"}
          </Button>
        </div>
      </div>

      {draft.length === 0 && templateSections.length === 0 && (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
          Nenhuma seção ainda. Monte um modelo em Configurações → Onboarding, ou adicione seções só para esta obra.
        </p>
      )}

      <InvalidVideosNotice errors={videoErrors} />

      <OnboardingSectionsEditor sections={draft} onChange={setDraft} uploadFolder={projectId} disabled={saveOverride.isPending} previewHeading={projectName} placeholders={placeholders} />

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voltar a seguir o modelo "{templateName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A personalização desta obra será apagada e o portal passará a mostrar o modelo, inclusive mudanças futuras nele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmReset(false); resetToTemplate.mutate(); }}>Voltar ao modelo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSwitch != null} onOpenChange={(o) => !o && setConfirmSwitch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar o modelo desta obra?</AlertDialogTitle>
            <AlertDialogDescription>
              A cópia personalizada desta obra será apagada e o portal passará a mostrar o modelo "{templates.find((t) => t.id === confirmSwitch)?.name}" ao vivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = confirmSwitch;
                setConfirmSwitch(null);
                if (id) setTemplate.mutate(id);
              }}
            >
              Trocar modelo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
