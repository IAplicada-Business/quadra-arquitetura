import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Download, ExternalLink, ShoppingCart, Package, Filter, Copy, RefreshCw, RotateCcw, Settings, FileDown, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaterialTracking } from "@/hooks/useMaterialTracking";
import { useProjectPurchases } from "@/hooks/useProjectPurchases";
import { useScopeItems } from "@/hooks/useScopeItems";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { useProjectDisciplines } from "@/hooks/useProjectDisciplines";
import { MaterialTrackingForm } from "./MaterialTrackingForm";
import { ProjectMaterialsInventory } from "./ProjectMaterialsInventory";
import { ProjectPurchasesTab } from "./ProjectPurchasesTab";
import { SupplierPurchaseList } from "./SupplierPurchaseList";
import { ShoppingListDialog } from "./ShoppingListDialog";
import { MaterialCalcByActivitiesDialog } from "./MaterialCalcByActivitiesDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDisciplineColor } from "@/lib/disciplineColors";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useProjectAI } from "@/hooks/useProjectAI";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoHint } from "@/components/visual/InfoHint";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function ProjectMaterialsTab({ projectId, projectName = "" }: { projectId: string; projectName?: string }) {
  const tracking = useMaterialTracking(projectId);
  const purchases = useProjectPurchases(projectId);
  const { items: scopeItems } = useScopeItems(projectId);
  const { activities } = useProjectActivities(projectId);
  const [trackFormOpen, setTrackFormOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Record<string, unknown> | null>(null);
  const [supplierListOpen, setSupplierListOpen] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const navigate = useNavigate();
  const { callAction, loading: aiLoading } = useProjectAI();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [aiMaterials, setAiMaterials] = useState<any[] | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedAiMaterials, setSelectedAiMaterials] = useState<Set<number>>(new Set());

  // Query schedule_tasks with materials
  const { data: taskMaterials = [] } = useQuery({
    queryKey: ["task-materials", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("schedule_tasks")
        .select("id, task_name, materials, discipline, environment")
        .eq("project_id", projectId)
        .not("materials", "is", null);
      return (data || []).filter((t: any) => {
        const mats = t.materials as any[];
        return Array.isArray(mats) && mats.length > 0 && mats.some((m: any) => m.name?.trim());
      });
    },
  });

  const { disciplines: scopeDisciplines } = useProjectDisciplines(projectId);
  const disciplines = useMemo(() => {
    // Escopo é a fonte canônica (useProjectDisciplines já escolhe activities vs scope_items).
    // Completa com disciplinas que já aparecem em material_tracking para não perder dados soltos.
    const set = new Set<string>(scopeDisciplines);
    tracking.items.forEach((m: any) => m.discipline && set.add(m.discipline));
    return Array.from(set).sort();
  }, [scopeDisciplines, tracking.items]);

  // Split tracking items into auto (by activity) and manual
  const autoItems = useMemo(() =>
    tracking.items.filter((item: any) => item.activity_id != null),
    [tracking.items]
  );
  const manualItems = useMemo(() =>
    tracking.items.filter((item: any) => item.activity_id == null),
    [tracking.items]
  );

  // Group auto items by activity_id
  const groupedByActivity = useMemo(() => {
    const map = new Map<string, any[]>();
    autoItems.forEach((item: any) => {
      const key = item.activity_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  }, [autoItems]);

  // Filter manual items
  const filteredManual = useMemo(() => {
    return manualItems.filter((item: any) => {
      if (filterDiscipline !== "all" && item.discipline !== filterDiscipline) return false;
      if (filterStatus === "pendente" && (item.quantity_purchased ?? 0) >= (item.quantity_needed ?? 0)) return false;
      if (filterStatus === "comprado" && (item.quantity_purchased ?? 0) === 0) return false;
      if (filterStatus === "entregue" && (item.quantity_delivered ?? 0) === 0) return false;
      return true;
    });
  }, [manualItems, filterDiscipline, filterStatus]);

  // Metrics
  const totalItems = tracking.items.length;
  const pendingPurchase = tracking.items.filter((m: any) => (m.quantity_purchased ?? 0) < (m.quantity_needed ?? 1)).length;
  const delivered = tracking.items.filter((m: any) => (m.quantity_delivered ?? 0) > 0).length;
  const completePct = totalItems > 0
    ? Math.round((tracking.items.filter((m: any) => (m.quantity_delivered ?? 0) >= (m.quantity_needed ?? 1)).length / totalItems) * 100)
    : 0;

  const handleGeneratePurchase = (item: any) => {
    purchases.create.mutate({
      name: item.material_name,
      category: item.discipline || "Material",
      supplier_name: item.supplier_name || "",
      product_link: item.product_link || "",
      specifications: `Qtd necessária: ${item.quantity_needed ?? "—"}`,
      status: "pendente",
    });
  };

  const handleUseCalculated = (item: any) => {
    tracking.update.mutate({
      id: item.id,
      quantity_needed: item.calculated_quantity,
    });
  };

  const handleInlineQuantityUpdate = (itemId: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    tracking.update.mutate({ id: itemId, quantity_needed: num });
  };

  const [importingScopeList, setImportingScopeList] = useState(false);

  const handleImportScopeList = async () => {
    if (!tracking.items) return;
    setImportingScopeList(true);
    try {
      const existingActivityIds = new Set(
        tracking.items.filter((m: any) => m.activity_id).map((m: any) => m.activity_id)
      );
      const newActivities = activities.filter(a => !existingActivityIds.has(a.id));
      if (newActivities.length === 0) {
        toast({ title: "Todas as atividades já possuem materiais vinculados." });
        setImportingScopeList(false);
        return;
      }
      const inserts = newActivities.map(a => ({
        project_id: projectId,
        user_id: (tracking.items[0] as any)?.user_id || "",
        material_name: `Material — ${a.name}`,
        discipline: a.discipline || null,
        activity_id: a.id,
        source: "manual",
      }));
      // Get user_id from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const finalInserts = inserts.map(i => ({ ...i, user_id: user.id }));
      const { error } = await supabase.from("material_tracking").insert(finalInserts);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["material_tracking", projectId] });
      toast({ title: `${finalInserts.length} materiais importados do escopo` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setImportingScopeList(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="rastreamento">
        <TabsList>
          <TabsTrigger value="rastreamento">Materiais de Obra</TabsTrigger>
          <TabsTrigger value="inventario">Inventário</TabsTrigger>
          <TabsTrigger value="atividades">Cronograma</TabsTrigger>
          <TabsTrigger value="compras">Lista da Casa</TabsTrigger>
        </TabsList>

        {/* ===== INVENTÁRIO (3 colunas) ===== */}
        <TabsContent value="inventario" className="mt-4">
          <ProjectMaterialsInventory projectId={projectId} />
        </TabsContent>

        {/* ===== MATERIAIS DE OBRA ===== */}
        <TabsContent value="rastreamento" className="space-y-4 mt-4">
          {/* Action buttons - prominent at top */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => tracking.recalculateFromActivities.mutate()}
              disabled={tracking.recalculateFromActivities.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${tracking.recalculateFromActivities.isPending ? "animate-spin" : ""}`} />
              Calcular por Atividades
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportScopeList}
              disabled={importingScopeList || activities.length === 0}
            >
              <FileDown className="h-4 w-4 mr-1" />
              {importingScopeList ? "Importando..." : "Importar lista do escopo"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={aiLoading || activities.length === 0}
              onClick={async () => {
                const result = await callAction(projectId, "generate_materials", { activities: activities.map(a => ({ name: a.name, area_m2: a.area_m2, discipline: a.discipline })) });
                if (result?.materials) {
                  setAiMaterials(result.materials);
                  setSelectedAiMaterials(new Set(result.materials.map((_: any, i: number) => i)));
                  setAiModalOpen(true);
                }
              }}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Calcular materiais com IA
            </Button>
            <InfoHint label="Sobre Materiais de Obra">
              Insumos de construção: cimento, tinta, piso, revestimento, tubulações, fios e demais materiais de obra.
            </InfoHint>
          </div>

          {/* AI Materials Modal */}
          <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Materiais Sugeridos pela IA</DialogTitle>
                <DialogDescription>Selecione os materiais que deseja importar para o rastreamento.</DialogDescription>
              </DialogHeader>
              {aiMaterials && (
                <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
                  {aiMaterials.map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Checkbox
                        checked={selectedAiMaterials.has(i)}
                        onCheckedChange={(c) => {
                          const next = new Set(selectedAiMaterials);
                          c ? next.add(i) : next.delete(i);
                          setSelectedAiMaterials(next);
                        }}
                      />
                      <div className="flex-1">
                        <span className="font-medium">{m.material_name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({m.activity_name})</span>
                      </div>
                      <span className="text-xs">{m.quantity} {m.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setAiModalOpen(false)}>Cancelar</Button>
                <Button disabled={selectedAiMaterials.size === 0} onClick={async () => {
                  if (!user || !aiMaterials) return;
                  const selected = aiMaterials.filter((_: any, i: number) => selectedAiMaterials.has(i));
                  const inserts = selected.map((m: any) => {
                    const act = activities.find(a => a.name === m.activity_name);
                    return {
                      project_id: projectId, user_id: user.id,
                      material_name: m.material_name,
                      discipline: act?.discipline || null,
                      activity_id: act?.id || null,
                      unit: m.unit, quantity_needed: m.quantity,
                      source: "ai",
                    };
                  });
                  const { error } = await supabase.from("material_tracking").insert(inserts);
                  if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
                  queryClient.invalidateQueries({ queryKey: ["material_tracking", projectId] });
                  toast({ title: `${inserts.length} materiais importados da IA` });
                  setAiModalOpen(false);
                }}>
                  Importar {selectedAiMaterials.size} selecionados
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total de Itens</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{pendingPurchase}</p>
              <p className="text-xs text-muted-foreground">Pendentes de Compra</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{delivered}</p>
              <p className="text-xs text-muted-foreground">Entregues</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completePct}%</p>
              <p className="text-xs text-muted-foreground">Completo</p>
            </CardContent></Card>
          </div>

          {/* ===== SEÇÃO 1: POR ATIVIDADE (auto) ===== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                  Por Atividade
                  <InfoHint>Materiais calculados automaticamente a partir das atividades do escopo.</InfoHint>
                </h3>
              </div>
            </div>

            {tracking.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : groupedByActivity.size === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Nenhum material calculado automaticamente.</p>
                <p className="text-xs mt-1">Clique em "Recalcular" para gerar a partir das atividades com área definida.</p>
              </div>
            ) : (
              Array.from(groupedByActivity.entries()).map(([activityId, items]) => {
                const activity = activities.find((a) => a.id === activityId);
                const color = getDisciplineColor(activity?.discipline);
                return (
                  <Card key={activityId} className="overflow-hidden">
                    <div
                      className="px-4 py-2 border-b flex items-center gap-2"
                      style={{ borderLeftWidth: 4, borderLeftColor: color }}
                    >
                      <span className="font-semibold text-sm">{activity?.name || "Atividade"}</span>
                      {activity?.discipline && (
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: color, color }}>
                          {activity.discipline}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {activity?.area_m2 ? `${activity.area_m2} m²` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {items.length} {items.length === 1 ? "material" : "materiais"}
                      </span>
                    </div>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="w-16">Unid.</TableHead>
                            <TableHead className="text-center w-28">Qtd Calculada</TableHead>
                            <TableHead className="text-center w-28">Qtd Ajustada</TableHead>
                            <TableHead className="w-28">Status</TableHead>
                            <TableHead className="w-24" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item: any) => {
                            const isAdjusted =
                              item.calculated_quantity != null &&
                              item.quantity_needed != null &&
                              Math.abs(item.quantity_needed - item.calculated_quantity) > 0.01;
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="font-medium">{item.material_name}</div>
                                  {isAdjusted && (
                                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                                      Ajustado
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">{item.unit || "—"}</TableCell>
                                <TableCell className="text-center text-muted-foreground">
                                  {item.calculated_quantity != null ? Number(item.calculated_quantity).toFixed(1) : "—"}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Input
                                    type="number"
                                    className="h-7 w-20 text-center mx-auto text-xs"
                                    defaultValue={item.quantity_needed ?? ""}
                                    onBlur={(e) => handleInlineQuantityUpdate(item.id, e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={(item.quantity_purchased ?? 0) > 0 ? "default" : "outline"}
                                    className="text-[10px]"
                                  >
                                    {(item.quantity_purchased ?? 0) > 0 ? "Comprado" : "Necessário"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-0.5">
                                    {isAdjusted && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        title="Usar calculado"
                                        onClick={() => handleUseCalculated(item)}
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      title="Gerar Compra"
                                      onClick={() => handleGeneratePurchase(item)}
                                    >
                                      <ShoppingCart className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => tracking.remove.mutate(item.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* ===== SEÇÃO 2: MANUAIS ===== */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                  Adicionados Manualmente
                  <InfoHint>Materiais adicionados fora do cálculo automático.</InfoHint>
                </h3>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => tracking.importFromBudget.mutate()} disabled={tracking.importFromBudget.isPending}>
                  <Download className="h-4 w-4 mr-1" /> Importar do Orçamento
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShoppingListOpen(true)}>
                  <Copy className="h-4 w-4 mr-1" /> Lista de Compras
                </Button>
                <MaterialCalcByActivitiesDialog projectId={projectId} />
                <Button size="sm" onClick={() => { setEditingTrack(null); setTrackFormOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Novo Material
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Disciplinas</SelectItem>
                  {disciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="comprado">Comprados</SelectItem>
                  <SelectItem value="entregue">Entregues</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tracking.isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredManual.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                {manualItems.length === 0
                  ? "Nenhum material manual. Importe do orçamento ou adicione manualmente."
                  : "Nenhum item encontrado com os filtros selecionados."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Disciplina</TableHead>
                      <TableHead className="w-12">Unid.</TableHead>
                      <TableHead className="text-center">Necessário</TableHead>
                      <TableHead className="text-center">Comprado</TableHead>
                      <TableHead className="text-center">Entregue</TableHead>
                      <TableHead className="text-center">Usado</TableHead>
                      <TableHead className="w-24">Progresso</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="w-28" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredManual.map((item: any) => {
                      const needed = item.quantity_needed ?? 0;
                      const purchased = item.quantity_purchased ?? 0;
                      const pct = needed > 0 ? Math.min(100, Math.round((purchased / needed) * 100)) : 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.material_name}</div>
                            {item.source === "orcamento" && <Badge variant="outline" className="text-[10px] mt-0.5">Orçamento</Badge>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.discipline || "—"}</TableCell>
                          <TableCell className="text-xs">{item.unit || "—"}</TableCell>
                          <TableCell className="text-center">{item.quantity_needed ?? "—"}</TableCell>
                          <TableCell className="text-center">{item.quantity_purchased ?? "—"}</TableCell>
                          <TableCell className="text-center">{item.quantity_delivered ?? "—"}</TableCell>
                          <TableCell className="text-center">{item.quantity_used ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Progress value={pct} className="h-2 flex-1" />
                              <span className="text-[10px] text-muted-foreground w-8">{pct}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{item.supplier_name || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {item.product_link && (
                                <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                                  <a href={item.product_link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Gerar Compra" onClick={() => handleGeneratePurchase(item)}>
                                <ShoppingCart className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingTrack(item as Record<string, unknown>); setTrackFormOpen(true); }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => tracking.remove.mutate(item.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Link to Settings */}
          <div className="pt-4 border-t text-center">
            <button
              onClick={() => navigate("/admin/settings")}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <Settings className="h-3 w-3" />
              Para editar os índices de cálculo, acesse Configurações → Regras de Cálculo
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </TabsContent>

        {/* ===== POR ATIVIDADE (cronograma) ===== */}
        <TabsContent value="atividades" className="space-y-4 mt-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-1.5">
              Materiais por Atividade
              <InfoHint>Materiais associados diretamente às atividades do cronograma. Edite na atividade de origem.</InfoHint>
            </h3>
          </div>
          {taskMaterials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhuma atividade possui materiais associados.
            </div>
          ) : (
            taskMaterials.map((task: any) => {
              const mats = (task.materials as any[]).filter((m: any) => m.name?.trim());
              if (mats.length === 0) return null;
              const color = getDisciplineColor(task.discipline);
              return (
                <Card key={task.id} className="overflow-hidden">
                  <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
                    <span className="font-semibold text-sm">{task.task_name}</span>
                    {task.discipline && <Badge variant="outline" className="text-[10px]">{task.discipline}</Badge>}
                    {task.environment && <span className="text-xs text-muted-foreground">• {task.environment}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{mats.length} {mats.length === 1 ? "item" : "itens"}</span>
                  </div>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="w-20">Qtd</TableHead>
                          <TableHead className="w-16">Unid.</TableHead>
                          <TableHead className="w-28">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mats.map((mat: any, i: number) => {
                          const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
                            necessario: { label: "Necessário", variant: "outline" },
                            comprado: { label: "Comprado", variant: "secondary" },
                            entregue: { label: "Entregue", variant: "default" },
                            usado: { label: "Usado", variant: "default" },
                          };
                          const s = statusMap[mat.status] || statusMap.necessario;
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{mat.name}</TableCell>
                              <TableCell>{mat.quantity || "—"}</TableCell>
                              <TableCell className="text-xs">{mat.unit || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="compras" className="space-y-4 mt-4">
          <div className="flex justify-end mb-2">
            <Button size="sm" variant="outline" onClick={() => setSupplierListOpen(true)} disabled={purchases.items.length === 0}>
              <Package className="h-4 w-4 mr-1" /> Lista por Fornecedor
            </Button>
          </div>
          <ProjectPurchasesTab
            projectId={projectId}
            titleHint="Itens da casa: eletrodomésticos, móveis e equipamentos (coifa, forno, cooktop, geladeira, chuveiro, etc.) — não são insumos de obra."
          />
        </TabsContent>
      </Tabs>

      <MaterialTrackingForm
        open={trackFormOpen}
        onOpenChange={setTrackFormOpen}
        onSubmit={(data) => {
          if (editingTrack) tracking.update.mutate({ id: editingTrack.id as string, ...data });
          else tracking.create.mutate(data);
          setEditingTrack(null);
        }}
        initialData={editingTrack}
        isLoading={tracking.create.isPending || tracking.update.isPending}
        disciplines={disciplines}
      />

      <SupplierPurchaseList
        open={supplierListOpen}
        onOpenChange={setSupplierListOpen}
        items={purchases.items.map(p => ({
          name: p.name,
          supplier_name: p.supplier_name,
          value: p.value,
          specifications: p.specifications,
          status: p.status,
        }))}
      />

      <ShoppingListDialog
        open={shoppingListOpen}
        onOpenChange={setShoppingListOpen}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  );
}
