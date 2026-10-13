import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Check, X, Send, Settings2, Download, ArrowLeft, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShowMoreButton, useShowMore } from "@/components/visual/ShowMore";
import { Textarea } from "@/components/ui/textarea";
import { useProposals, Proposal } from "@/hooks/useProposals";
import { useLeads } from "@/hooks/useLeads";
import { useProposalTemplates } from "@/hooks/useProposalTemplates";
import { useProposalAssets } from "@/hooks/useProposalAssets";
import { useProposalBlocks } from "@/hooks/useProposalBlocks";
import { TemplateManager } from "@/components/leads/TemplateManager";
import ProposalFormNew, { ProposalFormData } from "@/components/leads/ProposalFormNew";
import { ProposalPreviewModal } from "@/components/leads/ProposalPreviewModal";
import { buildProposalPages } from "@/components/leads/ProposalPageRenderer";
import { ProposalPageProps } from "@/components/leads/proposal-pages/shared";
import { pickProposalLogos } from "@/lib/proposalBlocks";
import { generateProposalPdf, waitForFonts } from "@/lib/generateProposalPdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import ReactDOM from "react-dom/client";
import { flushSync } from "react-dom";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useContracts } from "@/hooks/useContracts";
import { C } from "@/lib/chartColors";
import { PageTitle } from "@/components/layout/PageTitle";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", enviada: "Enviada", aprovada: "Aprovada", rejeitada: "Rejeitada",
};

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const PROPOSALS_LIMIT = 5;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return format(parseISO(iso), "dd/MM/yyyy"); } catch { return "—"; }
}

function generateProposalNumber(proposals: Proposal[]): string {
  const year = new Date().getFullYear();
  const thisYear = proposals.filter(p => p.proposal_number?.startsWith(`PROP-${year}`));
  const seq = thisYear.length + 1;
  return `PROP-${year}-${String(seq).padStart(3, "0")}`;
}

export default function LeadsProposals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { proposals, isLoading, create, update, remove } = useProposals();
  const { leads } = useLeads();
  const { templates, create: createTemplate, update: updateTemplate, remove: removeTemplate } = useProposalTemplates();
  const { logos, founderPhotos, portfolio, feedbacks, texts, contacts } = useProposalAssets();
  const { blocks: proposalBlocks } = useProposalBlocks();

  const [view, setView] = useState<"list" | "form" | "templates">("list");
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPages, setPreviewPages] = useState<React.ReactElement[]>([]);
  const [generating, setGenerating] = useState(false);
  const renderContainerRef = useRef<HTMLDivElement>(null);
  const [convertProposal, setConvertProposal] = useState<Proposal | null>(null);
  const { contracts } = useContracts();

  // Build shared page props from assets
  const buildPageProps = useCallback((formData: ProposalFormData): ProposalPageProps => {
    const pillarTexts: Record<string, string> = {};
    texts.forEach(t => {
      const key = (t.metadata as any)?.key;
      if (key && t.description) pillarTexts[key] = t.description;
    });

    const diffText = texts.find(t => (t.metadata as any)?.key === "diferenciais");
    const differentials = diffText?.description?.split("|") || [];

    const instagram = contacts.find(c => c.name === "Instagram")?.description;
    const phone1 = contacts.find(c => c.name === "Telefone 1")?.description;
    const phone2 = contacts.find(c => c.name === "Telefone 2")?.description;
    const aboutText = texts.find(t => (t.metadata as any)?.key === "quem_somos")?.description;

    return {
      clientName: formData.client_name,
      projectName: formData.project_name,
      scopeDescription: formData.scope_description,
      servicesIncluded: formData.services_included,
      timelineBriefing: formData.timeline_briefing,
      timelineStudy: formData.timeline_study,
      timelineBudget: formData.timeline_budget,
      timelinePriorities: formData.timeline_priorities,
      timelineConstruction: formData.timeline_construction,
      timelineAnteprojeto: formData.timeline_anteprojeto ?? undefined,
      timelineMobilization: formData.timeline_mobilization ?? undefined,
      timelineFiscalization: formData.timeline_fiscalization ?? undefined,
      priceFull: formData.price_full,
      priceCash: formData.price_full && formData.discount_cash_percent && formData.discount_cash_percent > 0
        ? formData.price_full * (1 - formData.discount_cash_percent / 100)
        : null,
      installmentsCount: formData.installments_count,
      installmentEntry: formData.installment_entry,
      installmentValue: formData.installment_value,
      priceNote: formData.price_note,
      logoUrl: logos[0]?.file_url || undefined,
      ...(() => { const l = pickProposalLogos(logos); return { logoOnDarkUrl: l.onDark, logoOnLightUrl: l.onLight }; })(),
      founderPhotos,
      aboutText,
      pillarTexts,
      differentials: differentials.length > 0 ? differentials : undefined,
      contactInstagram: instagram,
      contactPhone1: phone1,
      contactPhone2: phone2,
      ambientes: formData.ambientes,
      totalArea: formData.total_area,
      etapasAtivas: formData.etapas_ativas,
      customBlockKeys: formData.custom_block_keys,
      portfolioCards: formData.portfolio_cards?.filter(c => c.foto_url) || [],
      validUntil: formData.valid_until,
    };
  }, [logos, founderPhotos, texts, contacts]);

  const buildPages = useCallback((formData: ProposalFormData) => {
    const pageProps = buildPageProps(formData);
    return buildProposalPages({
      data: pageProps,
      blocks: proposalBlocks,
      portfolioImages: portfolio,
      feedbackImages: feedbacks,
      selectedPortfolioProjects: formData.portfolio_projects,
      selectedFeedbackIds: formData.feedback_items,
    });
  }, [buildPageProps, portfolio, feedbacks, proposalBlocks]);

  const handleSave = (formData: ProposalFormData, status: string) => {
    const payload: Record<string, unknown> = {
      lead_id: formData.lead_id || null,
      client_name: formData.client_name,
      project_name: formData.project_name,
      project_type: formData.project_type,
      scope_description: formData.scope_description,
      services_included: formData.services_included,
      timeline_briefing: formData.timeline_briefing,
      timeline_study: formData.timeline_study,
      timeline_budget: formData.timeline_budget,
      timeline_priorities: formData.timeline_priorities,
      timeline_construction: formData.timeline_construction,
      timeline_anteprojeto: formData.timeline_anteprojeto,
      timeline_mobilization: formData.timeline_mobilization,
      timeline_fiscalization: formData.timeline_fiscalization,
      price_full: formData.price_full,
      discount_percent: formData.discount_cash_percent,
      installments_count: formData.installments_count,
      installment_entry: formData.installment_entry,
      installment_value: formData.installment_value,
      price_note: formData.price_note,
      portfolio_projects: formData.portfolio_cards?.length ? formData.portfolio_cards : formData.portfolio_projects,
      feedback_items: formData.feedback_items,
      ambientes: formData.ambientes,
      total_area: formData.total_area,
      etapas_ativas: formData.etapas_ativas,
      custom_block_keys: formData.custom_block_keys,
      value: formData.price_full,
      final_value: formData.price_full && formData.discount_cash_percent && formData.discount_cash_percent > 0
        ? formData.price_full * (1 - formData.discount_cash_percent / 100)
        : formData.price_full,
      valid_until: formData.valid_until,
      status,
    };

    if (editingProposal) {
      update.mutate({ id: editingProposal.id, ...payload });
    } else {
      const num = generateProposalNumber(proposals);
      create.mutate({ ...payload, proposal_number: num } as any);
    }
    setView("list");
    setEditingProposal(null);
  };

  const handlePreview = (formData: ProposalFormData) => {
    const pages = buildPages(formData);
    setPreviewPages(pages);
    setPreviewOpen(true);
  };

  const handleGeneratePdf = async (formData: ProposalFormData) => {
    setGenerating(true);
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    document.body.appendChild(container);

    const roots: ReactDOM.Root[] = [];

    try {
      const pages = buildPages(formData);
      const pageElements: HTMLDivElement[] = [];

      for (let i = 0; i < pages.length; i++) {
        const pageDiv = document.createElement("div");
        container.appendChild(pageDiv);
        const root = ReactDOM.createRoot(pageDiv);
        flushSync(() => {
          root.render(pages[i]);
        });
        pageElements.push(pageDiv);
        roots.push(root);
      }

      // Wait for all images to load
      const allImages = container.querySelectorAll("img");
      await Promise.all(
        Array.from(allImages).map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
              })
        )
      );

      // Wait for fonts to be fully loaded before capture
      await waitForFonts();

      const blob = await generateProposalPdf(pages, (_page, index) => {
        return pageElements[index]?.firstElementChild as HTMLElement || null;
      });

      // Download immediately so user gets the file regardless of upload result
      const fileName = `proposta-${formData.client_name?.replace(/\s+/g, "-") || "cliente"}-${Date.now()}.pdf`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();

      // Try uploading to storage
      try {
        const { error: uploadError } = await supabase.storage
          .from("proposal-assets")
          .upload(`pdfs/${fileName}`, blob, { contentType: "application/pdf" });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("proposal-assets").getPublicUrl(`pdfs/${fileName}`);
          if (editingProposal) {
            update.mutate({ id: editingProposal.id, pdf_url: urlData.publicUrl });
          }
        }
      } catch {
        // Upload failed but PDF was downloaded
      }

      handleSave(formData, "rascunho");
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    } finally {
      roots.forEach(r => r.unmount());
      if (container.parentNode) document.body.removeChild(container);
      setGenerating(false);
    }
  };


  const openNew = () => {
    setEditingProposal(null);
    setView("form");
  };

  const openEdit = (p: Proposal) => {
    setEditingProposal(p);
    setView("form");
  };

  const editInitialData = useMemo((): Partial<ProposalFormData> | undefined => {
    if (!editingProposal) return undefined;
    const p = editingProposal as any;
    return {
      lead_id: p.lead_id,
      client_name: p.client_name || p.leads?.name || "",
      project_name: p.project_name || p.title || "",
      project_type: p.project_type || "residencial",
      scope_description: p.scope_description || p.project_description || "",
      services_included: p.services_included || "ambos",
      timeline_briefing: p.timeline_briefing ?? 4,
      timeline_study: p.timeline_study ?? 15,
      timeline_budget: p.timeline_budget ?? 7,
      timeline_priorities: p.timeline_priorities ?? 7,
      timeline_construction: p.timeline_construction ?? 25,
      timeline_anteprojeto: (p as any).timeline_anteprojeto ?? null,
      timeline_mobilization: (p as any).timeline_mobilization ?? null,
      timeline_fiscalization: (p as any).timeline_fiscalization ?? null,
      price_full: p.price_full || p.value,
      discount_cash_percent: p.discount_percent ?? null,
      installments_count: p.installments_count,
      installment_entry: p.installment_entry,
      installment_value: p.installment_value,
      price_note: p.price_note || "*Neste valor, não está incluso execução de obra (mão de obra e materiais)",
      portfolio_projects: Array.isArray(p.portfolio_projects) && p.portfolio_projects.length > 0 && typeof p.portfolio_projects[0] === "string" ? (p.portfolio_projects as string[]) : [],
      portfolio_cards: Array.isArray(p.portfolio_projects) && p.portfolio_projects.length > 0 && typeof p.portfolio_projects[0] === "object" ? (p.portfolio_projects as any) : [],
      feedback_items: p.feedback_items || [],
      ambientes: (p as any).ambientes || [],
      total_area: (p as any).total_area ?? null,
      etapas_ativas: (p as any).etapas_ativas || [],
      custom_block_keys: Array.isArray((p as any).custom_block_keys) ? ((p as any).custom_block_keys as string[]) : null,
      valid_until: (p as any).valid_until ?? null,
    };
  }, [editingProposal]);

  const handleReject = (id: string) => {
    update.mutate({ id, status: "rejeitada", rejected_at: new Date().toISOString(), rejection_reason: rejectReason });
    setRejectOpen(null);
    setRejectReason("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter((p) => {
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      if (!q) return true;
      const a = p as any;
      return [a.proposal_number, a.client_name, a.project_name, a.title, a.leads?.name]
        .some((v) => typeof v === "string" && v.toLowerCase().includes(q));
    });
  }, [proposals, statusFilter, search]);

  // No máximo 5 na tela; "Ver todas" abre o resto.
  const more = useShowMore(filtered, PROPOSALS_LIMIT, `${statusFilter}|${search}`);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {view !== "list" && (
            <Button variant="ghost" size="sm" className="mb-2" onClick={() => { setView("list"); setEditingProposal(null); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          <PageTitle
            title="Propostas"
            description="Propostas comerciais: monte, gere o PDF, envie e acompanhe a aprovação."
            meta={<Badge variant="secondary" className="text-xs">{proposals.length}</Badge>}
          />
        </div>
        {view === "list" && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("templates")}>
              <Settings2 className="h-4 w-4 mr-1" /> Templates
            </Button>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Proposta</Button>
          </div>
        )}
      </div>

      {/* Templates view */}
      {view === "templates" && (
        <TemplateManager
          title="Templates de Proposta"
          templates={templates}
          fields={[
            { key: "introduction", label: "Introdução", multiline: true },
            { key: "methodology", label: "Metodologia", multiline: true },
            { key: "differentials", label: "Diferenciais", multiline: true },
            { key: "terms", label: "Termos e Condições", multiline: true },
            { key: "footer", label: "Rodapé", multiline: true },
          ]}
          onCreate={(d) => createTemplate.mutate(d as any)}
          onUpdate={(d) => updateTemplate.mutate(d)}
          onRemove={(id) => removeTemplate.mutate(id)}
        />
      )}

      {/* Form view */}
      {view === "form" && (
        <ProposalFormNew
          initialData={editInitialData}
          onSave={handleSave}
          onPreview={handlePreview}
          onGeneratePdf={handleGeneratePdf}
          saving={create.isPending || update.isPending || generating}
        />
      )}

      {/* List view */}
      {view === "list" && (
        <>
          {/* Filtros no padrão das outras abas: busca + lista suspensa. */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, projeto ou número..."
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
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">Nenhuma proposta encontrada.</div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[130px]">Nº</TableHead>
                      <TableHead>Cliente / projeto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Criada em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {more.visible.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {(p as any).proposal_number || "—"}
                        </TableCell>
                        <TableCell>
                          <button type="button" className="text-left hover:underline" onClick={() => openEdit(p)}>
                            <p className="font-medium text-sm">{(p as any).client_name || (p as any).title || (p.leads as any)?.name || "Lead"}</p>
                            {(p as any).project_name && <p className="text-xs text-muted-foreground">{(p as any).project_name}</p>}
                          </button>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                          {formatCurrency((p as any).price_full || (p as any).final_value || p.value)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={p.status === "rejeitada" ? "destructive" : "secondary"}
                            className={p.status === "aprovada" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""}
                            style={p.status === "enviada" ? { backgroundColor: C.navy, color: "white", borderColor: C.navy } : {}}
                          >
                            {statusLabels[p.status] || p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                          {fmtDate(p.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {p.status === "rascunho" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => update.mutate({ id: p.id, status: "enviada", sent_at: new Date().toISOString() })}>
                                <Send className="h-3 w-3 mr-1" /> Enviar
                              </Button>
                            )}
                            {p.status === "enviada" && (
                              <>
                                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => {
                                  update.mutate({ id: p.id, status: "aprovada", approved_at: new Date().toISOString() });
                                  setConvertProposal(p);
                                }}>
                                  <Check className="h-3 w-3 mr-1" /> Aprovar
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" title="Rejeitar" onClick={() => setRejectOpen(p.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {p.status === "aprovada" && (
                              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => navigate("/leads/contracts")}>
                                Gerar Contrato
                              </Button>
                            )}
                            {(p as any).pdf_url && (
                              <a href={(p as any).pdf_url} target="_blank" rel="noopener noreferrer" title="Baixar PDF">
                                <Button size="icon" variant="ghost" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                              </a>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => remove.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ShowMoreButton
                expanded={more.expanded}
                hasMore={more.hasMore}
                total={filtered.length}
                onToggle={more.toggle}
                noun="propostas"
              />
            </Card>
          )}
        </>
      )}

      {/* Preview Modal */}
      <ProposalPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} pages={previewPages} />

      {/* Reject Dialog */}
      <Dialog open={!!rejectOpen} onOpenChange={() => setRejectOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Proposta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Motivo da rejeição</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRejectOpen(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => handleReject(rejectOpen!)}>Rejeitar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden render container for PDF */}
      <div ref={renderContainerRef} style={{ position: "fixed", left: "-9999px", top: 0 }} />

      {/* Convert to Contract Dialog */}
      <AlertDialog open={!!convertProposal} onOpenChange={(open) => { if (!open) setConvertProposal(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Proposta aprovada</AlertDialogTitle>
            <AlertDialogDescription>Deseja converter esta proposta em contrato?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Depois</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!convertProposal || !user) return;
              try {
                const lead = leads.find(l => l.id === convertProposal.lead_id);
                const year = new Date().getFullYear();
                const thisYear = (contracts || []).filter((c: any) => c.contract_number?.startsWith(`CONTR-${year}`));
                const contractNumber = `CONTR-${year}-${String(thisYear.length + 1).padStart(3, "0")}`;

                const { data, error } = await supabase.from("contracts").insert({
                  user_id: user.id,
                  proposal_id: convertProposal.id,
                  contract_number: contractNumber,
                  title: (convertProposal as any).project_name || null,
                  value: (convertProposal as any).price_full || convertProposal.value || null,
                  payment_conditions: convertProposal.payment_conditions || null,
                  service_description: (convertProposal as any).scope_description || null,
                  start_date: (convertProposal as any).valid_until || null,
                  estimated_duration: (convertProposal as any).estimated_duration || null,
                  client_name: lead?.name || null,
                  client_email: lead?.email || null,
                  client_phone: lead?.phone || null,
                  lead_id: (convertProposal as any).lead_id || null,
                  status: "rascunho",
                } as any).select("id").single();

                if (error) throw error;
                setConvertProposal(null);
                navigate("/leads/contracts", { state: { editContractId: data.id } });
                toast({ title: "Contrato criado a partir da proposta. Revise antes de enviar." });
              } catch (err: any) {
                toast({ title: "Erro ao criar contrato", description: err.message, variant: "destructive" });
              }
            }}>Converter em Contrato</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
