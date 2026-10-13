import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { OnboardingView } from "@/components/onboarding/OnboardingView";
import { TrilhaShell } from "@/components/portal/TrilhaShell";
import { GaleriaScreen, InicioScreen, OrcamentoScreen, PendenciasScreen, ResumosScreen } from "@/components/portal/PortalScreens";
import { AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { sectionsFromJson, visibleSections } from "@/lib/onboarding";
import { extractPendings, onboardingSeenKey, tabFromHash, type PortalData, type PortalTab } from "@/lib/portal";

function readSeen(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function writeSeen(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* modo privado: segue sem persistir */
  }
}

/**
 * Trilha do Cliente (/client/:token).
 *
 * Fluxo do mockup: a Tela 0 (boas-vindas configuráveis pela equipe)
 * aparece na primeira visita e some ao clicar em "Entrar no meu projeto";
 * depois o cliente cai na Trilha (escopos entregues, blocos de construção,
 * saúde do projeto, adoção e próximas entregas) e navega pelas telas de
 * apoio (pendências, galeria, orçamento, resumo semanal) com a URL
 * guardando a tela (#hash).
 */
export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<PortalTab>(() => tabFromHash(typeof window !== "undefined" ? window.location.hash : ""));
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [respondModal, setRespondModal] = useState<{ reportId: string; item: string } | null>(null);
  const [responseText, setResponseText] = useState("");
  const [clientName, setClientName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-client-portal-data`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro desconhecido");
        setData(json);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const onboardingSections = useMemo(() => visibleSections(sectionsFromJson(data?.onboarding?.sections ?? [])), [data]);
  const hasWelcome = onboardingSections.length > 0;

  // Primeira visita com boas-vindas configuradas => Tela 0.
  useEffect(() => {
    if (!data || !token || showWelcome !== null) return;
    setShowWelcome(hasWelcome && !readSeen(onboardingSeenKey(token)));
  }, [data, token, hasWelcome, showWelcome]);

  // Hash <-> aba (deep link e botão voltar do navegador).
  useEffect(() => {
    const onHash = () => setTab(tabFromHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const goTab = useCallback((next: PortalTab) => {
    setTab(next);
    if (typeof window !== "undefined") {
      const hash = next === "inicio" ? "" : `#${next}`;
      if (window.location.hash !== hash) window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const enterProject = () => {
    if (token) writeSeen(onboardingSeenKey(token));
    setShowWelcome(false);
    goTab("inicio");
  };

  const submitResponse = async (reportId: string, pendingItem: string, status: "aprovado" | "respondido", text?: string) => {
    let name = clientName;
    if (!name) {
      name = prompt("Seu nome (para registro):") || "";
      if (!name) {
        toast.error("Nome é obrigatório para registrar a resposta");
        return;
      }
      setClientName(name);
    }

    setSubmitting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-client-response`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({
          token,
          weekly_report_id: reportId,
          pending_item: pendingItem,
          response_text: text || null,
          status,
          client_name: name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao enviar resposta");

      if (data) {
        setData({
          ...data,
          pending_responses: [
            ...(data.pending_responses || []),
            {
              id: json.data?.id || crypto.randomUUID(),
              weekly_report_id: reportId,
              pending_item: pendingItem,
              response_text: text || null,
              status,
              responded_at: new Date().toISOString(),
              client_name: name,
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      toast.success(status === "aprovado" ? "Aprovado com sucesso!" : "Resposta enviada!");
      setRespondModal(null);
      setResponseText("");
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (data && showWelcome === null)) {
    return (
      <div className="trilha flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="trilha flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 pb-8 pt-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-[var(--trilha-terracota)]" />
            <h1 className="font-display text-xl">Link inválido ou expirado</h1>
            <p className="text-sm text-[var(--trilha-navy)]/70">
              Este link de acompanhamento não é válido. Solicite um novo link ao responsável pelo seu projeto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const placeholders = { cliente: data.project.client_name, projeto: data.project.name };

  if (showWelcome) {
    return (
      <div className="trilha min-h-screen" data-testid="welcome-gate">
        <OnboardingView sections={onboardingSections} placeholders={placeholders} onEnter={enterProject} />
      </div>
    );
  }

  const openPendings = extractPendings(data.weekly_reports, data.pending_responses).filter((p) => p.isOpen).length;
  const screenProps = {
    data,
    submitting,
    onApprove: (reportId: string, item: string) => submitResponse(reportId, item, "aprovado"),
    onRespond: (reportId: string, item: string) => setRespondModal({ reportId, item }),
    onOpenPhoto: (url: string) => setLightboxUrl(url),
    onGoTab: goTab,
  };

  return (
    <TrilhaShell
      clientName={data.project.client_name}
      projectName={data.project.name}
      active={tab}
      onChange={goTab}
      onShowWelcome={hasWelcome ? () => setShowWelcome(true) : undefined}
      badges={{ pendencias: openPendings }}
    >
      {tab === "inicio" && <InicioScreen {...screenProps} />}
      {tab === "pendencias" && <PendenciasScreen {...screenProps} />}
      {tab === "galeria" && <GaleriaScreen {...screenProps} />}
      {tab === "orcamento" && <OrcamentoScreen {...screenProps} />}
      {tab === "resumos" && <ResumosScreen {...screenProps} />}

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-h-[90vh] max-w-[90vw] p-1">
          {lightboxUrl && <img src={lightboxUrl} alt="Foto da obra" className="h-full w-full rounded object-contain" />}
        </DialogContent>
      </Dialog>

      {/* Responder pendência */}
      <Dialog open={!!respondModal} onOpenChange={() => { setRespondModal(null); setResponseText(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responder pendência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-r-md border-l-4 border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)]/10 p-3">
              <p className="text-sm">{respondModal?.item}</p>
            </div>
            <div>
              <Label>Seu nome</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome para registro" required />
            </div>
            <div>
              <Label>Sua resposta</Label>
              <Textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Escreva sua resposta..." rows={4} required />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRespondModal(null); setResponseText(""); }}>Cancelar</Button>
            <Button
              disabled={submitting || !responseText.trim() || !clientName.trim()}
              onClick={() => {
                if (respondModal) submitResponse(respondModal.reportId, respondModal.item, "respondido", responseText);
              }}
            >
              <Send className="mr-1 h-4 w-4" /> Enviar resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TrilhaShell>
  );
}
