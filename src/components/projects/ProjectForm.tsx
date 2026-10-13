import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Wand2 } from "lucide-react";
import { PROJECT_STATUSES, statusLabels, subStatusOptions } from "@/lib/projectConstants";
import { useProjectNumbers } from "@/hooks/useProjectNumbers";
import { duplicateCodeMessage, findProjectsWithCode, normalizeProjectNumber } from "@/lib/projectNumber";

const typeLabels: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  saude: "Saúde",
  outro: "Outro",
};

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => void;
  initialData?: Record<string, unknown> | null;
  isLoading?: boolean;
}

export function ProjectForm({ open, onOpenChange, onSubmit, initialData, isLoading }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("proposta");
  const [subStatus, setSubStatus] = useState("");
  const [projectType, setProjectType] = useState("residencial");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [clientMoveInDate, setClientMoveInDate] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [finishLevel, setFinishLevel] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const { rows: codeRows, suggestion } = useProjectNumbers(open);
  const editingId = (initialData?.id as string | undefined) ?? null;
  const duplicateOwners = findProjectsWithCode(projectNumber, codeRows, editingId);
  // Editando sem trocar o código: um duplicado antigo não trava o salvar.
  const codeUnchanged = !!initialData && normalizeProjectNumber(projectNumber) === normalizeProjectNumber(initialData.project_number as string | null);
  const isDuplicate = duplicateOwners.length > 0 && !codeUnchanged;

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (initialData) {
      setName((initialData.name as string) || "");
      setClientId((initialData.client_id as string) || "");
      setStatus((initialData.status as string) || "proposta");
      setSubStatus((initialData.sub_status as string) || "");
      setProjectType((initialData.project_type as string) || "residencial");
      setAddress((initialData.address as string) || "");
      setNeighborhood((initialData.neighborhood as string) || "");
      setCity((initialData.city as string) || "");
      setAreaSqm(initialData.area_sqm ? String(initialData.area_sqm) : "");
      setStartDate((initialData.start_date as string) || "");
      setExpectedEndDate((initialData.expected_end_date as string) || "");
      setClientMoveInDate((initialData.client_move_in_date as string) || "");
      setEstimatedBudget(initialData.estimated_budget ? String(initialData.estimated_budget) : "");
      setFinishLevel(initialData.finish_level ? String(initialData.finish_level) : "");
      setProjectNumber((initialData.project_number as string) || "");
    } else {
      setName(""); setClientId(""); setStatus("proposta"); setSubStatus(""); setProjectType("residencial");
      setAddress(""); setNeighborhood(""); setCity(""); setAreaSqm(""); setStartDate("");
      setExpectedEndDate(""); setClientMoveInDate(""); setEstimatedBudget(""); setFinishLevel("");
      setProjectNumber("");
    }
    setCodeTouched(false);
    setAllowDuplicate(false);
  }, [initialData, open]);

  // Projeto novo: a numeração automática é o padrão sugerido, até a
  // pessoa digitar outro código.
  useEffect(() => {
    if (open && !initialData && !codeTouched) setProjectNumber(suggestion);
  }, [open, initialData, codeTouched, suggestion]);

  useEffect(() => {
    setAllowDuplicate(false);
  }, [projectNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate && !allowDuplicate) return;
    onSubmit({
      project_number: normalizeProjectNumber(projectNumber) || null,
      allow_duplicate_code: isDuplicate && allowDuplicate,
      name,
      client_id: clientId || null,
      status,
      sub_status: subStatus || null,
      project_type: projectType,
      address: address || null,
      neighborhood: neighborhood || null,
      city: city || null,
      area_sqm: areaSqm ? Number(areaSqm) : null,
      start_date: startDate || null,
      expected_end_date: expectedEndDate || null,
      client_move_in_date: clientMoveInDate || null,
      estimated_budget: estimatedBudget ? Number(estimatedBudget) : null,
      finish_level: finishLevel ? Number(finishLevel) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-display">{initialData ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="project_number">Código do projeto</Label>
              <div className="flex gap-2">
                <Input
                  id="project_number"
                  value={projectNumber}
                  onChange={(e) => { setProjectNumber(e.target.value); setCodeTouched(true); }}
                  placeholder={suggestion}
                  className="font-mono uppercase"
                  aria-invalid={isDuplicate}
                  aria-describedby="project_number_help"
                />
                {normalizeProjectNumber(projectNumber) !== suggestion && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0"
                    onClick={() => { setProjectNumber(suggestion); setCodeTouched(true); }}
                    title="Usar a numeração automática"
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1" /> {suggestion}
                  </Button>
                )}
              </div>
              <p id="project_number_help" className="text-[11px] text-muted-foreground mt-1">
                Sugestão automática: {suggestion}. Pode trocar por um código legado de projeto antigo.
              </p>
            </div>
            {isDuplicate && (
              <div className="col-span-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm space-y-2" role="alert" data-testid="project-number-duplicate">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>{duplicateCodeMessage(projectNumber, duplicateOwners)}</span>
                </p>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <Checkbox checked={allowDuplicate} onCheckedChange={(v) => setAllowDuplicate(v === true)} aria-label="Reutilizar este código" />
                  Reutilizar este código mesmo assim (código legado)
                </label>
              </div>
            )}
            <div className="col-span-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="client">Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setSubStatus(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {subStatusOptions[status] && (
              <div>
                <Label htmlFor="sub_status">Sub-fase</Label>
                <Select value={subStatus} onValueChange={setSubStatus}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {subStatusOptions[status].map((ss) => (
                      <SelectItem key={ss} value={ss}>{ss}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["residencial", "comercial", "saude", "outro"] as const).map((t) => (
                    <SelectItem key={t} value={t}>{typeLabels[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="area">Área (m²)</Label>
              <Input id="area" type="number" step="0.01" value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="start">Data Início</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="end">Previsão Término</Label>
              <Input id="end" type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="movein">Mudança do cliente</Label>
              <Input
                id="movein"
                type="date"
                value={clientMoveInDate}
                onChange={(e) => setClientMoveInDate(e.target.value)}
                title="Data planejada para o cliente se mudar — usada na contagem regressiva"
              />
            </div>
            <div>
              <Label htmlFor="budget">Orçamento Estimado (R$)</Label>
              <Input id="budget" type="number" step="0.01" value={estimatedBudget} onChange={(e) => setEstimatedBudget(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="finish">Nível de Acabamento (1-5)</Label>
              <Input id="finish" type="number" min="1" max="5" value={finishLevel} onChange={(e) => setFinishLevel(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || !name || (isDuplicate && !allowDuplicate)}>{initialData ? "Salvar" : "Criar Projeto"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
