import { useMemo, useRef, useCallback, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Eye, Copy, FileText, Check, Pencil, MessageSquare } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useLeads, leadStatusLabels } from "@/hooks/useLeads";
import { useProposalAssets } from "@/hooks/useProposalAssets";
import { useProposalBlocks } from "@/hooks/useProposalBlocks";
import { pickProposalLogos } from "@/lib/proposalBlocks";
import { useContracts } from "@/hooks/useContracts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { buildProposalPages } from "@/components/leads/ProposalPageRenderer";
import { ProposalPageProps } from "@/components/leads/proposal-pages/shared";
import { generateProposalPdf, waitForFonts } from "@/lib/generateProposalPdf";
import ReactDOM from "react-dom/client";
import { flushSync } from "react-dom";
import { SendMessageModal } from "@/components/messages/SendMessageModal";
import { C } from "@/lib/chartColors";

const originLabels: Record<string, string> = {
  indicacao: "Indicação", instagram: "Instagram", google: "Google", site: "Site", outro: "Outro",
};
const typeLabels: Record<string, string> = {
  residencial: "Residencial", comercial: "Comercial", saude: "Saúde", outro: "Outro",
};
const statusColors: Record<string, string> = {
  novo: "bg-blue-500/10 text-blue-700 border-blue-200",
  contato_feito: "bg-amber-500/10 text-amber-700 border-amber-200",
  reuniao_agendada: "bg-purple-500/10 text-purple-700 border-purple-200",
  proposta_enviada: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  fechado: "bg-green-500/10 text-green-700 border-green-200",
  perdido: "bg-red-500/10 text-red-700 border-red-200",
};

const proposalStatusColors: Record<string, string> = {
  rascunho: "bg-secondary text-secondary-foreground",
  enviada: "",
  aprovada: "bg-emerald-100 text-emerald-800",
  rejeitada: "bg-destructive text-destructive-foreground",
};

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { leads, isLoading: leadsLoading, convertToClient } = useLeads();
  const { logos, founderPhotos, portfolio, feedbacks, texts, contacts } = useProposalAssets();
  const { blocks: proposalBlocks } = useProposalBlocks();
  const { contracts } = useContracts();
  const [convertProposal, setConvertProposal] = useState<any>(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const lead = useMemo(() => leads.find((l) => l.id === id), [leads, id]);

  const { data: proposals = [], isLoading: proposalsLoading } = useQuery({
    queryKey: ["proposals", "by-lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: leadContracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["contracts", "by-lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const duplicate = useMutation({
    mutationFn: async (proposal: any) => {
      const { id: _id, created_at, updated_at, ...rest } = proposal;
      const { error } = await supabase.from("proposals").insert({
        ...rest,
        status: "rascunho",
        proposal_number: null,
        sent_at: null,
        approved_at: null,
        rejected_at: null,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", "by-lead", id] });
      toast({ title: "Proposta duplicada com sucesso" });
    },
    onError: (e: Error) => toast({ title: "Erro ao duplicar", description: e.message, variant: "destructive" }),
  });

  const handleGeneratePdf = useCallback(async (proposal: any) => {
    try {
      toast({ title: "Gerando PDF…" });
      const logo = logos[0]?.file_url || "";
      const founderPhoto = founderPhotos[0]?.file_url || "";
      const portfolioItems = (proposal.portfolio_projects as any[]) || portfolio.map((p) => ({
        image: p.file_url || "", title: p.project_name || p.name, category: p.project_category || "",
      }));
      const feedbackItems = (proposal.feedback_items as any[]) || feedbacks.map((f) => ({
        text: f.description || "", author: f.name,
      }));
      const aboutText = texts.find((t) => t.name === "about")?.description || "";
      const contactInfo = contacts[0] || null;

      const discountCashPercent = proposal.discount_percent ?? 0;
      const priceFull = proposal.price_full ?? 0;
      const priceAtVista = discountCashPercent > 0 ? priceFull * (1 - discountCashPercent / 100) : null;

      const pageProps: ProposalPageProps = {
        clientName: proposal.client_name || lead?.name || "",
        projectName: proposal.project_name || "",
        scopeDescription: proposal.scope_description || "",
        servicesIncluded: proposal.services_included || "ambos",
        logoUrl: logo,
        logoOnDarkUrl: pickProposalLogos(logos).onDark,
        logoOnLightUrl: pickProposalLogos(logos).onLight,
        founderPhotos,
        aboutText,
        contactPhone1: contactInfo?.description || "",
        contactInstagram: (contactInfo?.metadata as any)?.instagram || "",
        ambientes: (proposal.ambientes as string[]) || [],
        totalArea: proposal.total_area ?? undefined,
        etapasAtivas: (proposal.etapas_ativas as string[]) || [],
        customBlockKeys: Array.isArray(proposal.custom_block_keys) ? (proposal.custom_block_keys as string[]) : null,
        timelineBriefing: proposal.timeline_briefing ?? undefined,
        timelineStudy: proposal.timeline_study ?? undefined,
        timelineAnteprojeto: proposal.timeline_anteprojeto ?? undefined,
        timelineBudget: proposal.timeline_budget ?? undefined,
        timelinePriorities: proposal.timeline_priorities ?? undefined,
        timelineMobilization: proposal.timeline_mobilization ?? undefined,
        timelineConstruction: proposal.timeline_construction ?? undefined,
        timelineFiscalization: proposal.timeline_fiscalization ?? undefined,
        priceFull: priceFull || undefined,
        priceCash: priceAtVista ?? undefined,
        priceNote: proposal.price_note || undefined,
        installmentsCount: proposal.installments_count ?? undefined,
        installmentEntry: proposal.installment_entry ?? undefined,
        installmentValue: proposal.installment_value ?? undefined,
        validUntil: proposal.valid_until || undefined,
        portfolioCards: portfolioItems.map((p: any) => ({ id: p.image || "", nome: p.title || "", foto_url: p.image || "" })),
        feedbackImages: feedbacks,
        portfolioImages: portfolio,
      };

      const pages = buildProposalPages({
        data: pageProps,
        blocks: proposalBlocks,
        portfolioImages: portfolio,
        feedbackImages: feedbacks,
        selectedPortfolioProjects: portfolio.map(p => p.id),
        selectedFeedbackIds: feedbacks.map(f => f.id),
      });
      await waitForFonts();

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      document.body.appendChild(container);

      const renderPage = (page: React.ReactElement, index: number) => {
        const wrapper = document.createElement("div");
        wrapper.id = `pdf-page-${index}`;
        container.appendChild(wrapper);
        const root = ReactDOM.createRoot(wrapper);
        flushSync(() => root.render(page));
        return wrapper.firstElementChild as HTMLElement | null;
      };

      const blob = await generateProposalPdf(pages, renderPage);
      document.body.removeChild(container);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposta-${proposal.project_name || "sem-nome"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao gerar PDF", description: err.message, variant: "destructive" });
    }
  }, [logos, founderPhotos, portfolio, feedbacks, texts, contacts, lead, proposalBlocks]);

  if (leadsLoading || proposalsLoading || contractsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/leads/pipeline")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <p className="text-muted-foreground">Lead não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs text-muted-foreground [&>li>svg]:size-3">
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/leads/pipeline">Comercial</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/leads/pipeline">Leads</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary font-medium">{lead.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/leads/pipeline")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-display font-semibold leading-tight">{lead.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {lead.phone && <span>{lead.phone}</span>}
            {lead.email && <span>• {lead.email}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline" className={`text-xs ${statusColors[lead.status]}`}>
              {leadStatusLabels[lead.status] || lead.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {typeLabels[lead.project_type] || lead.project_type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {originLabels[lead.origin] || lead.origin}
            </Badge>
          </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setMsgOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-1" /> Enviar Mensagem
          </Button>
        </div>

      {/* Proposals Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Propostas</CardTitle>
          <Button size="sm" onClick={() => navigate("/leads/proposals")}>
            <Plus className="h-4 w-4 mr-1" /> Criar proposta
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-4">Nenhuma proposta gerada para este lead ainda.</p>
              <Button onClick={() => navigate("/leads/proposals")}>
                <Plus className="h-4 w-4 mr-1" /> Criar proposta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.project_name || "Sem nome"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(p.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">{formatCurrency(p.price_full)}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${proposalStatusColors[p.status] || ""}`}
                        style={p.status === "enviada" ? { backgroundColor: C.navy, color: "white" } : {}}
                      >
                        {p.status === "rascunho" ? "Rascunho" : p.status === "enviada" ? "Enviada" : p.status === "aprovada" ? "Aprovada" : p.status === "rejeitada" ? "Rejeitada" : p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Visualizar"
                          onClick={() => navigate("/leads/proposals", { state: { editProposalId: p.id } })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Duplicar"
                          onClick={() => duplicate.mutate(p)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Gerar PDF"
                          onClick={() => handleGeneratePdf(p)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {p.status === "enviada" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600"
                            title="Aprovar"
                            onClick={async () => {
                              await supabase.from("proposals").update({ status: "aprovada", approved_at: new Date().toISOString() }).eq("id", p.id);
                              queryClient.invalidateQueries({ queryKey: ["proposals", "by-lead", id] });
                              setConvertProposal(p);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contracts Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Contratos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leadContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum contrato vinculado a este lead.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadContracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title || "Sem título"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${
                          c.status === "rascunho" ? "bg-secondary text-secondary-foreground" :
                          c.status === "assinado" ? "bg-emerald-100 text-emerald-800" :
                          c.status === "cancelado" ? "bg-destructive text-destructive-foreground" : ""
                        }`}
                        style={c.status === "enviado" ? { backgroundColor: C.navy, color: "white" } : {}}
                      >
                        {c.status === "rascunho" ? "Rascunho" : c.status === "enviado" ? "Enviado" : c.status === "assinado" ? "Assinado" : c.status === "cancelado" ? "Cancelado" : c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Editar"
                        onClick={() => navigate("/leads/contracts", { state: { editContractId: c.id } })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
                const year = new Date().getFullYear();
                const thisYear = (contracts || []).filter((c: any) => c.contract_number?.startsWith(`CONTR-${year}`));
                const contractNumber = `CONTR-${year}-${String(thisYear.length + 1).padStart(3, "0")}`;

                // Format ambientes from proposal
                const ambientesRaw = (convertProposal as any).ambientes;
                let environmentsText = "";
                if (Array.isArray(ambientesRaw) && ambientesRaw.length > 0) {
                  environmentsText = ambientesRaw.map((a: any) => typeof a === "string" ? a : a?.name || a?.ambiente || "").filter(Boolean).join(", ");
                }

                const { data, error } = await supabase.from("contracts").insert({
                  user_id: user.id,
                  proposal_id: convertProposal.id,
                  contract_number: contractNumber,
                  title: convertProposal.project_name || null,
                  value: convertProposal.price_full || null,
                  payment_conditions: convertProposal.payment_conditions || null,
                  service_description: convertProposal.scope_description || null,
                  start_date: convertProposal.valid_until || null,
                  estimated_duration: convertProposal.estimated_duration || null,
                  client_name: lead?.name || null,
                  client_email: lead?.email || null,
                  client_phone: lead?.phone || null,
                  lead_id: convertProposal.lead_id || lead?.id || null,
                  status: "rascunho",
                  environments: environmentsText || null,
                  total_area: (convertProposal as any).total_area || null,
                } as any).select("id").single();

                if (error) throw error;

                // Insert revenue payment
                await supabase.from("payments").insert({
                  user_id: user.id,
                  project_id: null,
                  description: `Receita: ${convertProposal.project_name || lead?.name}`,
                  value: convertProposal.price_full || 0,
                  status: "pendente" as any,
                  payment_method: convertProposal.payment_method || null,
                  supplier_name: "Receita Escritório",
                } as any);

                // Auto-convert lead to client
                if (lead && !lead.converted_client_id) {
                  convertToClient.mutate(lead);
                }

                setConvertProposal(null);
                queryClient.invalidateQueries({ queryKey: ["contracts", "by-lead", id] });
                navigate("/leads/contracts", { state: { editContractId: data.id } });
                toast({ title: "Contrato criado a partir da proposta. Revise antes de enviar." });
              } catch (err: any) {
                toast({ title: "Erro ao criar contrato", description: err.message, variant: "destructive" });
              }
            }}>Converter em Contrato</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {lead && (
        <SendMessageModal
          open={msgOpen}
          onOpenChange={setMsgOpen}
          category={["lead", "proposta"]}
          phone={lead.phone}
          context={{
            nome_cliente: lead.name,
            telefone: lead.phone,
            tipo_projeto: typeLabels[lead.project_type] || lead.project_type,
          }}
        />
      )}
    </div>
  );
}
