import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Trash2, Pencil, FileSignature, Send, X, Settings2, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShowMoreButton, useShowMore } from "@/components/visual/ShowMore";
import { useContracts, Contract } from "@/hooks/useContracts";
import { useProposals } from "@/hooks/useProposals";
import { useContractTemplates } from "@/hooks/useContractTemplates";
import { ContractPreview } from "@/components/leads/ContractPreview";
import { TemplateManager } from "@/components/leads/TemplateManager";
import { SendMessageModal } from "@/components/messages/SendMessageModal";
import type { ContractPageProps } from "@/components/leads/contract-pages/shared";
import { DEFAULT_FORO } from "@/data/defaultContractClauses";
import { PageTitle } from "@/components/layout/PageTitle";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", enviado: "Enviado", assinado: "Assinado", cancelado: "Cancelado",
};

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const CONTRACTS_LIMIT = 5;

function generateContractNumber(contracts: Contract[]): string {
  const year = new Date().getFullYear();
  const thisYear = contracts.filter(c => (c as any).contract_number?.startsWith(`CONTR-${year}`));
  const seq = thisYear.length + 1;
  return `CONTR-${year}-${String(seq).padStart(3, "0")}`;
}

interface Installment {
  description: string;
  value: string;
  dueDate: string;
}

const emptyInstallment = (): Installment => ({ description: "", value: "", dueDate: "" });

const INITIAL_FORM = {
  proposal_id: "", template_id: "", title: "",
  clauses: "", custom_clauses: "",
  address: "", city: "", construction_neighborhood: "",
  value: "", payment_conditions: "", payment_method: "",
  start_date: "", estimated_duration: "",
  client_name: "", client_cpf_cnpj: "", client_email: "", client_phone: "", client_address: "",
  service_description: "", notes: "", environments: "", total_area: "",
  // New fields
  client_person_type: "pessoa_fisica" as "pessoa_fisica" | "pessoa_juridica",
  client_nationality: "", client_marital_status: "", client_rg: "",
  client_razao_social: "", client_tipo_societario: "", client_representante_legal: "",
  client_logradouro: "", client_numero: "", client_complemento: "",
  client_bairro: "", client_cidade: "", client_estado: "", client_cep: "",
  signatario_contratante_name: "", signatario_contratante_email: "",
  signatario_contratada_name: "", signatario_contratada_email: "contato@quadraarquitetura.com",
  signature_date: "",
  foro: DEFAULT_FORO,
  timeline_levantamento: "", timeline_briefing: "", timeline_anteprojeto: "",
  timeline_anteprojeto_aprovacao: "", timeline_projeto_executivo: "",
  timeline_reuniao_prioridades: "", timeline_gestao_pagamentos: "",
  project_name: "",
};

export default function LeadsContracts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contracts, isLoading, create, update, remove, signAndCreateProject } = useContracts();
  const { proposals } = useProposals();
  const { templates, create: createTemplate, update: updateTemplate, remove: removeTemplate } = useContractTemplates();
  const approvedProposals = proposals.filter((p) => p.status === "aprovada");

  const [formOpen, setFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [cancelOpen, setCancelOpen] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [activeTab, setActiveTab] = useState("lista");
  const [msgContract, setMsgContract] = useState<any>(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [installments, setInstallments] = useState<Installment[]>([emptyInstallment()]);

  const set = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const openNew = () => {
    setEditingContract(null);
    setFormData({ ...INITIAL_FORM });
    setInstallments([emptyInstallment()]);
    setFormOpen(true);
  };

  const openEdit = (c: Contract) => {
    setEditingContract(c);
    const a = c as any;
    setFormData({
      proposal_id: c.proposal_id, template_id: a.template_id || "", title: a.title || "",
      clauses: c.clauses || "", custom_clauses: a.custom_clauses || "",
      address: c.address || "", city: c.city || "", construction_neighborhood: a.construction_neighborhood || "",
      value: c.value?.toString() || "", payment_conditions: c.payment_conditions || "",
      payment_method: a.payment_method || "", start_date: c.start_date || "",
      estimated_duration: a.estimated_duration || "",
      client_name: a.client_name || "", client_cpf_cnpj: a.client_cpf_cnpj || "",
      client_email: a.client_email || "", client_phone: a.client_phone || "",
      client_address: a.client_address || "",
      service_description: a.service_description || "", notes: a.notes || "",
      environments: a.environments || "", total_area: a.total_area?.toString() || "",
      client_person_type: a.client_person_type || "pessoa_fisica",
      client_nationality: a.client_nationality || "", client_marital_status: a.client_marital_status || "",
      client_rg: a.client_rg || "",
      client_razao_social: a.client_razao_social || "", client_tipo_societario: a.client_tipo_societario || "",
      client_representante_legal: a.client_representante_legal || "",
      client_logradouro: a.client_logradouro || "", client_numero: a.client_numero || "",
      client_complemento: a.client_complemento || "",
      client_bairro: a.client_bairro || "", client_cidade: a.client_cidade || "",
      client_estado: a.client_estado || "", client_cep: a.client_cep || "",
      signatario_contratante_name: a.signatario_contratante_name || "",
      signatario_contratante_email: a.signatario_contratante_email || "",
      signatario_contratada_name: a.signatario_contratada_name || "",
      signatario_contratada_email: a.signatario_contratada_email || "contato@quadraarquitetura.com",
      signature_date: a.signature_date || "", foro: a.foro || DEFAULT_FORO,
      timeline_levantamento: a.timeline_levantamento?.toString() || "",
      timeline_briefing: a.timeline_briefing?.toString() || "",
      timeline_anteprojeto: a.timeline_anteprojeto?.toString() || "",
      timeline_anteprojeto_aprovacao: a.timeline_anteprojeto_aprovacao?.toString() || "",
      timeline_projeto_executivo: a.timeline_projeto_executivo?.toString() || "",
      timeline_reuniao_prioridades: a.timeline_reuniao_prioridades?.toString() || "",
      timeline_gestao_pagamentos: a.timeline_gestao_pagamentos?.toString() || "",
      project_name: a.project_name || a.title || "",
    });
    // Parse installments from JSON
    const sched = a.installments_schedule;
    if (Array.isArray(sched) && sched.length > 0) {
      setInstallments(sched.map((s: any) => ({
        description: s.description || "",
        value: s.value?.toString() || "",
        dueDate: s.dueDate || s.due_date || "",
      })));
    } else {
      setInstallments([emptyInstallment()]);
    }
    setFormOpen(true);
  };

  const handleSelectProposal = (proposalId: string) => {
    const p = proposals.find(pr => pr.id === proposalId);
    if (!p) return;
    const lead = p.leads as any;
    const a = p as any;
    const ambientesRaw = a.ambientes;
    let environmentsText = "";
    if (Array.isArray(ambientesRaw) && ambientesRaw.length > 0) {
      environmentsText = ambientesRaw.map((amb: any) => typeof amb === "string" ? amb : amb?.name || amb?.ambiente || "").filter(Boolean).join(", ");
    }
    setFormData(prev => ({
      ...prev,
      proposal_id: proposalId,
      value: (a.final_value?.toString() || p.value?.toString() || ""),
      payment_conditions: p.payment_conditions || "",
      payment_method: a.payment_method || "",
      client_name: lead?.name || "",
      client_email: lead?.email || "",
      client_phone: lead?.phone || "",
      service_description: p.project_description || a.scope_description || "",
      estimated_duration: a.estimated_duration || p.deadline || "",
      environments: environmentsText,
      total_area: a.total_area?.toString() || "",
      signatario_contratante_name: lead?.name || "",
      signatario_contratante_email: lead?.email || "",
      project_name: a.project_name || "",
      timeline_briefing: a.timeline_briefing?.toString() || "",
      timeline_anteprojeto: a.timeline_anteprojeto?.toString() || "",
      timeline_projeto_executivo: a.timeline_budget?.toString() || "",
      timeline_reuniao_prioridades: a.timeline_priorities?.toString() || "",
      timeline_gestao_pagamentos: a.timeline_construction?.toString() || "",
    }));
    // Build installments from proposal
    const count = a.installments_count || 0;
    const entry = a.installment_entry;
    const instValue = a.installment_value;
    if (count > 0 || entry) {
      const newInst: Installment[] = [];
      if (entry) newInst.push({ description: "Na Data de Assinatura", value: entry.toString(), dueDate: "" });
      for (let i = 0; i < (count || 1); i++) {
        newInst.push({ description: `Parcela ${i + 1}`, value: instValue?.toString() || "", dueDate: "" });
      }
      setInstallments(newInst.length > 0 ? newInst : [emptyInstallment()]);
    }
  };

  const handleSubmit = () => {
    if (!formData.proposal_id) return;
    const payload: Record<string, unknown> = { ...formData };
    payload.value = formData.value ? Number(formData.value) : null;
    payload.total_area = formData.total_area ? Number(formData.total_area) : null;
    payload.installments_schedule = installments.map(i => ({
      description: i.description, value: i.value ? Number(i.value) : null, dueDate: i.dueDate,
    }));
    // Convert timeline strings to numbers
    for (const key of ["timeline_levantamento", "timeline_briefing", "timeline_anteprojeto", "timeline_anteprojeto_aprovacao", "timeline_projeto_executivo", "timeline_reuniao_prioridades", "timeline_gestao_pagamentos"]) {
      payload[key] = (formData as any)[key] ? Number((formData as any)[key]) : null;
    }
    // Clean empty strings to null
    for (const [k, v] of Object.entries(payload)) {
      if (v === "") payload[k] = null;
    }

    if (editingContract) {
      update.mutate({ id: editingContract.id, ...payload });
    } else {
      const num = generateContractNumber(contracts);
      create.mutate({ ...payload, contract_number: num } as any);
    }
    setFormOpen(false);
  };

  const handleCancel = (id: string) => {
    update.mutate({ id, status: "cancelado", cancelled_at: new Date().toISOString(), cancellation_reason: cancelReason });
    setCancelOpen(null);
    setCancelReason("");
  };

  const handlePdfGenerated = (url: string) => {
    if (editingContract) {
      update.mutate({ id: editingContract.id, pdf_url: url });
    }
  };

  const contractPageData: ContractPageProps = useMemo(() => ({
    contractNumber: editingContract ? ((editingContract as any).contract_number || "") : generateContractNumber(contracts),
    clientPersonType: formData.client_person_type as "pessoa_fisica" | "pessoa_juridica",
    clientName: formData.client_name,
    clientCpfCnpj: formData.client_cpf_cnpj,
    clientNationality: formData.client_nationality,
    clientMaritalStatus: formData.client_marital_status,
    clientRg: formData.client_rg,
    clientRazaoSocial: formData.client_razao_social,
    clientTipoSocietario: formData.client_tipo_societario,
    clientRepresentanteLegal: formData.client_representante_legal,
    clientLogradouro: formData.client_logradouro,
    clientNumero: formData.client_numero,
    clientComplemento: formData.client_complemento,
    clientBairro: formData.client_bairro,
    clientCidade: formData.client_cidade,
    clientEstado: formData.client_estado,
    clientCep: formData.client_cep,
    clientEmail: formData.client_email,
    clientPhone: formData.client_phone,
    signatarioContratanteName: formData.signatario_contratante_name,
    signatarioContratanteEmail: formData.signatario_contratante_email,
    signatarioContratadaName: formData.signatario_contratada_name,
    signatarioContratadaEmail: formData.signatario_contratada_email,
    serviceDescription: formData.service_description,
    environments: formData.environments,
    totalArea: formData.total_area ? Number(formData.total_area) : null,
    projectName: formData.project_name || formData.title,
    value: formData.value ? Number(formData.value) : null,
    installmentsSchedule: installments.map(i => ({
      description: i.description, value: i.value ? Number(i.value) : null, dueDate: i.dueDate,
    })),
    timelineLevantamento: formData.timeline_levantamento ? Number(formData.timeline_levantamento) : null,
    timelineBriefing: formData.timeline_briefing ? Number(formData.timeline_briefing) : null,
    timelineAnteprojeto: formData.timeline_anteprojeto ? Number(formData.timeline_anteprojeto) : null,
    timelineAnteprojetoAprovacao: formData.timeline_anteprojeto_aprovacao ? Number(formData.timeline_anteprojeto_aprovacao) : null,
    timelineProjetoExecutivo: formData.timeline_projeto_executivo ? Number(formData.timeline_projeto_executivo) : null,
    timelineReuniaoPrioridades: formData.timeline_reuniao_prioridades ? Number(formData.timeline_reuniao_prioridades) : null,
    timelineGestaoPagamentos: formData.timeline_gestao_pagamentos ? Number(formData.timeline_gestao_pagamentos) : null,
    signatureDate: formData.signature_date,
    foro: formData.foro,
    estimatedDuration: formData.estimated_duration,
    customClauses: formData.custom_clauses,
  }), [formData, installments, editingContract, contracts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== "todos" && c.status !== statusFilter) return false;
      if (!q) return true;
      const a = c as any;
      return [a.contract_number, a.client_name, a.proposals?.leads?.name, c.address, c.city]
        .some((v) => typeof v === "string" && v.toLowerCase().includes(q));
    });
  }, [contracts, statusFilter, search]);

  // No máximo 5 na tela; "Ver todos" abre o resto.
  const more = useShowMore(filtered, CONTRACTS_LIMIT, `${statusFilter}|${search}`);

  // Auto-open contract from conversion flow
  useEffect(() => {
    const editId = (location.state as any)?.editContractId;
    if (editId && contracts.length > 0) {
      const contract = contracts.find((c) => c.id === editId);
      if (contract) {
        openEdit(contract);
        window.history.replaceState({}, document.title);
      }
    }
  }, [contracts, location.state]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageTitle
          title="Contratos"
          description="Contratos gerados a partir das propostas aprovadas: envio, assinatura e criação do projeto."
          meta={<Badge variant="secondary" className="text-xs">{contracts.length}</Badge>}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveTab(activeTab === "templates" ? "lista" : "templates")}>
            <Settings2 className="h-4 w-4 mr-1" /> Templates
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Contrato</Button>
        </div>
      </div>

      {activeTab === "templates" ? (
        <TemplateManager
          title="Templates de Contrato"
          templates={templates}
          fields={[
            { key: "clause_object", label: "Cláusula — Objeto", multiline: true },
            { key: "clause_scope", label: "Cláusula — Escopo", multiline: true },
            { key: "clause_value", label: "Cláusula — Valor e Pagamento", multiline: true },
            { key: "clause_duration", label: "Cláusula — Prazo", multiline: true },
            { key: "clause_obligations_contractor", label: "Obrigações da Contratada", multiline: true },
            { key: "clause_obligations_client", label: "Obrigações do Contratante", multiline: true },
            { key: "clause_termination", label: "Cláusula — Rescisão", multiline: true },
            { key: "clause_confidentiality", label: "Cláusula — Confidencialidade", multiline: true },
            { key: "clause_general", label: "Disposições Gerais", multiline: true },
          ]}
          onCreate={(d) => createTemplate.mutate(d as any)}
          onUpdate={(d) => updateTemplate.mutate(d)}
          onRemove={(id) => removeTemplate.mutate(id)}
        />
      ) : (
        <>
          {/* Filtros no padrão das outras abas: busca + lista suspensa. */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, endereço ou número..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">Nenhum contrato encontrado.</div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden lg:table-cell">Endereço da obra</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {more.visible.map((c) => {
                      const leadName = (c as any).client_name || (c.proposals as any)?.leads?.name || "—";
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {(c as any).contract_number || "—"}
                          </TableCell>
                          <TableCell>
                            <button type="button" className="text-left font-medium text-sm hover:underline" onClick={() => openEdit(c)}>
                              {leadName}
                            </button>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {c.address ? `${c.address}${c.city ? `, ${c.city}` : ""}` : "Sem endereço"}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                            {formatCurrency(c.value)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === "assinado" ? "default" : "secondary"}>{statusLabels[c.status] || c.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {c.status === "rascunho" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => update.mutate({ id: c.id, status: "enviado", sent_at: new Date().toISOString() })}>
                                  <Send className="h-3 w-3 mr-1" /> Enviar
                                </Button>
                              )}
                              {(c.status === "rascunho" || c.status === "enviado") && (
                                <>
                                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => signAndCreateProject.mutate(c)} disabled={signAndCreateProject.isPending}>
                                    <FileSignature className="h-3 w-3 mr-1" /> Assinar
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Cancelar contrato" onClick={() => setCancelOpen(c.id)}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {c.status === "assinado" && c.project_id && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/projects/${c.project_id}`)}>
                                  Ver Projeto
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Enviar mensagem" onClick={() => setMsgContract(c)}><MessageSquare className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => remove.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <ShowMoreButton
                expanded={more.expanded}
                hasMore={more.hasMore}
                total={filtered.length}
                onToggle={more.toggle}
                noun="contratos"
              />
            </Card>
          )}
        </>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-7xl max-h-[92vh] overflow-hidden">
          <DialogHeader><DialogTitle>{editingContract ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 overflow-hidden max-h-[80vh]">
            {/* Left: Form with Tabs */}
            <div className="overflow-y-auto pr-2 space-y-4">
              {/* Proposal selector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Proposta Aprovada *</Label>
                  <Select value={formData.proposal_id} onValueChange={handleSelectProposal}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma proposta" /></SelectTrigger>
                    <SelectContent>
                      {approvedProposals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{(p.leads as any)?.name || "Lead"} — {formatCurrency((p as any).final_value || p.value)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nome do Projeto</Label>
                  <Input value={formData.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="Ex: Reforma Residencial" />
                </div>
              </div>

              <Tabs defaultValue="contratante" className="w-full">
                <div className="overflow-x-auto">
                <TabsList className="grid grid-cols-5 h-8 min-w-[400px] w-full">
                  <TabsTrigger value="contratante" className="text-xs">Contratante</TabsTrigger>
                  <TabsTrigger value="servicos" className="text-xs">Servicos</TabsTrigger>
                  <TabsTrigger value="pagamento" className="text-xs">Pagamento</TabsTrigger>
                  <TabsTrigger value="cronograma" className="text-xs">Cronograma</TabsTrigger>
                  <TabsTrigger value="assinatura" className="text-xs">Assinatura</TabsTrigger>
                </TabsList>
                </div>

                {/* TAB: Contratante */}
                <TabsContent value="contratante" className="space-y-4 mt-3">
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <Label className="text-xs">Tipo:</Label>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${formData.client_person_type === "pessoa_fisica" ? "font-bold" : "opacity-50"}`}>Pessoa Fisica</span>
                      <Switch
                        checked={formData.client_person_type === "pessoa_juridica"}
                        onCheckedChange={(checked) => set("client_person_type", checked ? "pessoa_juridica" : "pessoa_fisica")}
                      />
                      <span className={`text-xs ${formData.client_person_type === "pessoa_juridica" ? "font-bold" : "opacity-50"}`}>Pessoa Juridica</span>
                    </div>
                  </div>

                  {formData.client_person_type === "pessoa_fisica" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">Nome Completo</Label><Input value={formData.client_name} onChange={(e) => set("client_name", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label className="text-xs">CPF</Label><Input value={formData.client_cpf_cnpj} onChange={(e) => set("client_cpf_cnpj", e.target.value)} placeholder="000.000.000-00" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">RG</Label><Input value={formData.client_rg} onChange={(e) => set("client_rg", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Naturalidade</Label><Input value={formData.client_nationality} onChange={(e) => set("client_nationality", e.target.value)} placeholder="brasileiro(a)" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Estado Civil</Label>
                        <Select value={formData.client_marital_status} onValueChange={(v) => set("client_marital_status", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {["solteiro(a)", "casado(a)", "divorciado(a)", "viuvo(a)", "uniao estavel"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label className="text-xs">Razao Social</Label><Input value={formData.client_razao_social} onChange={(e) => set("client_razao_social", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label className="text-xs">CNPJ</Label><Input value={formData.client_cpf_cnpj} onChange={(e) => set("client_cpf_cnpj", e.target.value)} placeholder="00.000.000/0000-00" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Tipo Societario</Label><Input value={formData.client_tipo_societario} onChange={(e) => set("client_tipo_societario", e.target.value)} placeholder="Ex: LTDA, S/A" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Representante Legal</Label><Input value={formData.client_representante_legal} onChange={(e) => set("client_representante_legal", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Nome p/ Contrato</Label><Input value={formData.client_name} onChange={(e) => set("client_name", e.target.value)} /></div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={formData.client_email} onChange={(e) => set("client_email", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input value={formData.client_phone} onChange={(e) => set("client_phone", e.target.value)} /></div>
                  </div>

                  <h4 className="text-xs font-semibold border-b pb-1">Endereco do Contratante</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1.5"><Label className="text-xs">Logradouro</Label><Input value={formData.client_logradouro} onChange={(e) => set("client_logradouro", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Numero</Label><Input value={formData.client_numero} onChange={(e) => set("client_numero", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Complemento</Label><Input value={formData.client_complemento} onChange={(e) => set("client_complemento", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Bairro</Label><Input value={formData.client_bairro} onChange={(e) => set("client_bairro", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">CEP</Label><Input value={formData.client_cep} onChange={(e) => set("client_cep", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Cidade</Label><Input value={formData.client_cidade} onChange={(e) => set("client_cidade", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Estado</Label><Input value={formData.client_estado} onChange={(e) => set("client_estado", e.target.value)} /></div>
                  </div>
                </TabsContent>

                {/* TAB: Servicos */}
                <TabsContent value="servicos" className="space-y-4 mt-3">
                  <div className="space-y-1.5"><Label className="text-xs">Descricao dos Servicos</Label><Textarea value={formData.service_description} onChange={(e) => set("service_description", e.target.value)} rows={4} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Ambientes Contratados</Label><Textarea value={formData.environments} onChange={(e) => set("environments", e.target.value)} rows={2} placeholder="Sala, Cozinha, Quarto..." /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Metragem Total (m2)</Label><Input type="number" value={formData.total_area} onChange={(e) => set("total_area", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Valor Total (R$)</Label><Input type="number" value={formData.value} onChange={(e) => set("value", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Prazo Estimado</Label><Input value={formData.estimated_duration} onChange={(e) => set("estimated_duration", e.target.value)} placeholder="Ex: 6 meses" /></div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Clausulas Especificas (adicionais)</Label><Textarea value={formData.custom_clauses} onChange={(e) => set("custom_clauses", e.target.value)} rows={3} /></div>
                </TabsContent>

                {/* TAB: Pagamento */}
                <TabsContent value="pagamento" className="space-y-4 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Condicoes de Pagamento</Label><Input value={formData.payment_conditions} onChange={(e) => set("payment_conditions", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Metodo de Pagamento</Label><Input value={formData.payment_method} onChange={(e) => set("payment_method", e.target.value)} placeholder="Boleto, PIX..." /></div>
                  </div>

                  <h4 className="text-xs font-semibold border-b pb-1">Parcelas</h4>
                  {installments.map((inst, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_100px_130px_32px] gap-2 items-end">
                      <div className="space-y-1"><Label className="text-xs">Descricao</Label><Input value={inst.description} onChange={(e) => { const n = [...installments]; n[idx].description = e.target.value; setInstallments(n); }} placeholder={idx === 0 ? "Na Data de Assinatura" : `Parcela ${idx + 1}`} /></div>
                      <div className="space-y-1"><Label className="text-xs">Valor (R$)</Label><Input type="number" value={inst.value} onChange={(e) => { const n = [...installments]; n[idx].value = e.target.value; setInstallments(n); }} /></div>
                      <div className="space-y-1"><Label className="text-xs">Data</Label><Input type="date" value={inst.dueDate} onChange={(e) => { const n = [...installments]; n[idx].dueDate = e.target.value; setInstallments(n); }} /></div>
                      <Button variant="ghost" size="sm" className="h-9 w-8 p-0 text-destructive" onClick={() => { if (installments.length > 1) setInstallments(installments.filter((_, i) => i !== idx)); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setInstallments([...installments, emptyInstallment()])}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Parcela
                  </Button>
                </TabsContent>

                {/* TAB: Cronograma */}
                <TabsContent value="cronograma" className="space-y-4 mt-3">
                  <p className="text-xs text-muted-foreground">Preencha os prazos em dias uteis para cada fase do projeto (Anexo I do contrato).</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Levantamento (dias)</Label><Input type="number" value={formData.timeline_levantamento} onChange={(e) => set("timeline_levantamento", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Briefing (dias)</Label><Input type="number" value={formData.timeline_briefing} onChange={(e) => set("timeline_briefing", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Anteprojeto (dias)</Label><Input type="number" value={formData.timeline_anteprojeto} onChange={(e) => set("timeline_anteprojeto", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Aprovacao AP (dias)</Label><Input type="number" value={formData.timeline_anteprojeto_aprovacao} onChange={(e) => set("timeline_anteprojeto_aprovacao", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Projeto Executivo (dias)</Label><Input type="number" value={formData.timeline_projeto_executivo} onChange={(e) => set("timeline_projeto_executivo", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Reuniao Prioridades (dias)</Label><Input type="number" value={formData.timeline_reuniao_prioridades} onChange={(e) => set("timeline_reuniao_prioridades", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Gestao Pagamentos (dias)</Label><Input type="number" value={formData.timeline_gestao_pagamentos} onChange={(e) => set("timeline_gestao_pagamentos", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Data de Inicio</Label><Input type="date" value={formData.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
                  </div>
                </TabsContent>

                {/* TAB: Assinatura */}
                <TabsContent value="assinatura" className="space-y-4 mt-3">
                  <h4 className="text-xs font-semibold border-b pb-1">Signatario Contratante</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={formData.signatario_contratante_name} onChange={(e) => set("signatario_contratante_name", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={formData.signatario_contratante_email} onChange={(e) => set("signatario_contratante_email", e.target.value)} /></div>
                  </div>
                  <h4 className="text-xs font-semibold border-b pb-1">Signatario Contratada (Quadra)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={formData.signatario_contratada_name} onChange={(e) => set("signatario_contratada_name", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={formData.signatario_contratada_email} onChange={(e) => set("signatario_contratada_email", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Data de Assinatura</Label><Input type="date" value={formData.signature_date} onChange={(e) => set("signature_date", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Foro</Label><Input value={formData.foro} onChange={(e) => set("foro", e.target.value)} /></div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Observacoes Internas</Label><Textarea value={formData.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={!formData.proposal_id || create.isPending || update.isPending}>
                  {editingContract ? "Salvar" : "Criar Contrato"}
                </Button>
              </div>
            </div>

            {/* Right: Preview */}
            <div className="overflow-y-auto">
              <ContractPreview contractData={contractPageData} onPdfGenerated={handlePdfGenerated} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelOpen} onOpenChange={() => setCancelOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar Contrato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Motivo do cancelamento</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCancelOpen(null)}>Voltar</Button>
            <Button variant="destructive" onClick={() => handleCancel(cancelOpen!)}>Cancelar Contrato</Button>
          </div>
        </DialogContent>
      </Dialog>
      {msgContract && (
        <SendMessageModal
          open={!!msgContract}
          onOpenChange={(o) => { if (!o) setMsgContract(null); }}
          category="contrato"
          phone={msgContract.client_phone || ""}
          context={{
            nome_cliente: msgContract.client_name || "",
            projeto: msgContract.title || "",
            valor: formatCurrency(msgContract.value),
          }}
        />
      )}
    </div>
  );
}
