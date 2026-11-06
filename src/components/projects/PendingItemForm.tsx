import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PendingItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    description: string;
    discipline?: string;
    responsible?: string;
    status?: string;
    inclusion_date?: string;
    conclusion_date?: string;
  }) => void;
  initialData?: Record<string, unknown> | null;
  isLoading?: boolean;
  disciplines?: string[];
}

export function PendingItemForm({ open, onOpenChange, onSubmit, initialData, isLoading, disciplines = [] }: PendingItemFormProps) {
  const [description, setDescription] = useState(initialData?.description as string || "");
  const [discipline, setDiscipline] = useState(initialData?.discipline as string || "");
  const [responsible, setResponsible] = useState(initialData?.responsible as string || "");
  const [status, setStatus] = useState(initialData?.status as string || "pendente");
  const [inclusionDate, setInclusionDate] = useState(initialData?.inclusion_date as string || new Date().toISOString().split("T")[0]);
  const [conclusionDate, setConclusionDate] = useState(initialData?.conclusion_date as string || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    onSubmit({
      description,
      discipline: discipline || undefined,
      responsible: responsible || undefined,
      status,
      inclusion_date: inclusionDate || undefined,
      conclusion_date: conclusionDate || undefined,
    });
    onOpenChange(false);
    setDescription(""); setDiscipline(""); setResponsible(""); setStatus("pendente");
    setInclusionDate(new Date().toISOString().split("T")[0]); setConclusionDate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-display">
            {initialData ? "Editar Pendência" : "Nova Pendência"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="O que precisa ser feito..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Disciplina</Label>
              {disciplines.length > 0 ? (
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="Ex: Elétrica" />
              )}
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Quem vai resolver" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Inclusão</Label>
              <Input type="date" value={inclusionDate} onChange={(e) => setInclusionDate(e.target.value)} />
            </div>
            <div>
              <Label>Data Conclusão</Label>
              <Input type="date" value={conclusionDate} onChange={(e) => setConclusionDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{initialData ? "Salvar" : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
