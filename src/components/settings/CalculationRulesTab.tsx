import { useState, useRef } from "react";
import { useCalculationRules, type CalculationRule } from "@/hooks/useCalculationRules";
import { useMaterialIndices, type MaterialIndex } from "@/hooks/useMaterialIndices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Calculator, Layers, Wrench, Upload } from "lucide-react";
import { useLaborCosts, type LaborCost } from "@/hooks/useLaborCosts";
import { toast } from "@/hooks/use-toast";
import { InfoHint } from "@/components/visual/InfoHint";

const DISCIPLINE_OPTIONS = [
  "Alvenaria", "Elétrica", "Hidráulica", "Pintura", "Acabamento",
  "Demolição", "Estrutura", "Impermeabilização", "Esquadrias",
  "Automação", "Ar-condicionado", "Gesso/Forro", "Revestimento",
  "Marcenaria", "Piso", "Limpeza", "Outros",
];

const INDEX_DISCIPLINE_OPTIONS = [
  "Alvenaria", "Elétrica", "Hidráulica", "Pintura", "Piso",
  "Forro", "Esquadria", "Marcenaria", "Limpeza", "Outros",
];

const UNIT_OPTIONS = ["un", "m", "m²", "m³", "kg", "L", "pacote", "rolo", "saco"];

interface FormState {
  discipline: string;
  variable_name: string;
  formula: string;
  result_name: string;
  unit: string;
  notes: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  discipline: "",
  variable_name: "",
  formula: "",
  result_name: "",
  unit: "un",
  notes: "",
  is_active: true,
};

export default function CalculationRulesTab() {
  const { rules, isLoading, createRule, updateRule, deleteRule } = useCalculationRules();
  const { indices, isLoading: indicesLoading, create: createIndex, update: updateIndex, remove: removeIndex } = useMaterialIndices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Material Indices state
  const [indexDialogOpen, setIndexDialogOpen] = useState(false);
  const [editingIndexId, setEditingIndexId] = useState<string | null>(null);
  const [indexForm, setIndexForm] = useState({ activity_type: "", material_name: "", unit: "un", index_per_m2: 0, notes: "" });
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Labor Costs state
  const { laborCosts, isLoading: laborLoading, create: createLabor, update: updateLabor, remove: removeLabor } = useLaborCosts();
  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [editingLaborId, setEditingLaborId] = useState<string | null>(null);
  const [laborForm, setLaborForm] = useState({ discipline: "", activity_type: "", cost_per_m2: 0, cost_per_unit: 0, unit: "m2", region: "Belo Horizonte", notes: "" });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (rule: CalculationRule) => {
    setEditingId(rule.id);
    setForm({
      discipline: rule.discipline,
      variable_name: rule.variable_name,
      formula: rule.formula,
      result_name: rule.result_name,
      unit: rule.unit,
      notes: rule.notes ?? "",
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.discipline || !form.variable_name || !form.formula || !form.result_name) return;
    const payload = { ...form, notes: form.notes || null };
    if (editingId) {
      updateRule.mutate({ id: editingId, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createRule.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleToggle = (rule: CalculationRule) => {
    updateRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  // CSV Import
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      // Skip header if present
      const start = lines[0]?.toLowerCase().includes("disciplina") ? 1 : 0;
      let count = 0;
      for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(/[,;]/).map(c => c.trim());
        if (cols.length >= 4) {
          const [discipline, material, unit, indexStr] = cols;
          const idx = parseFloat(indexStr);
          if (discipline && material && unit && !isNaN(idx) && idx > 0) {
            createIndex.mutate({ activity_type: discipline, material_name: material, unit, index_per_m2: idx, notes: null });
            count++;
          }
        }
      }
      toast({ title: `${count} índices importados do CSV` });
    };
    reader.readAsText(file);
    // Reset input
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  // Group rules by discipline
  const grouped = rules.reduce<Record<string, CalculationRule[]>>((acc, r) => {
    (acc[r.discipline] ??= []).push(r);
    return acc;
  }, {});

  if (isLoading && indicesLoading) return <p className="text-muted-foreground py-8 text-center">Carregando...</p>;

  return (
    <div>
      {/* ===== SEÇÃO 1: ÍNDICES DE MATERIAL (topo) ===== */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold font-display flex items-center gap-2">
              <Layers className="h-5 w-5" /> Índices de Materiais (Memória de Cálculo)
              <InfoHint>
                Estes índices são usados automaticamente para calcular quantidades de materiais ao cadastrar atividades de obra.
                São valores globais do escritório — valem para todos os projetos.
              </InfoHint>
            </h2>
          </div>
          <div className="flex gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvImport}
            />
            <Button size="sm" variant="outline" onClick={() => csvInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" /> Importar CSV
            </Button>
            <Button size="sm" onClick={() => { setEditingIndexId(null); setIndexForm({ activity_type: "", material_name: "", unit: "un", index_per_m2: 0, notes: "" }); setIndexDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar Índice
            </Button>
          </div>
        </div>

        {indicesLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : indices.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum índice cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disciplina</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Índice/m²</TableHead>
                <TableHead>Obs</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indices.map((idx) => (
                <TableRow key={idx.id}>
                  <TableCell><Badge variant="secondary">{idx.activity_type}</Badge></TableCell>
                  <TableCell>{idx.material_name}</TableCell>
                  <TableCell>{idx.unit}</TableCell>
                  <TableCell className="text-right font-mono">{idx.index_per_m2}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{idx.notes || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingIndexId(idx.id);
                      setIndexForm({ activity_type: idx.activity_type, material_name: idx.material_name, unit: idx.unit, index_per_m2: Number(idx.index_per_m2), notes: idx.notes || "" });
                      setIndexDialogOpen(true);
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeIndex.mutate(idx.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Index Dialog */}
      <Dialog open={indexDialogOpen} onOpenChange={setIndexDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIndexId ? "Editar Índice" : "Novo Índice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={indexForm.activity_type} onValueChange={v => setIndexForm({ ...indexForm, activity_type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a disciplina" /></SelectTrigger>
                <SelectContent>
                  {INDEX_DISCIPLINE_OPTIONS.map(d => <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Material</Label>
              <Input placeholder="Ex: Tijolo 29x19x9" value={indexForm.material_name} onChange={e => setIndexForm({ ...indexForm, material_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={indexForm.unit} onValueChange={v => setIndexForm({ ...indexForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Índice por m²</Label>
                <Input type="number" step="0.01" min="0" value={indexForm.index_per_m2} onChange={e => setIndexForm({ ...indexForm, index_per_m2: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Notas..." value={indexForm.notes} onChange={e => setIndexForm({ ...indexForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndexDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!indexForm.activity_type || !indexForm.material_name || !indexForm.index_per_m2) return;
              const payload = { ...indexForm, notes: indexForm.notes || null };
              if (editingIndexId) {
                updateIndex.mutate({ id: editingIndexId, ...payload }, { onSuccess: () => setIndexDialogOpen(false) });
              } else {
                createIndex.mutate(payload, { onSuccess: () => setIndexDialogOpen(false) });
              }
            }} disabled={createIndex.isPending || updateIndex.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SEÇÃO 2: CUSTOS DE MÃO DE OBRA ===== */}
      <div className="pt-6 border-t mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold font-display flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Custos de Mão de Obra por Disciplina
              <InfoHint>Valores de referência por m² usados na prévia de orçamento</InfoHint>
            </h2>
          </div>
          <Button size="sm" onClick={() => { setEditingLaborId(null); setLaborForm({ discipline: "", activity_type: "", cost_per_m2: 0, cost_per_unit: 0, unit: "m2", region: "Belo Horizonte", notes: "" }); setLaborDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Novo Custo
          </Button>
        </div>

        {laborLoading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : laborCosts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum custo cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Disciplina</TableHead>
                <TableHead>Tipo Atividade</TableHead>
                <TableHead className="text-right">Custo/m²</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Região</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborCosts.map((lc) => (
                <TableRow key={lc.id}>
                  <TableCell><Badge variant="secondary">{lc.discipline}</Badge></TableCell>
                  <TableCell>{lc.activity_type || "-"}</TableCell>
                  <TableCell className="text-right font-mono">R$ {Number(lc.cost_per_m2 || 0).toFixed(2)}</TableCell>
                  <TableCell>{lc.unit}</TableCell>
                  <TableCell>{lc.region}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingLaborId(lc.id);
                      setLaborForm({
                        discipline: lc.discipline,
                        activity_type: lc.activity_type || "",
                        cost_per_m2: Number(lc.cost_per_m2 || 0),
                        cost_per_unit: Number(lc.cost_per_unit || 0),
                        unit: lc.unit,
                        region: lc.region,
                        notes: lc.notes || "",
                      });
                      setLaborDialogOpen(true);
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeLabor.mutate(lc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Labor Dialog */}
      <Dialog open={laborDialogOpen} onOpenChange={setLaborDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLaborId ? "Editar Custo" : "Novo Custo de Mão de Obra"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Input placeholder="Ex: Elétrica, Pintura" value={laborForm.discipline} onChange={e => setLaborForm({ ...laborForm, discipline: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Atividade</Label>
              <Input placeholder="Ex: eletrica, pintura" value={laborForm.activity_type} onChange={e => setLaborForm({ ...laborForm, activity_type: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo por m²</Label>
                <Input type="number" step="0.01" min="0" value={laborForm.cost_per_m2} onChange={e => setLaborForm({ ...laborForm, cost_per_m2: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={laborForm.unit} onValueChange={v => setLaborForm({ ...laborForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Região</Label>
              <Input value={laborForm.region} onChange={e => setLaborForm({ ...laborForm, region: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Notas..." value={laborForm.notes} onChange={e => setLaborForm({ ...laborForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLaborDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!laborForm.discipline || !laborForm.cost_per_m2) return;
              const payload = { ...laborForm, activity_type: laborForm.activity_type || null, notes: laborForm.notes || null, cost_per_unit: laborForm.cost_per_unit || null };
              if (editingLaborId) {
                updateLabor.mutate({ id: editingLaborId, ...payload }, { onSuccess: () => setLaborDialogOpen(false) });
              } else {
                createLabor.mutate(payload as any, { onSuccess: () => setLaborDialogOpen(false) });
              }
            }} disabled={createLabor.isPending || updateLabor.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== SEÇÃO 3: REGRAS DE CÁLCULO (final) ===== */}
      <div className="pt-6 border-t">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold font-display flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Regras de Cálculo
              <InfoHint>Fórmulas de referência para cálculo automático de materiais</InfoHint>
            </h2>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Nova Regra
          </Button>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Nenhuma regra cadastrada. Clique em "Nova Regra" para começar.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([disc, items]) => (
              <div key={disc}>
                <Badge variant="secondary" className="mb-2">{disc}</Badge>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variável</TableHead>
                      <TableHead>Fórmula</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-center">Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((rule) => (
                      <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                        <TableCell>{rule.variable_name}</TableCell>
                        <TableCell className="font-mono text-xs">{rule.formula}</TableCell>
                        <TableCell>{rule.result_name}</TableCell>
                        <TableCell>{rule.unit}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={rule.is_active} onCheckedChange={() => handleToggle(rule)} />
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(rule.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}

        {/* Rules Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Regra" : "Nova Regra"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Disciplina</Label>
                <Select value={form.discipline} onValueChange={(v) => setForm({ ...form, discipline: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {DISCIPLINE_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome da variável de entrada</Label>
                <Input placeholder="Ex: Área da parede (m²)" value={form.variable_name} onChange={(e) => setForm({ ...form, variable_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fórmula</Label>
                <Input placeholder="Ex: m² × 25" value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do resultado</Label>
                  <Input placeholder="Ex: Tijolos" value={form.result_name} onChange={(e) => setForm({ ...form, result_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Notas adicionais..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Regra ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createRule.isPending || updateRule.isPending}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
