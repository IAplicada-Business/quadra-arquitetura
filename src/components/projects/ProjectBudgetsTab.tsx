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
import {
  disciplineTotals,
  groupBySupplier,
  normalizeKey,
  quoteDiscipline,
  quoteTotal,
  type ImportPlan,
} from "@/lib/budgetImport";
import {
  approveSupplierInDiscipline,
  buildImportPlan,
  fetchFreshImportData,
  invalidateProjectBudgetData,
  runBudgetImport,
  type FreshImportData,
} from "@/hooks/useBudgetImport";
import { InfoHint } from "@/components/visual/InfoHint";

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
  /** Disciplina escolhida no diálogo para atividades que ainda não têm. */
  const [importDisciplineOverrides, setImportDisciplineOverrides] = useState<Record<string, string>>({});
  const [importData, setImportData] = useState<FreshImportData | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [approving, setApproving] = useState(false);
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

  /* Nome canônico de cada disciplina, sem diferenciar acento/maiúscula
     ("Elétrica" e "eletrica" são a mesma seção). Vale o primeiro nome
     visto, começando pelas atividades do escopo. */
  const canonicalDiscipline = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of activities) {
      const d = a.discipline?.trim();
      if (d && !map.has(normalizeKey(d))) map.set(normalizeKey(d), d);
    }
    return map;
  }, [activities]);

  // Disciplina de cada cotação: vínculo gravado → item de escopo → atividade → nome.
  const quotesWithDiscipline = useMemo(() => {
    const ctx = { scopeItems, activities };
    return currentQuotes.map(q => {
      const raw = quoteDiscipline(q, ctx);
      const discipline = raw ? canonicalDiscipline.get(normalizeKey(raw)) ?? raw : null;
      return { ...q, _discipline: discipline };
    });
  }, [currentQuotes, scopeItems, activities, canonicalDiscipline]);

  // Sections = unique disciplines from activities (mirrors Escopo grouping)
  const disciplineSections = useMemo(() => {
    const byKey = new Map<string, string>(canonicalDiscipline);
    for (const q of quotesWithDiscipline) {
      if (q._discipline && !byKey.has(normalizeKey(q._discipline))) byKey.set(normalizeKey(q._discipline), q._discipline);
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [canonicalDiscipline, quotesWithDiscipline]);

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

  /* Aprovado = soma de tudo que foi aprovado na disciplina (pode ser mais
     de um fornecedor). Estimado = o aprovado ou, enquanto ninguém foi
     aprovado, o fornecedor mais barato com valor — a importação conta como
     um "fornecedor a definir". Antes só existia o aprovado, então logo
     depois de importar tudo aparecia como R$ 0. "Sem Disciplina" junta
     serviços que não competem: soma tudo. */
  const totals = useMemo(() => {
    let total = 0;
    let estimated = 0;
    const byDiscipline: Record<string, number> = {};
    const estimatedByDiscipline: Record<string, number> = {};
    for (const [disc, qs] of Object.entries(groupedQuotes)) {
      const t = disc === "sem_disciplina"
        ? {
            approved: qs.filter(q => q.status === "aprovado").reduce((s, q) => s + quoteTotal(q), 0),
            estimated: qs.filter(q => q.status !== "rejeitado").reduce((s, q) => s + quoteTotal(q), 0),
          }
        : disciplineTotals(qs);
      byDiscipline[disc] = t.approved;
      estimatedByDiscipline[disc] = t.estimated;
      total += t.approved;
      estimated += t.estimated;
    }
    return { total, estimated, byDiscipline, estimatedByDiscipline };
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

  /* Aprovar vale para o FORNECEDOR dentro da disciplina: aprova todas as
     cotações dele ali, devolve as dos outros fornecedores para "cotado" e
     leva o fornecedor para o cronograma do portal. Antes aprovar um item
     desaprovava os outros itens do MESMO fornecedor importados em linhas
     separadas, e o total ficava com um item só. */
  const handleApprove = async (quoteId: string) => {
    if (!user || approving) return;
    setApproving(true);
    try {
      const thisQuote = quotesWithDiscipline.find(q => q.id === quoteId);
      const { newlyApproved } = await approveSupplierInDiscipline({ quotes: quotesWithDiscipline, quoteId, activities });

      // Parcelas: uma programação para o que acabou de ser aprovado do fornecedor.
      const totalValue = newlyApproved.reduce((s, q) => s + quoteTotal(q), 0);
      if (thisQuote && totalValue > 0) {
        const installments = parsePaymentTerms(thisQuote.payment_terms, totalValue);
        const today = new Date();
        const label = [thisQuote._discipline || "Serviço", thisQuote.suppliers?.name || thisQuote.supplier_name].filter(Boolean).join(" — ");
        const paymentInserts = installments.map((inst, idx) => {
          const dueDate = new Date(today);
          dueDate.setDate(dueDate.getDate() + (idx * 30));
          return {
            user_id: user.id,
            project_id: projectId,
            value: inst.value,
            description: `${label} - Parcela ${idx + 1}/${installments.length}`,
            supplier_name: thisQuote.suppliers?.name || thisQuote.supplier_name,
            budget_quote_id: quoteId,
            due_date: dueDate.toISOString().split("T")[0],
            installment_number: idx + 1,
            total_installments: installments.length,
            status: "pendente" as const,
          };
        });
        const { error } = await supabase.from("payments").insert(paymentInserts);
        if (error) {
          toast({ title: "Aviso", description: "Fornecedor aprovado, mas erro ao gerar parcelas: " + error.message, variant: "destructive" });
        } else {
          toast({ title: `Fornecedor aprovado · ${installments.length} parcela(s) gerada(s)` });
        }
      } else {
        toast({ title: "Fornecedor aprovado" });
      }
    } catch (e) {
      toast({ title: "Erro ao aprovar", description: (e as Error).message, variant: "destructive" });
    } finally {
      await invalidateProjectBudgetData(queryClient, projectId);
      setApproving(false);
    }
  };

  const activeScopeName = scopeItems.find((s) => s.id === activeScopeId)?.discipline;

  /* Importar / atualizar do Escopo. Ao abrir, relê tudo direto do banco
     (limpa o cache antes de reprocessar) e mostra o que vai acontecer com
     cada atividade: criar estimativa, atualizar valor, sem mudança ou
     aprovada (preservada). */
  const openImportDialog = async () => {
    setImportDisciplineOverrides({});
    setImportData(null);
    setImportDialogOpen(true);
    setImportLoading(true);
    try {
      setImportData(await fetchFreshImportData(projectId));
    } catch (e) {
      toast({ title: "Erro ao ler o escopo", description: (e as Error).message, variant: "destructive" });
      setImportDialogOpen(false);
    } finally {
      setImportLoading(false);
    }
  };

  const importPlan: ImportPlan | null = useMemo(
    () => (importData ? buildImportPlan(importData, currentRev, importDisciplineOverrides) : null),
    [importData, currentRev, importDisciplineOverrides],
  );
  const importChanges = importPlan ? importPlan.inserts.length + importPlan.updates.length + importPlan.activityDisciplines.length : 0;

  const handleImportFromScope = async () => {
    if (!user || !importPlan || importChanges === 0) return;
    setImportingBudget(true);
    try {
      const r = await runBudgetImport({
        projectId,
        userId: user.id,
        revision: currentRev,
        overrides: importDisciplineOverrides,
        scopeItems,
      });
      const parts = [
        r.created > 0 ? `${r.created} criadas` : null,
        r.updated > 0 ? `${r.updated} atualizadas` : null,
        r.preserved > 0 ? `${r.preserved} aprovadas preservadas` : null,
      ].filter(Boolean);
      toast({ title: "Orçamento sincronizado com o escopo", description: parts.join(" · ") || "Nada a mudar." });
      setImportDialogOpen(false);
      setImportDisciplineOverrides({});
    } catch (e) {
      toast({ title: "Erro ao importar", description: (e as Error).message, variant: "destructive" });
    } finally {
      await invalidateProjectBudgetData(queryClient, projectId);
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
              <h3 className="text-lg font-semibold text-display flex items-center gap-1.5">
                Orçamentos (Escopo Contratado)
                <InfoHint>Compare cotações e aprove fornecedores para cada disciplina.</InfoHint>
              </h3>
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
              <Button variant="outline" size="sm" onClick={openImportDialog} disabled={activities.length === 0}>
                <FileDown className="h-4 w-4 mr-1" /> Importar / atualizar do Escopo
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
              {[...disciplineSections, ...((groupedQuotes["sem_disciplina"] ?? []).length > 0 ? ["sem_disciplina"] : [])].map((disc) => {
                const isUnassigned = disc === "sem_disciplina";
                const discQuotes = groupedQuotes[disc] || [];
                const approvedTotal = totals.byDiscipline[disc] || 0;
                const estimatedTotal = totals.estimatedByDiscipline[disc] || 0;
                const hasApproved = discQuotes.some(q => q.status === "aprovado");
                const supplierGroups = groupBySupplier(discQuotes);
                const matchingScopeItem = isUnassigned
                  ? undefined
                  : contractedScopeItems.find(s => normalizeKey(s.discipline) === normalizeKey(disc));

                return (
                  <Card key={disc} className={isUnassigned ? "border-amber-500/30" : hasApproved ? "border-green-500/50 bg-green-50/10" : ""} data-testid={`budget-discipline-${disc}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base text-display">{isUnassigned ? "Sem Disciplina" : disc}</CardTitle>
                          {isUnassigned ? (
                            <Badge variant="secondary" className="text-[10px]">Use Editar para vincular</Badge>
                          ) : hasApproved ? (
                            <Badge variant="default" className="bg-green-600 text-[10px]">Fornecedor Definido</Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-sm font-semibold text-primary" data-testid={`budget-discipline-total-${disc}`}>
                              {formatCurrency(hasApproved ? approvedTotal : estimatedTotal)}
                            </span>
                            <p className="text-[10px] text-muted-foreground">{hasApproved ? "aprovado" : estimatedTotal > 0 ? "estimado" : "sem valor ainda"}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleAddQuote(matchingScopeItem?.id ?? null)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Cotação
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {discQuotes.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                          Nenhuma cotação. Clique em "Cotação" para adicionar.
                        </div>
                      ) : (
                        supplierGroups.map((group) => (
                          <div key={group.key} className="space-y-2" data-testid={`supplier-group-${group.key}`}>
                            <div className="flex items-center justify-between gap-2 border-b pb-1">
                              <p className="text-sm font-medium">
                                {group.label}
                                <span className="text-xs text-muted-foreground font-normal"> · {group.quotes.length} {group.quotes.length === 1 ? "item" : "itens"}</span>
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold tabular-nums">{formatCurrency(group.subtotal)}</span>
                                {!isUnassigned && !group.allApproved && group.quotes.length > 1 && (
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={approving} onClick={() => handleApprove(group.quotes[0].id)}>
                                    Aprovar fornecedor
                                  </Button>
                                )}
                              </div>
                            </div>
                            {/* Agrupado por fornecedor (deste PR) e em linhas que
                                abrem no clique (do main). O BudgetQuoteCard foi
                                removido no main: era ele que empilhava prazo,
                                pagamento e três botões em cada cotação. */}
                            <BudgetQuoteTable
                              quotes={group.quotes as unknown as Record<string, unknown>[]}
                              onEdit={handleEditQuote}
                              onDelete={(id) => remove.mutate(id)}
                              onApprove={(q) => handleApprove(q.id as string)}
                            />
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              <Card className="bg-primary/5 border-primary/20 sticky bottom-4 shadow-lg">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <span className="text-lg font-semibold text-display flex items-center gap-1.5">
                        Total Geral Aprovado
                        <InfoHint>Soma dos fornecedores aprovados (serviço + material) em todas as disciplinas.</InfoHint>
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-sm font-semibold text-muted-foreground tabular-nums" data-testid="budget-total-estimated">{formatCurrency(totals.estimated)}</span>
                        <p className="text-[10px] text-muted-foreground">estimado (aprovado ou menor cotação)</p>
                      </div>
                      <span className="text-2xl font-bold text-primary" data-testid="budget-total-approved">{formatCurrency(totals.total)}</span>
                    </div>
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
            revisionNumber={currentRev}
          />

          {/* Pesquisa de Preços por Atividade */}
          {activities.filter((a) => a.area_m2 && a.area_m2 > 0).length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-display flex items-center gap-1.5">
                  Pesquisa de Preços por Atividade
                  <InfoHint>Pesquise preços de materiais em BH com base nas atividades cadastradas.</InfoHint>
                </CardTitle>
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
                // Liga a estimativa à atividade (sem diferenciar acento/maiúscula) → disciplina → item de escopo
                const matchingActivity = activities.find(a => normalizeKey(a.name) === normalizeKey(e.activity_name));
                const matchingScopeItem = matchingActivity?.discipline
                  ? contractedScopeItems.find(s => normalizeKey(s.discipline) === normalizeKey(matchingActivity.discipline))
                  : undefined;
                const avg = Math.round((Number(e.estimated_cost_min) + Number(e.estimated_cost_max)) / 2);
                return {
                  project_id: projectId, user_id: user.id,
                  services_description: matchingActivity?.name ?? e.activity_name,
                  activity_id: matchingActivity?.id ?? null,
                  discipline: matchingActivity?.discipline ?? null,
                  supplier_name: "Estimativa IA",
                  value: Number.isFinite(avg) && avg > 0 ? avg : null,
                  status: "cotado" as const, revision_number: currentRev, revision: `Rev ${currentRev}`,
                  scope_item_id: matchingScopeItem?.id ?? null,
                };
              });
              const { error } = await supabase.from("budget_quotes").insert(inserts);
              if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
              await invalidateProjectBudgetData(queryClient, projectId);
              toast({ title: `${inserts.length} itens criados com valores estimados pela IA` });
              setAiModalOpen(false);
            }}>
              Aplicar como cotações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Importar / atualizar do Escopo */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar / atualizar do Escopo</DialogTitle>
            <DialogDescription>
              Cria a estimativa de cada atividade (material + mão de obra) na Rev {currentRev} e atualiza as que mudaram.
              Cotações aprovadas e de fornecedores não são alteradas.
            </DialogDescription>
          </DialogHeader>
          {importLoading || !importPlan ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Lendo escopo e orçamento atualizados…
            </div>
          ) : importPlan.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma atividade no escopo.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto border rounded-lg divide-y" data-testid="import-plan">
              {importPlan.lines.map((line) => {
                const needsDiscipline = !line.activity.discipline?.trim();
                const actionLabel = {
                  criar: "Nova estimativa",
                  atualizar: "Atualiza valor",
                  sem_mudanca: "Sem mudança",
                  aprovada: "Aprovada, preservada",
                }[line.action];
                const actionClass = {
                  criar: "bg-primary/10 text-primary border-primary/30",
                  atualizar: "bg-warning/15 text-warning border-warning/30",
                  sem_mudanca: "text-muted-foreground",
                  aprovada: "bg-success/15 text-success border-success/30",
                }[line.action];
                return (
                  <div key={line.activity.id} className={`px-3 py-2 text-sm flex items-center justify-between gap-3 ${needsDiscipline && !line.discipline ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`} data-testid={`import-line-${line.activity.id}`}>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium block truncate">{line.activity.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {line.activity.area_m2 ? `${line.activity.area_m2} m² · ` : ""}
                        {line.cost.total > 0
                          ? `${formatCurrency(line.cost.materialCost)} material + ${formatCurrency(line.cost.laborCost)} mão de obra`
                          : "sem custo de referência (preencha na cotação)"}
                      </span>
                    </div>
                    <div className="w-40 shrink-0">
                      {needsDiscipline ? (
                        <Select
                          value={importDisciplineOverrides[line.activity.id] || ""}
                          onValueChange={(val) => setImportDisciplineOverrides(prev => ({ ...prev, [line.activity.id]: val }))}
                        >
                          <SelectTrigger className="h-7 text-xs" aria-label={`Disciplina de ${line.activity.name}`}>
                            <SelectValue placeholder="Atribuir disciplina..." />
                          </SelectTrigger>
                          <SelectContent>
                            {disciplineOptions.map(o => (
                              <SelectItem key={o.discipline} value={o.discipline}>{o.discipline}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground truncate block">{line.discipline}</span>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${actionClass}`}>{actionLabel}</Badge>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportFromScope} disabled={importingBudget || importLoading || importChanges === 0}>
              {importingBudget ? "Importando..." : importChanges === 0 ? "Nada a atualizar" : `Aplicar ${importChanges} ${importChanges === 1 ? "mudança" : "mudanças"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
