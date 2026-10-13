import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, User, Palette, Calculator, Save, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CalculationRulesTab from "@/components/settings/CalculationRulesTab";
import ProposalBrandingTab from "@/components/settings/ProposalBrandingTab";
import OnboardingTemplateTab from "@/components/settings/OnboardingTemplateTab";
import SiteContentTab from "@/components/settings/site/SiteContentTab";
import { useContentSeries } from "@/hooks/useContentSeries";
import SupplierCategoriesManager from "@/components/settings/SupplierCategoriesManager";
import MessageTemplatesSettings from "@/components/settings/MessageTemplatesSettings";
import ActivityTemplatesManager from "@/components/settings/ActivityTemplatesManager";
import AcquisitionChannelsSettings from "@/components/settings/AcquisitionChannelsSettings";
import { BRAND_HEX } from "@/lib/chartColors";
import {
  useCostReferenceTable,
  CONSTRUCTION_TYPE_LABELS,
  FINISH_LEVEL_LABELS,
  DEFAULT_COST_TABLE,
  type CostTable,
  type ConstructionType,
  type FinishLevel,
} from "@/hooks/useCostReferenceTable";
import { PageTitle } from "@/components/layout/PageTitle";
import { InfoHint } from "@/components/visual/InfoHint";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const constructionTypes = Object.keys(CONSTRUCTION_TYPE_LABELS) as ConstructionType[];
const finishLevels = Object.keys(FINISH_LEVEL_LABELS) as FinishLevel[];

function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (query.data?.id) {
        const { error } = await supabase.from("settings").update(updates as never).eq("id", query.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("settings").insert({ user_id: user!.id, ...updates } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Configuração salva" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { settings: query.data, isLoading: query.isLoading, upsert };
}

function ContentSeriesManager() {
  const { series, create, update, remove } = useContentSeries();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(BRAND_HEX.navy);
  const [editId, setEditId] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim()) return;
    if (editId) {
      update.mutate({ id: editId, name, description, color });
      setEditId(null);
    } else {
      create.mutate({ name, description, color });
    }
    setName(""); setDescription(""); setColor("#1B2A4A");
  };

  const startEdit = (s: any) => {
    setEditId(s.id); setName(s.name); setDescription(s.description || ""); setColor(s.color || "#1B2A4A");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-display">Séries de Conteúdo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bastidores de Obra" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 rounded border cursor-pointer" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
            </div>
          </div>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {editId ? "Atualizar" : "Adicionar"}
          </Button>
        </div>
        <div className="space-y-2">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-2 border rounded-lg">
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <div className="flex-1">
                <p className="text-sm font-medium">{s.name}</p>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => startEdit(s)}>Editar</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(s.id)}>Excluir</Button>
            </div>
          ))}
          {series.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma série criada.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const { costTable, isLoading, saveCostTable } = useCostReferenceTable();
  const [localTable, setLocalTable] = useState<CostTable>(DEFAULT_COST_TABLE);
  const { settings, isLoading: settingsLoading, upsert } = useSettings();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (!isLoading) setLocalTable(costTable);
  }, [costTable, isLoading]);

  const toggleTheme = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleCellChange = (ct: ConstructionType, fl: FinishLevel, value: string) => {
    setLocalTable((prev) => ({
      ...prev,
      [ct]: { ...prev[ct], [fl]: Number(value) || 0 },
    }));
  };

  const handleSaveTable = () => {
    saveCostTable.mutate(localTable);
  };

  return (
    <div>
      <PageTitle title="Configurações" description="Personalize o sistema" className="mb-4" />

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="regras">Regras de Cálculo</TabsTrigger>
          <TabsTrigger value="proposta">Proposta</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="canais">Canais de Aquisição</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground text-sm">E-mail</Label>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Theme */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Aparência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>Tema escuro</Label>
                  <Switch checked={darkMode} onCheckedChange={toggleTheme} />
                </div>
              </CardContent>
            </Card>

            {/* Cost per m² table — full width */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Parâmetros de Cálculo — Custo por m²
                  <InfoHint>Valores de referência usados na Estimativa Rápida de Orçamento. Edite conforme sua região e padrão.</InfoHint>
                </CardTitle>
                <Button size="sm" onClick={handleSaveTable} disabled={saveCostTable.isPending}>
                  <Save className="h-4 w-4 mr-1.5" />
                  Salvar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Tipo / Nível</th>
                        {finishLevels.map((fl) => (
                          <th key={fl} className="text-center py-2 px-2 font-medium text-muted-foreground">
                            {FINISH_LEVEL_LABELS[fl]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {constructionTypes.map((ct) => (
                        <tr key={ct} className="border-b border-border/50">
                          <td className="py-2 pr-4 font-medium">{CONSTRUCTION_TYPE_LABELS[ct]}</td>
                          {finishLevels.map((fl) => (
                            <td key={fl} className="py-2 px-2">
                              <Input
                                type="number"
                                min={0}
                                className="text-center h-9"
                                value={localTable[ct]?.[fl] ?? ""}
                                onChange={(e) => handleCellChange(ct, fl, e.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Tax Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Alíquota de Impostos
                  <InfoHint>Percentual usado no Demonstrativo de Resultado do Projeto (Prestação de Contas) e no DRE do escritório.</InfoHint>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-28 text-center"
                    value={(settings as any)?.tax_rate_percent ?? 6}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) upsert.mutate({ tax_rate_percent: val });
                    }}
                  />
                  <Label className="text-muted-foreground">%</Label>
                </div>
              </CardContent>
            </Card>

            {/* NF Service Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notas Fiscais
                  <InfoHint>Código de serviço padrão (LC 116/2003) pré-preenchido em novas NFs.</InfoHint>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs">
                    <Label className="text-sm">Código de Serviço</Label>
                    <Input
                      className="mt-1"
                      placeholder="ex: 7.01"
                      defaultValue={(settings as any)?.nf_service_code ?? ""}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        upsert.mutate({ nf_service_code: val || null });
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supplier Categories */}
            <SupplierCategoriesManager
              categories={(settings?.supplier_categories as string[]) ?? []}
              onSave={(cats) => upsert.mutate({ supplier_categories: cats })}
              isPending={upsert.isPending}
            />

            {/* Activity Templates */}
            <ActivityTemplatesManager />

            {/* Message Templates */}
            <MessageTemplatesSettings />
          </div>
        </TabsContent>

        <TabsContent value="regras">
          <CalculationRulesTab />
        </TabsContent>

        <TabsContent value="proposta">
          <ProposalBrandingTab />
        </TabsContent>

        <TabsContent value="conteudo">
          <ContentSeriesManager />
        </TabsContent>

        <TabsContent value="canais">
          <AcquisitionChannelsSettings />
        </TabsContent>

        <TabsContent value="onboarding">
          <OnboardingTemplateTab />
        </TabsContent>

        <TabsContent value="site">
          <SiteContentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
