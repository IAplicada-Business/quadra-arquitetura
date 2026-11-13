import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Check, DollarSign, BarChart3, Loader2, FileDown, FileX, Info, CheckCircle2, ArrowRight, RotateCcw, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PriceSearchDialog } from "@/components/projects/PriceSearchDialog";
import { usePriceResearch, PriceStatus } from "@/hooks/usePriceResearch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useScenarios, Scenario } from "@/hooks/useScenarios";
import { useBudgetApprovalEvents } from "@/hooks/useBudgetApprovalEvents";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildCotacaoInstallments, createSingleFlight } from "@/lib/cotacaoInstallments";
import { format } from "date-fns";

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const finishLevels = [
  { value: 1, label: "Básico" },
  { value: 2, label: "Intermediário" },
  { value: 3, label: "Alto Padrão" },
];

interface ProjectScenariosTabProps {
  projectId: string;
  onTabChange?: (tab: string) => void;
}

export function ProjectScenariosTab({ projectId, onTabChange }: ProjectScenariosTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { project, updateProject } = useProjectDetail(projectId);
  const { scenarios, isLoading, createScenario, removeScenario, addItem, updateItem, removeItem, approveScenario } = useScenarios(projectId);
  const { events: approvalEvents, unlock } = useBudgetApprovalEvents(projectId);

  const [newScenarioName, setNewScenarioName] = useState("");
  const [addItemOpen, setAddItemOpen] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ discipline: "", description: "", estimated_value: "" });
  const [budgetInput, setBudgetInput] = useState((project as any)?.client_budget?.toString() || "");
  const [confirmApproveScenario, setConfirmApproveScenario] = useState<Scenario | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ analysis_text: string; items: any[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalInstallments, setApprovalInstallments] = useState("6");
  const [approvalStartDate, setApprovalStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [approvalInterval, setApprovalInterval] = useState<"semanal" | "quinzenal" | "mensal">("mensal");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [reviseLoading, setReviseLoading] = useState(false);

  // Batch price search state
  const [batchSearchOpen, setBatchSearchOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCached, setBatchCached] = useState(0);
  const [batchSearching, setBatchSearching] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [priceDialogActivity, setPriceDialogActivity] = useState<{ id: string; name: string } | null>(null);

  const { research, getPriceStatus, getActivitiesNeedingSearch, getLastUpdateDate } = usePriceResearch(projectId);

  const projectData = project as any;
  const sourceProposalId = projectData?.source_proposal_id as string | null;
  const cotacaoImportada = projectData?.cotacao_importada as boolean;
  const cotacaoAprovada = projectData?.cotacao_aprovada as boolean;
  const cotacaoValorTotal = projectData?.cotacao_valor_total as number | null;
  const cotacaoAprovadaAt = projectData?.cotacao_aprovada_at as string | null;

  const approvedScenario = scenarios.find(s => s.is_approved);
  const approvedTotal = approvedScenario
    ? (approvedScenario.scenario_items || []).filter(i => i.is_included).reduce((s, i) => s + (i.estimated_value || 0), 0)
    : 0;

  // Trava síncrona: setApprovalLoading só vale no próximo render, então dois
  // cliques rápidos (ou duas abas) passavam e geravam parcelas em dobro.
  const approveGuard = useRef(createSingleFlight()).current;

  const handleApproveCotacao = () =>
    approveGuard(async () => {
      if (!user || !approvedScenario) return;
      setApprovalLoading(true);
      try {
        // Checa no banco (não no estado da tela): se já existem parcelas da
        // cotação, não gera de novo — cobre aba desatualizada e segundo clique.
        const { count: existing, error: checkErr } = await supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("source", "cotacao");
        if (checkErr) throw checkErr;
        if ((existing ?? 0) > 0) {
          queryClient.invalidateQueries({ queryKey: ["project", projectId] });
          queryClient.invalidateQueries({ queryKey: ["payments", projectId] });
          setApprovalModalOpen(false);
          toast.info("Esta cotação já foi aprovada: as parcelas já existem em Prestação de Contas.");
          return;
        }

        const numInstallments = Math.max(1, parseInt(approvalInstallments) || 1);
        const payments = buildCotacaoInstallments({
          projectId,
          userId: user.id,
          total: approvedTotal,
          count: numInstallments,
          startDate: new Date(approvalStartDate),
          interval: approvalInterval,
        });

        // 1. Parcelas primeiro: se falhar, o projeto não fica marcado como aprovado.
        const { error: payErr } = await supabase.from("payments").insert(payments);
        if (payErr) throw payErr;

        // 2. Marca o projeto
        const { error: projErr } = await supabase.from("projects").update({
          cotacao_aprovada: true,
          cotacao_valor_total: approvedTotal,
          cotacao_aprovada_at: new Date().toISOString(),
        } as any).eq("id", projectId);
        if (projErr) throw projErr;

        queryClient.invalidateQueries({ queryKey: ["project", projectId] });
        queryClient.invalidateQueries({ queryKey: ["payments", projectId] });
        setApprovalModalOpen(false);
        toast.success(`Cotação aprovada. ${numInstallments} pagamentos criados em Prestação de Contas.`, {
          action: onTabChange ? { label: "Ver pagamentos", onClick: () => onTabChange("financeiro") } : undefined,
        });
      } catch (err: any) {
        toast.error(err.message || "Erro ao aprovar cotação");
      } finally {
        setApprovalLoading(false);
      }
    });

  const handleReviseCotacao = async () => {
    setReviseLoading(true);
    try {
      // Delete payments generated from cotacao
      await supabase.from("payments").delete().eq("project_id", projectId).eq("source", "cotacao");
      // Reset project flags
      await supabase.from("projects").update({
        cotacao_aprovada: false,
        cotacao_valor_total: null,
        cotacao_aprovada_at: null,
      } as any).eq("id", projectId);

      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["payments", projectId] });
      setReviseDialogOpen(false);
      toast.success("Cotação desbloqueada para revisão. Pagamentos gerados foram excluídos.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao revisar cotação");
    } finally {
      setReviseLoading(false);
    }
  };

  // Fetch source proposal data when available
  const { data: sourceProposal } = useQuery({
    queryKey: ["source_proposal", sourceProposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", sourceProposalId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sourceProposalId,
  });

  const showImportBanner = !!sourceProposalId && !cotacaoImportada && scenarios.length === 0;

  const handleImportFromProposal = async () => {
    if (!sourceProposal || !user) return;
    setImportLoading(true);
    try {
      // 1. Create scenario named "Proposta Aprovada"
      const { data: scenario, error: scenErr } = await supabase
        .from("scenarios")
        .insert({ user_id: user.id, project_id: projectId, name: "Proposta Aprovada" })
        .select()
        .single();
      if (scenErr) throw scenErr;

      // 2. Create scenario items from ambientes
      const ambientes = (sourceProposal as any).ambientes as any[] || [];
      if (ambientes.length > 0) {
        const items = ambientes.map((amb: any, idx: number) => ({
          scenario_id: scenario.id,
          user_id: user.id,
          discipline: typeof amb === "string" ? amb : (amb.name || amb.ambiente || `Ambiente ${idx + 1}`),
          description: typeof amb === "object" ? (amb.description || amb.area || null) : null,
          estimated_value: 0,
          is_included: true,
          display_order: idx,
        }));
        await supabase.from("scenario_items").insert(items);
      }

      // 3. Also add etapas_ativas as disciplines
      const etapas = (sourceProposal as any).etapas_ativas as string[] || [];
      if (etapas.length > 0) {
        const etapaItems = etapas.map((etapa: string, idx: number) => ({
          scenario_id: scenario.id,
          user_id: user.id,
          discipline: etapa,
          estimated_value: 0,
          is_included: true,
          display_order: ambientes.length + idx,
        }));
        await supabase.from("scenario_items").insert(etapaItems);
      }

      // 4. Update project with proposal data
      const updates: Record<string, unknown> = { cotacao_importada: true };
      if ((sourceProposal as any).price_full) updates.estimated_budget = (sourceProposal as any).price_full;
      if ((sourceProposal as any).total_area) updates.area_sqm = (sourceProposal as any).total_area;
      await supabase.from("projects").update(updates).eq("id", projectId);

      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Dados importados da proposta com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar dados");
    } finally {
      setImportLoading(false);
    }
  };

  const handleStartFromZero = async () => {
    await supabase.from("projects").update({ cotacao_importada: true } as any).eq("id", projectId);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  };

  const handleCreateScenario = () => {
    if (!newScenarioName.trim()) return;
    createScenario.mutate(newScenarioName.trim());
    setNewScenarioName("");
  };

  const handleAddItem = (scenarioId: string) => {
    if (!newItem.discipline.trim()) return;
    addItem.mutate({
      scenario_id: scenarioId,
      discipline: newItem.discipline,
      description: newItem.description || undefined,
      estimated_value: newItem.estimated_value ? Number(newItem.estimated_value) : 0,
    });
    setNewItem({ discipline: "", description: "", estimated_value: "" });
    setAddItemOpen(null);
  };

  const handleSaveBudget = () => {
    const val = budgetInput ? Number(budgetInput) : null;
    updateProject.mutate({ client_budget: val });
  };

  const handleApproveClick = (scenario: Scenario) => {
    const hasApproved = scenarios.some((s) => s.is_approved);
    if (hasApproved) {
      setConfirmApproveScenario(scenario);
    } else {
      approveScenario.mutate(scenario);
    }
  };

  const handleConfirmApprove = () => {
    if (confirmApproveScenario) {
      approveScenario.mutate(confirmApproveScenario);
      setConfirmApproveScenario(null);
    }
  };

  const clientBudget = (project as any)?.client_budget as number | null;

  const handleAnalyzeBudget = async () => {
    const approvedScenario = scenarios.find(s => s.is_approved);
    if (!approvedScenario) { toast.error("Aprove um cenário antes de analisar"); return; }
    setAnalysisLoading(true);
    setAnalysisOpen(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const { data: priceData } = await supabase.from("price_research").select("*").eq("project_id", projectId);
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-ai-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          action: "analyze_budget",
          data: {
            scenario_items: approvedScenario.scenario_items || [],
            price_research: priceData || [],
          },
        }),
      });
      if (!resp.ok) throw new Error("Erro ao analisar orçamento");
      const result = await resp.json();
      setAnalysisResult(result);
    } catch (err: any) {
      toast.error(err.message || "Erro na análise");
      setAnalysisOpen(false);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Fetch project activities for batch search
  const { data: projectActivities } = useQuery({
    queryKey: ["project_activities_for_prices", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_activities")
        .select("id, name, discipline, area_m2")
        .eq("project_id", projectId)
        .order("position");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const activitiesNeedingSearch = projectActivities
    ? getActivitiesNeedingSearch(projectActivities)
    : [];
  const lastUpdate = getLastUpdateDate();

  const handleBatchSearch = async () => {
    if (!projectActivities || !user) return;
    const needsSearch = projectActivities.filter((a) => activitiesNeedingSearch.includes(a.id));
    const cachedCount = projectActivities.length - needsSearch.length;

    setBatchTotal(needsSearch.length);
    setBatchCached(cachedCount);
    setBatchProgress(0);
    setBatchSearching(true);
    setBatchSearchOpen(true);

    try {
      for (const activity of needsSearch) {
        // Fetch materials for this activity
        const { data: materials } = await supabase
          .from("material_tracking")
          .select("material_name, unit, quantity_needed")
          .eq("project_id", projectId)
          .eq("activity_id", activity.id)
          .eq("is_active", true);

        const materialInputs = materials && materials.length > 0
          ? materials.map((m) => ({ name: m.material_name, unit: m.unit || "un", quantity: m.quantity_needed || 1 }))
          : [{ name: activity.name, unit: "un", quantity: 1 }];

        try {
          const { data, error } = await supabase.functions.invoke("search-prices-bh", {
            body: { activity_name: activity.name, materials: materialInputs, city: "Belo Horizonte" },
          });

          if (!error && data?.results) {
            const searchResults = data.results as any[];
            const itemsToSave = searchResults
              .filter((mr: any) => mr.results?.length > 0)
              .map((mr: any) => ({
                project_id: projectId,
                activity_id: activity.id,
                material_name: mr.material,
                price_min: Math.min(...mr.results.map((r: any) => r.price_min).filter((p: number) => p > 0)) || null,
                price_max: Math.max(...mr.results.map((r: any) => r.price_max).filter((p: number) => p > 0)) || null,
                unit: mr.unit,
                suppliers: mr.results,
                user_id: user.id,
              }));

            if (itemsToSave.length > 0) {
              await supabase.from("price_research" as any).insert(itemsToSave as any);
            }
          }
        } catch {
          // Continue with next activity even if one fails
        }

        setBatchProgress((prev) => prev + 1);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      queryClient.invalidateQueries({ queryKey: ["price_research", projectId] });
      toast.success(`Preços atualizados para ${needsSearch.length} atividades. ${cachedCount} já estavam em cache.`);
    } catch (err: any) {
      toast.error(err.message || "Erro na pesquisa em lote");
    } finally {
      setBatchSearching(false);
    }
  };

  const priceStatusIcon = (status: PriceStatus) => {
    if (status === "green") return <span className="cursor-pointer" title="Pesquisado há menos de 7 dias"></span>;
    if (status === "yellow") return <span className="cursor-pointer" title="Pesquisado entre 7 e 30 dias"></span>;
    return <span className="cursor-pointer" title="Sem pesquisa ou > 30 dias"></span>;
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Import from Proposal Banner */}
      {showImportBanner && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <Info className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Este projeto tem uma proposta aprovada</p>
              <p className="text-xs text-muted-foreground">Deseja importar ambientes, etapas e valores da proposta para pré-preencher a cotação?</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={handleStartFromZero}>
                <FileX className="h-4 w-4 mr-1" /> Começar do Zero
              </Button>
              <Button size="sm" onClick={handleImportFromProposal} disabled={importLoading}>
                {importLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                Importar da Proposta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cotação Aprovada Banner */}
      {cotacaoAprovada && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-center gap-4 py-4">
            <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-success">
                Cotação aprovada em {cotacaoAprovadaAt ? new Date(cotacaoAprovadaAt).toLocaleDateString("pt-BR") : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Total: {formatCurrency(cotacaoValorTotal)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {onTabChange && (
                <Button size="sm" variant="outline" onClick={() => onTabChange("financeiro")}>
                  Ver pagamentos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setReviseDialogOpen(true)}>
                <RotateCcw className="h-4 w-4 mr-1" /> Revisar Cotação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sourceProposal && cotacaoImportada && (
        <Card className="bg-muted/30">
          <CardContent className="flex items-center gap-6 py-3 text-sm flex-wrap">
            <div>
              <span className="text-muted-foreground">Valor contratado: </span>
              <strong className="text-primary">{formatCurrency((sourceProposal as any).price_full)}</strong>
            </div>
            {(sourceProposal as any).installments_count && (
              <div>
                <span className="text-muted-foreground">Parcelas: </span>
                <strong>{(sourceProposal as any).installments_count}x {formatCurrency((sourceProposal as any).installment_value)}</strong>
                {(sourceProposal as any).installment_entry > 0 && (
                  <span className="text-muted-foreground ml-1">(entrada: {formatCurrency((sourceProposal as any).installment_entry)})</span>
                )}
              </div>
            )}
            {(sourceProposal as any).scope_description && (
              <div className="basis-full">
                <span className="text-muted-foreground">Escopo: </span>
                <span className="text-xs">{(sourceProposal as any).scope_description}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Context */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Contexto do Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Orçamento do Cliente</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="R$"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSaveBudget} disabled={updateProject.isPending}>OK</Button>
              </div>
              {clientBudget != null && <span className="text-xs font-semibold text-primary">{formatCurrency(clientBudget)}</span>}
            </div>
            <div>
              <Label className="text-xs">Nível de Acabamento</Label>
              <Select
                value={String(projectData?.finish_level || "")}
                onValueChange={(v) => updateProject.mutate({ finish_level: Number(v) })}
              >
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {finishLevels.map(fl => (
                    <SelectItem key={fl.value} value={String(fl.value)}>{fl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Área (m²)</Label>
              <p className="text-sm font-medium mt-2">{projectData?.area_sqm ? `${projectData.area_sqm} m²` : "—"}</p>
            </div>
            <div>
              <Label className="text-xs">Tipo de Obra</Label>
              <p className="text-sm font-medium mt-2 capitalize">{projectData?.project_type || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Scenario + Analyze */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Nome da cotação (ex: Cotação A)"
          value={newScenarioName}
          onChange={(e) => setNewScenarioName(e.target.value)}
          className="max-w-[300px]"
          onKeyDown={(e) => e.key === "Enter" && handleCreateScenario()}
        />
        <Button onClick={handleCreateScenario} disabled={!newScenarioName.trim() || createScenario.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Nova Cotação
        </Button>
        <Button variant="outline" onClick={handleAnalyzeBudget} disabled={analysisLoading}>
          <BarChart3 className="h-4 w-4 mr-1" /> Analisar Orçamento
        </Button>
        <Button variant="outline" onClick={handleBatchSearch} disabled={batchSearching || !projectActivities?.length}>
          <RefreshCw className={cn("h-4 w-4 mr-1", batchSearching && "animate-spin")} /> Atualizar Preços de BH
          {projectActivities && activitiesNeedingSearch.length > 0 && (
            <Badge variant="destructive" className="ml-2 text-[10px] px-1.5">{activitiesNeedingSearch.length}</Badge>
          )}
          {projectActivities && activitiesNeedingSearch.length === 0 && lastUpdate && (
            <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
              {lastUpdate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </Badge>
          )}
        </Button>
        {approvedScenario && !cotacaoAprovada && (
          <Button variant="default" className="bg-success hover:bg-success/90" onClick={() => setApprovalModalOpen(true)}>
            <DollarSign className="h-4 w-4 mr-1" /> Aprovar Cotação
          </Button>
        )}
      </div>

      {/* Scenarios */}
      {scenarios.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          Nenhuma cotação criada. Crie uma cotação para começar a simulação.
        </div>
      ) : (
        <div className={scenarios.length >= 2 ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-4"}>
          {scenarios.map((scenario) => {
            const items = scenario.scenario_items || [];
            const totalIncluded = items.filter((i) => i.is_included).reduce((sum, i) => sum + (i.estimated_value || 0), 0);
            const totalAll = items.reduce((sum, i) => sum + (i.estimated_value || 0), 0);
            const overBudget = clientBudget != null && totalIncluded > clientBudget;

            return (
              <Card key={scenario.id} className={scenario.is_approved ? "border-green-500 border-2" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                      {scenario.is_approved && <Badge variant="default" className="text-xs bg-green-600">Aprovado</Badge>}
                      {scenario.approval_source === "client" && scenario.approved_at && (
                        <Badge variant="secondary" className="text-xs" data-testid={`scenario-client-approved-${scenario.id}`}>Aprovado pelo cliente</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {scenario.is_locked && scenario.approval_source === "client" && (
                        <Button size="sm" variant="outline" onClick={() => unlock.mutate(scenario.id)} disabled={unlock.isPending}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Reabrir para o cliente
                        </Button>
                      )}
                      {!scenario.is_approved && (
                        <Button size="sm" variant="default" onClick={() => handleApproveClick(scenario)} disabled={approveScenario.isPending}>
                          <Check className="h-3 w-3 mr-1" /> Aprovar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeScenario.mutate(scenario.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scenario.approval_source === "client" && scenario.approved_at && (
                    <div className="text-xs text-muted-foreground" data-testid={`scenario-approval-history-${scenario.id}`}>
                      Aprovado por <strong>{scenario.approved_by_name}</strong> em {new Date(scenario.approved_at).toLocaleString("pt-BR")}. Parcelas e escopo ainda dependem da equipe (botão Aprovar).
                    </div>
                  )}
                  {approvalEvents.filter((e) => e.scenario_id === scenario.id).length > 0 && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Histórico de aprovação</summary>
                      <ul className="mt-1 space-y-0.5">
                        {approvalEvents.filter((e) => e.scenario_id === scenario.id).map((e) => (
                          <li key={e.id}>
                            {new Date(e.created_at).toLocaleString("pt-BR")} · {e.action === "approve" ? "Aprovado" : "Reaberto"} · {e.actor_name || "—"}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="flex gap-4 text-sm flex-wrap">
                    <span>Incluído: <strong className={overBudget ? "text-destructive" : "text-green-600"}>{formatCurrency(totalIncluded)}</strong></span>
                    <span>Total: <strong>{formatCurrency(totalAll)}</strong></span>
                    {clientBudget != null && (
                      <span className={overBudget ? "text-destructive" : "text-muted-foreground"}>
                        {overBudget
                          ? ` +${formatCurrency(totalIncluded - clientBudget)}`
                          : ` -${formatCurrency(clientBudget - totalIncluded)}`}
                      </span>
                    )}
                  </div>

                  {items.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                      {items.map((item) => {
                        // Find matching activity by discipline name
                        const matchingActivity = projectActivities?.find(
                          (a) => a.discipline?.toLowerCase() === item.discipline?.toLowerCase() || a.name?.toLowerCase() === item.discipline?.toLowerCase()
                        );
                        const status = matchingActivity ? getPriceStatus(matchingActivity.id) : "red";

                        return (
                          <div key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                            <Checkbox
                              checked={item.is_included}
                              onCheckedChange={(checked) => updateItem.mutate({ id: item.id, is_included: !!checked })}
                            />
                            <button
                              type="button"
                              className="shrink-0"
                              onClick={() => {
                                if (matchingActivity) {
                                  setPriceDialogActivity({ id: matchingActivity.id, name: matchingActivity.name });
                                  setPriceDialogOpen(true);
                                }
                              }}
                              title={matchingActivity ? "Ver pesquisa de preços" : "Sem atividade vinculada"}
                            >
                              {priceStatusIcon(status)}
                            </button>
                            <span className={`flex-1 ${!item.is_included ? "line-through text-muted-foreground" : ""}`}>
                              {item.discipline}
                              {item.description && <span className="text-muted-foreground ml-1 text-xs">— {item.description}</span>}
                            </span>
                            <Input
                              type="number"
                              className="w-28 h-7 text-xs"
                              value={item.estimated_value || ""}
                              onChange={(e) => updateItem.mutate({ id: item.id, estimated_value: Number(e.target.value) || 0 })}
                            />
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeItem.mutate(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button size="sm" variant="outline" onClick={() => { setAddItemOpen(scenario.id); setNewItem({ discipline: "", description: "", estimated_value: "" }); }}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Disciplina
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={!!addItemOpen} onOpenChange={() => setAddItemOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Disciplina</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Disciplina *</Label>
              <Input value={newItem.discipline} onChange={(e) => setNewItem({ ...newItem, discipline: e.target.value })} placeholder="Ex: Elétrica" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" value={newItem.estimated_value} onChange={(e) => setNewItem({ ...newItem, estimated_value: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddItemOpen(null)}>Cancelar</Button>
              <Button onClick={() => addItemOpen && handleAddItem(addItemOpen)} disabled={!newItem.discipline.trim()}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Approve Dialog */}
      <AlertDialog open={!!confirmApproveScenario} onOpenChange={(open) => { if (!open) setConfirmApproveScenario(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir cenário aprovado?</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um cenário aprovado. Aprovar este novo cenário substituirá o escopo atual. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApprove}>Sim, aprovar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Budget Analysis Dialog */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Análise de Orçamento</DialogTitle>
          </DialogHeader>
          {analysisLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Comparando com preços de mercado...</p>
            </div>
          ) : analysisResult ? (
            <div className="space-y-4">
              <div className="text-sm whitespace-pre-wrap">{analysisResult.analysis_text}</div>
              {analysisResult.items.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {analysisResult.items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 shrink-0",
                          item.status === "above" ? "border-destructive text-destructive" :
                          item.status === "below" ? "border-green-600 text-green-600" :
                          "border-muted-foreground text-muted-foreground"
                        )}
                      >
                        {item.status === "above" ? "Acima" : item.status === "below" ? "Economia" : "OK"}
                      </Badge>
                      <span className="flex-1">{item.name}</span>
                      {item.current_price != null && <span className="text-xs">{formatCurrency(item.current_price)}</span>}
                      {item.note && <span className="text-xs text-muted-foreground">{item.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Approval Modal */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Cotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Geral</p>
                <p className="text-lg font-bold">{formatCurrency(approvedTotal)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Valor por parcela</p>
                <p className="text-lg font-bold">
                  {formatCurrency(approvedTotal / Math.max(1, parseInt(approvalInstallments) || 1))}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Número de parcelas</Label>
              <Input type="number" min="1" value={approvalInstallments} onChange={(e) => setApprovalInstallments(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data da primeira parcela</Label>
              <Input type="date" value={approvalStartDate} onChange={(e) => setApprovalStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Intervalo entre parcelas</Label>
              <Select value={approvalInterval} onValueChange={(v) => setApprovalInterval(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleApproveCotacao} disabled={approvalLoading}>
              {approvalLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revise Cotação Dialog */}
      <AlertDialog open={reviseDialogOpen} onOpenChange={setReviseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revisar cotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Revisar a cotação irá excluir os pagamentos gerados automaticamente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reviseLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReviseCotacao} disabled={reviseLoading}>
              {reviseLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Sim, revisar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Price Search Progress Modal */}
      <Dialog open={batchSearchOpen} onOpenChange={(open) => { if (!batchSearching) setBatchSearchOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pesquisa de Preços em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Progress value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0} className="h-3" />
            <p className="text-sm text-center">
              {batchSearching
                ? `Pesquisando preços: ${batchProgress} de ${batchTotal} atividades...`
                : `Concluído: ${batchTotal} atividades pesquisadas.`}
            </p>
            {batchCached > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                {batchCached} atividade(s) usando cache (pesquisadas há menos de 7 dias)
              </p>
            )}
          </div>
          {!batchSearching && (
            <DialogFooter>
              <Button onClick={() => setBatchSearchOpen(false)}>Fechar</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Individual Price Search Dialog */}
      {priceDialogActivity && (
        <PriceSearchDialog
          open={priceDialogOpen}
          onOpenChange={setPriceDialogOpen}
          activityName={priceDialogActivity.name}
          activityId={priceDialogActivity.id}
          projectId={projectId}
          materials={[{ name: priceDialogActivity.name, unit: "un", quantity: 1 }]}
          existingResearch={research.filter((r) => r.activity_id === priceDialogActivity.id)}
        />
      )}
    </div>
  );
}
