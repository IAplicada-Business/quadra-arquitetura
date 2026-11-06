// Sprint 6 (Vobi-like): projeto vira opcional, ganha recorrência e
// tags. Forma única usada em /construction/voice-tasks e em /tasks
// (visão central).
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const NO_PROJECT = "__none__";

interface VoiceTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    project_id?: string | null;
    title: string;
    description?: string;
    responsible?: string;
    task_type?: string;
    category?: string;
    priority?: string;
    due_date?: string;
    is_recurring?: boolean;
    recurrence_rule?: string | null;
    tags?: string[] | null;
  }) => void | Promise<void>;
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  isLoading?: boolean;
}

export function VoiceTaskForm({
  open,
  onOpenChange,
  onSubmit,
  projects,
  defaultProjectId,
  isLoading,
}: VoiceTaskFormProps) {
  const [form, setForm] = useState({
    project_id: defaultProjectId || NO_PROJECT,
    title: "",
    description: "",
    responsible: "",
    task_type: "geral",
    category: "pendencias",
    priority: "media",
    due_date: "",
    is_recurring: false,
    recurrence_rule: "FREQ=WEEKLY",
    tags: "",
  });

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        project_id: defaultProjectId || f.project_id || NO_PROJECT,
      }));
    }
  }, [open, defaultProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || isLoading) return;
    const tagsArr = form.tags
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);
    try {
      await onSubmit({
        project_id: form.project_id === NO_PROJECT ? null : form.project_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        responsible: form.responsible.trim() || undefined,
        task_type: form.task_type,
        category: form.category,
        priority: form.priority,
        due_date: form.due_date || undefined,
        is_recurring: form.is_recurring,
        recurrence_rule: form.is_recurring ? form.recurrence_rule : null,
        tags: tagsArr.length > 0 ? tagsArr : null,
      });
      setForm({
        project_id: defaultProjectId || NO_PROJECT,
        title: "",
        description: "",
        responsible: "",
        task_type: "geral",
        category: "pendencias",
        priority: "media",
        due_date: "",
        is_recurring: false,
        recurrence_rule: "FREQ=WEEKLY",
        tags: "",
      });
      onOpenChange(false);
    } catch {
      // Erro já é tratado no hook (toast). Mantém o formulário aberto.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Projeto (opcional)</Label>
            <Select
              value={form.project_id}
              onValueChange={(v) => setForm((f) => ({ ...f, project_id: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROJECT}>— Sem projeto (tarefa pessoal Quadra) —</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cronograma">Cronograma</SelectItem>
                  <SelectItem value="escopo">Escopo</SelectItem>
                  <SelectItem value="orcamentos">Orçamentos</SelectItem>
                  <SelectItem value="materiais">Materiais</SelectItem>
                  <SelectItem value="pendencias">Pendências</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="compras">Compras</SelectItem>
                  <SelectItem value="documentos">Documentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.task_type} onValueChange={(v) => setForm((f) => ({ ...f, task_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="projeto">Projeto</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="compras">Compras</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Input
                value={form.responsible}
                onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
              />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Recorrente</Label>
              <Switch
                checked={form.is_recurring}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_recurring: v }))}
              />
            </div>
            {form.is_recurring && (
              <Select
                value={form.recurrence_rule}
                onValueChange={(v) => setForm((f) => ({ ...f, recurrence_rule: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREQ=DAILY">Todo dia</SelectItem>
                  <SelectItem value="FREQ=WEEKLY">Toda semana</SelectItem>
                  <SelectItem value="FREQ=WEEKLY;BYDAY=MO,WE,FR">Seg/Qua/Sex</SelectItem>
                  <SelectItem value="FREQ=MONTHLY">Todo mês</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input
              placeholder="urgente, contabilidade, cliente"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !form.title.trim()}>
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
