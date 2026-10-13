import { useState, useMemo } from "react";
import { Plus, RefreshCw, Search, Eye, FileDown, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScopeItems } from "@/hooks/useScopeItems";
import { useBudgetQuotes } from "@/hooks/useBudgetQuotes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BudgetQuoteTable } from "./BudgetQuoteTable";
import { BudgetQuoteForm } from "./BudgetQuoteForm";
import { ProjectPurchasesTab } from "./ProjectPurchasesTab";
import { ShoppingListDialog } from "./ShoppingListDialog";
import { ShoppingCart, Calculator } from "lucide-react";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { BudgetPreviewDialog } from "./BudgetPreviewDialog";
import { useMaterialIndices } from "@/hooks/useMaterialIndices";
import { usePriceResearch } from "@/hooks/usePriceResearch";
import { PriceSearchDialog } from "./PriceSearchDialog";
import { useProjectAI } from "@/hooks/useProjectAI";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function parsePaymentTerms(terms: string | null, totalValue: number): { percent: number; value: number }[] {
  if (!terms) return [{ percent: 100, value: totalValue }];
  const cleaned = terms.toLowerCase().trim();
  if (cleaned === "a vista" || cleaned === "à vista") return [{ percent: 100, value: totalValue }];

  // Try parsing "50%/50%" or "50/50" or "30/30/40"
  const parts = cleaned.replace(/%/g, "").split(/[\/,;]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  if (parts.length === 0) return [{ percent: 100, value: totalValue }];

  const sum = parts.reduce((a, b) => a + b, 0);
  return parts.map(p => {
    const pct = sum > 0 ? p / sum * 100 : 100 / parts.length;
    return { percent: Math.round(pct), value: Math.round(totalValue * pct / 100) };
  });
}

interface ProjectBudgetsTabProps {
  projectId: string;
  projectName?: string;
}

export function ProjectBudgetsTab({ projectId, projectName = "" }: ProjectBudgetsTabProps) {
  const { items: scopeItems } = useScopeItems(projectId);
  const { quotes, isLoading, create, update, remove, createRevision } = useBudgetQuotes(projectId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activities } = useProjectActivities(projectId);
  const { indices } = useMaterialIndices();
  const { research, getRecentForActivity } = usePriceResearch(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Record<string, unknown> | null>(null);
  const [activeScopeId, setActiveScopeId] = useState<string | null>(null);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [budgetPreviewOpen, setBudgetPreviewOpen] = useState(false);
  const [priceSearchOpen, setPriceSearchOpen] = useState(false);
  const [priceSearchActivity, setPriceSearchActivity] = useState<{
    id: string; name: string; materials: { name: string; unit: string; quantity: number }[];
  } | null>(null);
  const [priceSearchExisting, setPriceSearchExisting] = useState<any[] | undefined>(undefined);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importingBudget, setImportingBudget] = useState(false);
  const [importScopeOverrides, setImportScopeOverrides] = useState<Record<string, string>>({});
  const { callAction, loading: aiLoading } = useProjectAI();
  const [aiEstimates, setAiEstimates] = useState<any[] | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const revisions = useMemo(() => {
    const revNums = [...new Set(quotes.map((q) => q.revision_number))].sort((a, b) => (a ?? 0) - (b ?? 0));
    return revNums.length > 0 ? revNums : [1];
  }, [quotes]);

  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const currentRev = selectedRevision ?? (revisions[revisions.length - 1] || 1);

  const currentQuotes = useMemo(() => {
    return quotes.filter((q) => q.revision_number === currentRev);
  }, [quotes, currentRev]);

  const contractedScopeItems = scopeItems.filter(s => s.scope_type === 'contratado');

  // Derive discipline for each quote: from scope_item → or by matching activity name
  const quotesWithDiscipline = useMemo(() => {
    return currentQuotes.map(q => {
      let discipline: string | null = null;
      if (q.scope_item_id) {
        discipline = scopeItems.find(s => s.id === q.scope_item_id)?.discipline || null;
      }
      if (!discipline) {
        const matchingActivity = activities.find(
          a => a.name.toLowerCase().trim() === (q.services_description || "").toLowerCase().trim()
        );
        discipline = (matchingActivity as any)?.discipline || null;
      }
      return { ...q, _discipline: discipline };
    });
  }, [currentQuotes, scopeItems, activities]);

  // Sections = unique disciplines from activities (mirrors Escopo grouping)
  const disciplineSections = useMemo(() => {
    const fromActivities = [...new Set(
      activities.map(a => (a as any).discipline as string | null).filter(Boolean)
    )] as string[];
    const fromQuotes = [...new Set(
      quotesWithDiscipline.map(q => q._discipline).filter(Boolean)
    )] as string[];
    return [...new Set([...fromActivities, ...fromQuotes])].sort((a, b) => a.localeCompare(b));
  }, [activities, quotesWithDiscipline]);

  /* Opções do campo "Disciplina" ao editar uma cotação. A aba agrupa por
     disciplina vinda das ATIVIDADES do escopo, mas o vínculo no banco só
     existe via scope_item_id — então uma disciplina que só existe como
     atividade entra aqui com scopeItemId null e o item é criado na hora do
     salvamento. Antes só entravam itens de escopo "contratado", que nesta
     obra estão vazios: por isso o campo nem aparecia e "vincular" era
     impossível. */
  const disciplineOptions = useMemo(() => {
    const byDiscipline = new Map<string, string | null>();
    for (const disc of disciplineSections) byDiscipline.set(disc, null);
    for (const s of scopeItems) {
      if (!s.discipline) continue;
      const existing = [...byDiscipline.keys()].find(
        d => d.toLowerCase() === s.discipline!.toLowerCase()
      );
      byDiscipline.set(existing ?? s.discipline, s.id);
    }
    return [...byDiscipline.entries()]
      .map(([discipline, scopeItemId]) => ({ discipline, scopeItemId }))
      .sort((a, b) => a.discipline.localeCompare(b.discipline));
  }, [disciplineSections, scopeItems]);

  // Group quotes by derived discipline
  const groupedQuotes = useMemo(() => {
    const groups: Record<string, typeof quotesWithDiscipline> = {};
    for (const q of quotesWithDiscipline) {
      const key = q._discipline || "sem_disciplina";
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    }
    return groups;
  }, [quotesWithDiscipline]);

  /* Soma TODOS os fornecedores aprovados de cada grupo, não só o primeiro.
     Uma disciplina pode ser dividida entre fornecedores (e "Sem Disciplina"
     junta fornecedores que não competem entre si — marmoraria, marcenaria,
     construtora), então pegar só um zerava o resto da conta. */
  const totals = useMemo(() => {
    let total = 0;
    const byDiscipline: Record<string, number> = {};
    for (const [disc, qs] of Object.entries(groupedQuotes)) {
      const subtotal = qs
        .filter(q => q.status === "aprovado")
        .reduce((sum, q) => sum + (q.value || 0) + (q.material_estimate || 0), 0);
      byDiscipline[disc] = subtotal;
      total += subtotal;
    }
    return { total, byDiscipline };
  }, [groupedQuotes]);

  const handleAddQuote = (scopeItemId: string | null) => {
    setActiveScopeId(scopeItemId);
    setEditingQuote(null);
    setFormOpen(true);
  };

  const handleEditQuote = (quote: Record<string, unknown>) => {
    setActiveScopeId(quote.scope_item_id as string);
    setEditingQuote(quote);
    setFormOpen(true);
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    const { _link_discipline: linkDiscipline, ...quoteData } = data as
      { _link_discipline?: string | null } & Record<string, unknown>;

    // Disciplina escolhida que ainda não tem item de escopo: cria o item
    // (é o único lugar onde budget_quotes guarda o vínculo) e usa o id dele.
    if (linkDiscipline && user) {
      const { data: created, error } = await supabase
        .from("scope_items")
        .insert({
          project_id: projectId,
          user_id: user.id,
          discipline: linkDiscipline,
          scope_type: "contratado",
        } as never)
        .select("id")
        .single();
      if (error) {
        toast({ title: "Erro ao vincular disciplina", description: error.message, variant: "destructive" });
        return;
      }
      quoteData.scope_item_id = created.id;
      queryClient.invalidateQueries({ queryKey: ["scope_items", projectId] });
    }

    if (editingQuote) {
      update.mutate({ id: editingQuote.id as string, ...quoteData });
    } else {
      create.mutate(quoteData as Parameters<typeof create.mutate>[0]);
    }
    setEditingQuote(null);
  };

  const handleApprove = async (quoteId: string, scopeItemId: string | null) => {
    const thisQuote = quotesWithDiscipline.find(q => q.id === quoteId);
    const thisDiscipline = thisQuote?._discipline;
    /* Só desaprova os concorrentes quando existe disciplina: em "Sem
       Disciplina" caem fornecedores de serviços diferentes, e aprovar um
       derrubava a aprovação dos outros (todos tinham _discipline null). */
    if (thisDiscipline) {
      const siblings = quotesWithDiscipline.filter(
        (q) => q._discipline === thisDiscipline && q.id !== quoteId
      );
      for (const s of siblings) {
        if (s.status === "aprovado") {
          update.mutate({ id: s.id, status: "cotado" });
        }
      }
    }
    update.mutate({ id: quoteId, status: "aprovado" });

    // Generate payment installments automatically
    const quote = currentQuotes.find(q => q.id === quoteId);
    if (quote && user) {
      const totalValue = (quote.value || 0) + (quote.material_estimate || 0);
      if (totalValue > 0) {
        const installments = parsePaymentTerms(quote.payment_terms, totalValue);
        const today = new Date();
        const paymentInserts = installments.map((inst, idx) => {
          const dueDate = new Date(today);
          dueDate.setDate(dueDate.getDate() + (idx * 30));
          return {
            user_id: user.id,
            project_id: projectId,
            value: inst.value,
            description: `${scopeItems.find(s => s.id === scopeItemId)?.discipline || "Serviço"} - Parcela ${idx + 1}/${installments.length}`,
            supplier_name: quote.supplier_name,
            budget_quote_id: quoteId,
            due_date: dueDate.toISOString().split("T")[0],
            installment_number: idx + 1,
            total_installments: installments.length,
            status: "pendente" as const,
          };
        });

        const { error } = await supabase.from("payments").insert(paymentInserts);
        if (error) {
          toast({ title: "Aviso", description: "Cotação aprovada, mas erro ao gerar parcelas: " + error.message, variant: "destructive" });
        } else {
          queryClient.invalidateQueries({ queryKey: ["project_payments", projectId] });
          toast({ title: `${installments.length} parcela(s) gerada(s) automaticamente` });
        }
      }
    }
  };

  const activeScopeName = scopeItems.find((s) => s.id === activeScopeId)?.discipline;

  // Import from scope logic
  const activitiesToImport = useMemo(() => {
    const existingDescs = new Set(quotes.map(q => q.services_description?.toLowerCase().trim()));
    return activities.filter(a => !existingDescs.has(a.name.toLowerCase().trim()));
  }, [activities, quotes]);

  const handleImportFromScope = async () => {
    if (!user || activitiesToImport.length === 0) return;
    setImportingBudget(true);
    try {
      const activityUpdates: { id: string; discipline: string }[] = [];
      const inserts = activitiesToImport.map(a => {
        const overrideScopeId = importScopeOverrides[a.id];
        let scopeItemId: string | null = null;
        if (overrideScopeId) {
          scopeItemId = overrideScopeId;
          const overrideDiscipline = contractedScopeItems.find(s => s.id === overrideScopeId)?.discipline;
          if (overrideDiscipline && !(a as any).discipline) {
            activityUpdates.push({ id: a.id, discipline: overrideDiscipline });
          }
        } else {
          const match = contractedScopeItems.find(
            s => s.discipline?.toLowerCase() === (a as any).discipline?.toLowerCase()
          );
          scopeItemId = match?.id ?? null;
        }
        return {
          project_id: projectId, user_id: user.id,
          services_description: a.name, value: 0,
          material_estimate: (a as any).area_m2 ?? 0,
          status: "pendente" as const, revision_number: currentRev,
          supplier_name: null, scope_item_id: scopeItemId,
        };
      });
      const { error } = await supabase.from("budget_quotes").insert(inserts);
      if (error) throw error;
      // Persist discipline back to activities that had overrides
      for (const upd of activityUpdates) {
        await supabase.from("project_activities").update({ discipline: upd.discipline }).eq("id", upd.id);
      }
      if (activityUpdates.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["project_activities", projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ["budget_quotes", projectId] });
      toast({ title: `${inserts.length} itens importados do escopo` });
      setImportDialogOpen(false);
      setImportScopeOverrides({});
    } catch (e: any) {
      toast({ title: "Erro ao importar", description: e.message, variant: "destructive" });
    } finally {
      setImportingBudget(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="cotacoes">
        <TabsList>
          <TabsTrigger value="cotacoes">Cotações por Disciplina</TabsTrigger>
          <TabsTrigger value="compras">Lista de Compras</TabsTrigger>
        </TabsList>

        <TabsContent value="cotacoes" className="space-y-6 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-display">Orçamentos (Escopo Contratado)</h3>
              <p className="text-sm text-muted-foreground">Compare cotações e aprove fornecedores para cada disciplina</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(currentRev)} onValueChange={(v) => setSelectedRevision(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {revisions.map((r) => (
                    <SelectItem key={r} value={String(r)}>Rev {r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => { setImportScopeOverrides({}); setImportDialogOpen(true); }} disabled={activities.length === 0}>
                <FileDown className="h-4 w-4 mr-1" /> Importar do Escopo
              </Button>
              <Button variant="outline" size="sm" disabled={aiLoading || activities.length === 0} onClick={async () => {
                const result = await callAction(projectId, "estimate_costs", { activities: activities.map(a => ({ name: a.name, area_m2: a.area_m2, discipline: a.discipline })) });
                if (result?.estimates) { setAiEstimates(result.estimates); setAiModalOpen(true); }
              }}>
                {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Estimar custos com IA
              </Button>
              <Button variant="outline" size="sm" onClick={() => createRevision.mutate(currentRev)} disabled={createRevision.isPending}>
                <RefreshCw className="h-4 w-4 mr-1" /> Nova Revisão
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShoppingListOpen(true)}>
                <ShoppingCart className="h-4 w-4 mr-1" /> Lista de Compras
              </Button>
              {/* Mariana (vídeo 14): "não consigo colocar nada manualmente,
                  só aceita o que vem de IA". A toolbar tinha "Importar do
                  Escopo" e "Estimar com IA", mas faltava criar cotação
                  avulsa direto, sem precisar de item de escopo.
                  budget_quotes.scope_item_id já era nullable. */}
              <Button size="sm" variant="outline" onClick={() => handleAddQuote(null)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Cotação
              </Button>
              <Button size="sm" onClick={() => setBudgetPreviewOpen(true)}>
                <Calculator className="h-4 w-4 mr-1" /> Gerar Prévia de Orçamento
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : disciplineSections.length === 0 && (groupedQuotes["sem_disciplina"] ?? []).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              Cadastre atividades com disciplina na aba "Escopo" para começar a adicionar cotações.
            </div>
          ) : (
            <>
              {disciplineSections.map((disc) => {
                const discQuotes = groupedQuotes[disc] || [];
                const subtotal = totals.byDiscipline[disc] || 0;
                const approvedQuote = discQuotes.find(q => q.status === 'aprovado');
                const matchingScopeItem = contractedScopeItems.find(
                  s => s.discipline?.toLowerCase() === disc.toLowerCase()
                );

                return (
                  <Card key={disc} className={approvedQuote ? "border-green-500/50 bg-green-50/10" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base text-display">{disc}</CardTitle>
                          {approvedQuote && <Badge variant="default" className="bg-green-600 text-[10px]">Fornecedor Definido</Badge>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-primary">{formatCurrency(subtotal)}</span>
                          <Button size="sm" variant="outline" onClick={() => handleAddQuote(matchingScopeItem?.id ?? null)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Cotação
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {discQuotes.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                          Nenhuma cotação. Clique em "Cotação" para adicionar.
                        </div>
                      ) : (
                        <BudgetQuoteTable
                          quotes={discQuotes as unknown as Record<string, unknown>[]}
                          onEdit={handleEditQuote}
                          onDelete={(id) => remove.mutate(id)}
                          onApprove={(q) => handleApprove(q.id as string, (q.scope_item_id as string) ?? null)}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Quotes that couldn't be matched to any activity discipline */}
              {(groupedQuotes["sem_disciplina"] ?? []).length > 0 && (
                <Card className="border-amber-500/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base text-display">Sem Disciplina</CardTitle>
                        <Badge variant="secondary" className="text-[10px]">Use Editar para vincular</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(totals.byDiscipline["sem_disciplina"] || 0)}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => handleAddQuote(null)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Cotação
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BudgetQuoteTable
                      quotes={(groupedQuotes["sem_disciplina"] ?? []) as unknown as Record<string, unknown>[]}
                      onEdit={handleEditQuote}
                      onDelete={(id) => remove.mutate(id)}
                      onApprove={(q) => handleApprove(q.id as string, (q.scope_item_id as string) ?? null)}
                    />
                  </CardContent>
                </Card>
              )}

              <Card className="bg-primary/5 border-primary/20 sticky bottom-4 shadow-lg">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-semibold text-display">Total Geral Aprovado</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Soma dos fornecedores aprovados + estimativa de material por disciplina
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(totals.total)}</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <BudgetQuoteForm
            open={formOpen}
            onOpenChange={setFormOpen}
            onSubmit={handleSubmit}
            initialData={editingQuote}
            scopeItemId={activeScopeId || undefined}
            scopeItemName={activeScopeName}
            revisionNumber={currentRev}
            isLoading={create.isPending || update.isPending}
            disciplineOptions={disciplineOptions}
          />

          <ShoppingListDialog
            open={shoppingListOpen}
            onOpenChange={setShoppingListOpen}
            projectId={projectId}
            projectName={projectName}
          />

          <BudgetPreviewDialog
            open={budgetPreviewOpen}
            onOpenChange={setBudgetPreviewOpen}
            projectId={projectId}
            projectName={projectName}
          />

          {/* Pesquisa de Preços por Atividade */}
          {activities.filter((a) => a.area_m2 && a.area_m2 > 0).length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-display">Pesquisa de Preços por Atividade</CardTitle>
                <p className="text-xs text-muted-foreground">Pesquise preços de materiais em BH com base nas atividades cadastradas</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activities.filter((a) => a.area_m2 && a.area_m2 > 0).map((activity) => {
                    const matchingIndices = indices.filter(
                      (idx) => activity.name.toLowerCase().includes(idx.activity_type.toLowerCase())
                    );
                    const materialsForActivity = matchingIndices.map((idx) => ({
                      name: idx.material_name,
                      unit: idx.unit,
                      quantity: Math.ceil(idx.index_per_m2 * (activity.area_m2 || 0)),
                    }));
                    const recentResearch = getRecentForActivity(activity.id);
                    const hasRecent = recentResearch.length > 0;

                    if (materialsForActivity.length === 0) return null;

                    return (
                      <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{activity.name}</p>
                          <p className="text-xs text-muted-foreground">{activity.area_m2} m² • {materialsForActivity.length} material(is)</p>
                        </div>
                        <div className="flex gap-1">
                          {hasRecent && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPriceSearchActivity({ id: activity.id, name: activity.name, materials: materialsForActivity });
                                setPriceSearchExisting(recentResearch);
                                setPriceSearchOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Ver Pesquisa
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPriceSearchActivity({ id: activity.id, name: activity.name, materials: materialsForActivity });
                              setPriceSearchExisting(undefined);
                              setPriceSearchOpen(true);
                            }}
                          >
                            <Search className="h-3.5 w-3.5 mr-1" /> {hasRecent ? "Nova Pesquisa" : "Pesquisar Preços"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {priceSearchActivity && (
            <PriceSearchDialog
              open={priceSearchOpen}
              onOpenChange={setPriceSearchOpen}
              activityName={priceSearchActivity.name}
              activityId={priceSearchActivity.id}
              projectId={projectId}
              materials={priceSearchActivity.materials}
              existingResearch={priceSearchExisting}
            />
          )}
        </TabsContent>

        <TabsContent value="compras" className="mt-4">
          <ProjectPurchasesTab projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* AI Estimates Modal */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Estimativa de Custos com IA</DialogTitle>
            <DialogDescription>Valores estimados para BH em 2025. Aplique como valor médio nas cotações.</DialogDescription>
          </DialogHeader>
          {aiEstimates && (
            <div className="max-h-80 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Atividade</TableHead><TableHead className="text-right">Mín</TableHead><TableHead className="text-right">Máx</TableHead><TableHead className="text-right">Média</TableHead><TableHead>Notas</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {aiEstimates.map((e: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{e.activity_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(e.estimated_cost_min)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(e.estimated_cost_max)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency((e.estimated_cost_min + e.estimated_cost_max) / 2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiModalOpen(false)}>Fechar</Button>
            <Button onClick={async () => {
              if (!user || !aiEstimates) return;
              const inserts = aiEstimates.map((e: any) => {
                // Try to match AI estimate to activity → discipline → contracted scope item
                const matchingActivity = activities.find(a =>
                  a.name.toLowerCase() === e.activity_name.toLowerCase()
                );
                const matchingScopeItem = matchingActivity?.discipline
                  ? contractedScopeItems.find(s =>
                      s.discipline?.toLowerCase() === matchingActivity.discipline?.toLowerCase()
                    )
                  : undefined;
                return {
                  project_id: projectId, user_id: user.id,
                  services_description: e.activity_name,
                  value: Math.round((e.estimated_cost_min + e.estimated_cost_max) / 2),
                  status: "pendente" as const, revision_number: currentRev,
                  scope_item_id: matchingScopeItem?.id ?? null,
                };
              });
              const { error } = await supabase.from("budget_quotes").insert(inserts);
              if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
              queryClient.invalidateQueries({ queryKey: ["budget_quotes", projectId] });
              toast({ title: `${inserts.length} itens criados com valores estimados pela IA` });
              setAiModalOpen(false);
            }}>
              Aplicar como cotações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Scope Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar do Escopo</DialogTitle>
            <DialogDescription>
              {activitiesToImport.length > 0
                ? `${activitiesToImport.length} atividades encontradas. Confirme a disciplina de cada uma.`
                : "Todas as atividades já foram importadas."}
            </DialogDescription>
          </DialogHeader>
          {activitiesToImport.length > 0 && (
            <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
              {activitiesToImport.map(a => {
                const overrideScopeId = importScopeOverrides[a.id];
                const autoMatch = (a as any).discipline
                  ? contractedScopeItems.find(s => s.discipline?.toLowerCase() === (a as any).discipline?.toLowerCase())
                  : null;
                const effectiveScopeItem = overrideScopeId
                  ? contractedScopeItems.find(s => s.id === overrideScopeId)
                  : autoMatch;
                const hasMatch = !!effectiveScopeItem;

                return (
                  <div key={a.id} className={`px-3 py-2 text-sm ${!hasMatch ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium block truncate">{a.name}</span>
                        {(a as any).area_m2 && (
                          <span className="text-xs text-muted-foreground">{(a as any).area_m2} m²</span>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-44">
                        {hasMatch && !overrideScopeId ? (
                          <span className="text-xs text-green-600 font-medium">✓ {effectiveScopeItem!.discipline}</span>
                        ) : (
                          <Select
                            value={overrideScopeId || ""}
                            onValueChange={(val) => setImportScopeOverrides(prev => ({ ...prev, [a.id]: val }))}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder={hasMatch ? effectiveScopeItem!.discipline! : "Atribuir disciplina..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {contractedScopeItems.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.discipline}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportFromScope} disabled={importingBudget || activitiesToImport.length === 0}>
              {importingBudget ? "Importando..." : `Importar ${activitiesToImport.length} itens`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
