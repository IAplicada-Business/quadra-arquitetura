import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InvoiceNFFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => void;
  initialData?: Record<string, unknown> | null;
  isLoading?: boolean;
  projectId?: string;
  showProjectSelect?: boolean;
  projects?: { id: string; name: string }[];
  defaultServiceCode?: string | null;
}

const EMPTY = {
  project_id: "",
  nf_number: "",
  nf_type: "recebida" as string,
  issuer_name: "",
  issuer_cnpj: "",
  recipient_name: "",
  recipient_cnpj: "",
  recipient_address_street: "",
  recipient_address_number: "",
  recipient_address_complement: "",
  recipient_address_neighborhood: "",
  recipient_address_city: "",
  recipient_address_state: "",
  recipient_address_zip: "",
  service_code: "",
  service_description: "",
  amount: "",
  issue_date: "",
  competence_month: "",
  status: "pendente",
  notes: "",
  file_url: "",
};

const NO_PROJECT = "__none__";

export function InvoiceNFForm({ open, onOpenChange, onSubmit, initialData, isLoading, projectId, showProjectSelect, projects, defaultServiceCode }: InvoiceNFFormProps) {
  const [form, setForm] = useState({ ...EMPTY, project_id: projectId || "", service_code: defaultServiceCode || "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        project_id: (initialData.project_id as string) || projectId || "",
        nf_number: (initialData.nf_number as string) || "",
        nf_type: (initialData.nf_type as string) || "recebida",
        issuer_name: (initialData.issuer_name as string) || "",
        issuer_cnpj: (initialData.issuer_cnpj as string) || "",
        recipient_name: (initialData.recipient_name as string) || "",
        recipient_cnpj: (initialData.recipient_cnpj as string) || "",
        recipient_address_street: (initialData.recipient_address_street as string) || "",
        recipient_address_number: (initialData.recipient_address_number as string) || "",
        recipient_address_complement: (initialData.recipient_address_complement as string) || "",
        recipient_address_neighborhood: (initialData.recipient_address_neighborhood as string) || "",
        recipient_address_city: (initialData.recipient_address_city as string) || "",
        recipient_address_state: (initialData.recipient_address_state as string) || "",
        recipient_address_zip: (initialData.recipient_address_zip as string) || "",
        service_code: (initialData.service_code as string) || defaultServiceCode || "",
        service_description: (initialData.service_description as string) || "",
        amount: String(initialData.amount ?? ""),
        issue_date: (initialData.issue_date as string) || "",
        competence_month: (initialData.competence_month as string) || "",
        status: (initialData.status as string) || "pendente",
        notes: (initialData.notes as string) || "",
        file_url: (initialData.file_url as string) || "",
      });
    } else {
      setForm({ ...EMPTY, project_id: projectId || "", service_code: defaultServiceCode || "" });
    }
  }, [initialData, projectId, open, defaultServiceCode]);

  // Bug 6/7: a competência costumava ficar nula porque o usuário precisava
  // preencher manualmente. Como o filtro do relatório fiscal usa
  // `.eq("competence_month", X)`, NFs sem competência sumiam dos relatórios.
  // Agora derivamos automaticamente da `issue_date`.
  const handleIssueDateChange = (issueDate: string) => {
    setForm((f) => ({
      ...f,
      issue_date: issueDate,
      competence_month: f.competence_month || (issueDate ? issueDate.slice(0, 7) : ""),
    }));
  };

  // Auto-fill do tomador a partir do cliente vinculado ao projeto.
  // Pedido da Mariana: "dá pra buscar no contrato essa informação,
  // ela vem pra cá e ela já fica pronta".
  const autofillFromProject = async (selectedProjectId: string) => {
    if (!selectedProjectId || selectedProjectId === NO_PROJECT) return;
    const { data: project } = await supabase
      .from("projects")
      .select("client_id, address, city, neighborhood")
      .eq("id", selectedProjectId)
      .maybeSingle();
    if (!project) return;

    // Endereço da obra serve como fallback de tomador (residencial).
    setForm((f) => ({
      ...f,
      project_id: selectedProjectId,
      recipient_address_street: f.recipient_address_street || project.address || "",
      recipient_address_neighborhood: f.recipient_address_neighborhood || project.neighborhood || "",
      recipient_address_city: f.recipient_address_city || project.city || "",
    }));

    if (project.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("name, cpf_cnpj, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip")
        .eq("id", project.client_id)
        .maybeSingle();
      if (client) {
        setForm((f) => ({
          ...f,
          recipient_name: f.recipient_name || client.name || "",
          recipient_cnpj: f.recipient_cnpj || client.cpf_cnpj || "",
          recipient_address_street: f.recipient_address_street || (client as any).address_street || f.recipient_address_street,
          recipient_address_number: f.recipient_address_number || (client as any).address_number || f.recipient_address_number,
          recipient_address_complement: f.recipient_address_complement || (client as any).address_complement || f.recipient_address_complement,
          recipient_address_neighborhood: f.recipient_address_neighborhood || (client as any).address_neighborhood || f.recipient_address_neighborhood,
          recipient_address_city: f.recipient_address_city || (client as any).address_city || f.recipient_address_city,
          recipient_address_state: f.recipient_address_state || (client as any).address_state || f.recipient_address_state,
          recipient_address_zip: f.recipient_address_zip || (client as any).address_zip || f.recipient_address_zip,
        }));
        toast({ title: "Dados do tomador preenchidos a partir do cliente" });
      }
    }
  };

  const handleProjectChange = (value: string) => {
    setForm((f) => ({ ...f, project_id: value === NO_PROJECT ? "" : value }));
    if (value && value !== NO_PROJECT && !form.recipient_name) {
      void autofillFromProject(value);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("invoices").upload(path, file);
    if (error) {
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("invoices").getPublicUrl(path);
    setForm((f) => ({ ...f, file_url: pub.publicUrl }));
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!form.amount || !form.issue_date) return;
    onSubmit({
      project_id: form.project_id || null,
      nf_number: form.nf_number || null,
      nf_type: form.nf_type,
      issuer_name: form.issuer_name || null,
      issuer_cnpj: form.issuer_cnpj || null,
      recipient_name: form.recipient_name || null,
      recipient_cnpj: form.recipient_cnpj || null,
      recipient_address_street: form.recipient_address_street || null,
      recipient_address_number: form.recipient_address_number || null,
      recipient_address_complement: form.recipient_address_complement || null,
      recipient_address_neighborhood: form.recipient_address_neighborhood || null,
      recipient_address_city: form.recipient_address_city || null,
      recipient_address_state: form.recipient_address_state || null,
      recipient_address_zip: form.recipient_address_zip || null,
      service_code: form.service_code || null,
      service_description: form.service_description || null,
      amount: parseFloat(form.amount),
      issue_date: form.issue_date,
      competence_month: form.competence_month || (form.issue_date ? form.issue_date.slice(0, 7) : null),
      status: form.status,
      notes: form.notes || null,
      file_url: form.file_url || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {showProjectSelect && projects && (
            <div>
              <Label>Projeto (opcional)</Label>
              <Select value={form.project_id || NO_PROJECT} onValueChange={handleProjectChange}>
                <SelectTrigger><SelectValue placeholder="Sem projeto vinculado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>— Sem projeto (ex: RT, avulsa) —</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.project_id && (
                <button
                  type="button"
                  onClick={() => void autofillFromProject(form.project_id)}
                  className="mt-1 text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Wand2 className="h-3 w-3" /> Preencher tomador pelo projeto
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nº NF</Label>
              <Input value={form.nf_number} onChange={(e) => setForm((f) => ({ ...f, nf_number: e.target.value }))} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.nf_type} onValueChange={(v) => setForm((f) => ({ ...f, nf_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="recebida">Recebida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Emitente</Label>
              <Input value={form.issuer_name} onChange={(e) => setForm((f) => ({ ...f, issuer_name: e.target.value }))} />
            </div>
            <div>
              <Label>CNPJ Emitente</Label>
              <Input value={form.issuer_cnpj} onChange={(e) => setForm((f) => ({ ...f, issuer_cnpj: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tomador / Destinatário</Label>
              <Input value={form.recipient_name} onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))} />
            </div>
            <div>
              <Label>CPF/CNPJ Tomador</Label>
              <Input value={form.recipient_cnpj} onChange={(e) => setForm((f) => ({ ...f, recipient_cnpj: e.target.value }))} />
            </div>
          </div>
          <div className="rounded-md border p-3 space-y-2 bg-muted/20">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Endereço do tomador</Label>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Input placeholder="Logradouro" value={form.recipient_address_street} onChange={(e) => setForm((f) => ({ ...f, recipient_address_street: e.target.value }))} />
              <Input placeholder="Número" value={form.recipient_address_number} onChange={(e) => setForm((f) => ({ ...f, recipient_address_number: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Complemento" value={form.recipient_address_complement} onChange={(e) => setForm((f) => ({ ...f, recipient_address_complement: e.target.value }))} />
              <Input placeholder="Bairro" value={form.recipient_address_neighborhood} onChange={(e) => setForm((f) => ({ ...f, recipient_address_neighborhood: e.target.value }))} />
            </div>
            <div className="grid grid-cols-[1fr_80px_140px] gap-2">
              <Input placeholder="Cidade" value={form.recipient_address_city} onChange={(e) => setForm((f) => ({ ...f, recipient_address_city: e.target.value }))} />
              <Input placeholder="UF" maxLength={2} value={form.recipient_address_state} onChange={(e) => setForm((f) => ({ ...f, recipient_address_state: e.target.value.toUpperCase() }))} />
              <Input placeholder="CEP" value={form.recipient_address_zip} onChange={(e) => setForm((f) => ({ ...f, recipient_address_zip: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-[180px_1fr] gap-3">
            <div>
              <Label>Código de Serviço</Label>
              <Input
                value={form.service_code}
                onChange={(e) => setForm((f) => ({ ...f, service_code: e.target.value }))}
                placeholder="ex: 7.01"
              />
            </div>
            <div>
              <Label>Descrição do serviço</Label>
              <Input value={form.service_description} onChange={(e) => setForm((f) => ({ ...f, service_description: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Valor *</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Data Emissão *</Label>
              <Input type="date" value={form.issue_date} onChange={(e) => handleIssueDateChange(e.target.value)} />
            </div>
            <div>
              <Label>Competência</Label>
              <Input type="month" value={form.competence_month} onChange={(e) => setForm((f) => ({ ...f, competence_month: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="enviada_contador">Enviada ao Contador</SelectItem>
                <SelectItem value="arquivada">Arquivada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div>
            <Label>Arquivo (XML/PDF)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept=".xml,.pdf" onChange={handleUpload} disabled={uploading} />
              {uploading && <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />}
            </div>
            {form.file_url && (
              <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                <Upload className="h-3 w-3" /> Ver arquivo
              </a>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={isLoading || !form.amount || !form.issue_date} className="w-full">
            {initialData ? "Salvar" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
