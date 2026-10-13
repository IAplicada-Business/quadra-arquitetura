import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useProposalAssets } from "@/hooks/useProposalAssets";
import { useProposalBlocks } from "@/hooks/useProposalBlocks";
import { flowStepsFromBlocks, isCustomBlock, FLOW_STEP_TIMELINE, type FlowTimelineKey } from "@/lib/proposalBlocks";
import { customTypeDef } from "@/lib/proposalCustomBlocks";
import { useLeads } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Eye, FileText, Save } from "lucide-react";

export interface ProposalFormData {
  lead_id: string;
  client_name: string;
  project_name: string;
  project_type: string;
  scope_description: string;
  services_included: string;
  timeline_briefing: number;
  timeline_study: number;
  timeline_budget: number;
  timeline_priorities: number;
  timeline_construction: number;
  timeline_anteprojeto: number | null;
  timeline_mobilization: number | null;
  timeline_fiscalization: number | null;
  price_full: number | null;
  discount_cash_percent: number | null;
  installments_count: number | null;
  installment_entry: number | null;
  installment_value: number | null;
  price_note: string;
  portfolio_projects: string[];
  portfolio_cards: { id: string; nome: string; foto_url: string; legenda: string }[];
  feedback_items: string[];
  ambientes: string[];
  total_area: number | null;
  etapas_ativas: string[];
  /**
   * Blocos personalizados do PDF escolhidos nesta proposta.
   * null = sem escolha salva: entram os marcados "Incluir por padrão".
   */
  custom_block_keys: string[] | null;
  valid_until: string | null;
}

// As etapas do fluxo vêm do bloco "Escopo e Processo" (Configurações →
// Proposta → Blocos do PDF). As 7 originais têm campo de prazo na
// proposta; etapas novas só entram/saem (o prazo é o texto do bloco).
const TIMELINE_FIELD: Record<FlowTimelineKey, { field: keyof ProposalFormData; label: string; nullable: boolean }> = {
  briefing: { field: "timeline_briefing", label: "Briefing (dias)", nullable: false },
  study: { field: "timeline_study", label: "Estudo preliminar (dias)", nullable: false },
  anteprojeto: { field: "timeline_anteprojeto", label: "Anteprojeto (dias)", nullable: true },
  budget: { field: "timeline_budget", label: "Orçamento executivo (dias)", nullable: false },
  priorities: { field: "timeline_priorities", label: "Reunião prioridades (dias)", nullable: false },
  mobilization: { field: "timeline_mobilization", label: "Mobilização de obra (dias)", nullable: true },
  fiscalization: { field: "timeline_fiscalization", label: "Conferência e fiscalização (dias)", nullable: true },
};
const ALL_ETAPAS = Object.keys(FLOW_STEP_TIMELINE);

const DEFAULT_SCOPE = `Nosso papel será desenvolver o **projeto executivo** dos espaços definidos com todos os desenhos necessários para a realização da obra, considerando todas as ideias discutidas e aprovadas pelo cliente. Dando seguimento com **o gerenciamento**, que inclui a administração de todos os fornecedores envolvidos, cronograma, gestão de pagamentos, vistorias e conferências. Damos assistência no pós obra para garantir que tudo segue funcionando como entregue ou se necessário algum ajuste.`;

const DEFAULT_PRICE_NOTE = "*Neste valor, não está incluso execução de obra (mão de obra e materiais)";

interface Props {
  initialData?: Partial<ProposalFormData>;
  onSave: (data: ProposalFormData, status: string) => void;
  onPreview: (data: ProposalFormData) => void;
  onGeneratePdf: (data: ProposalFormData) => void;
  saving?: boolean;
}

export default function ProposalFormNew({ initialData, onSave, onPreview, onGeneratePdf, saving }: Props) {
  const { leads } = useLeads();
  const { portfolio, feedbacks } = useProposalAssets();
  const { blocks: proposalBlocks, isFetched: blocksFetched } = useProposalBlocks();
  const flowSteps = useMemo(() => flowStepsFromBlocks(proposalBlocks), [proposalBlocks]);
  const allStepKeys = useMemo(() => flowSteps.map((s) => s.key!), [flowSteps]);
  const [etapasTouched, setEtapasTouched] = useState(false);

  // Fetch user's projects for portfolio cards
  const { data: userProjects = [] } = useQuery({
    queryKey: ["projects-for-portfolio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const [data, setData] = useState<ProposalFormData>({
    lead_id: initialData?.lead_id || "",
    client_name: initialData?.client_name || "",
    project_name: initialData?.project_name || "",
    project_type: initialData?.project_type || "residencial",
    scope_description: initialData?.scope_description || DEFAULT_SCOPE,
    services_included: initialData?.services_included || "ambos",
    timeline_briefing: initialData?.timeline_briefing ?? 4,
    timeline_study: initialData?.timeline_study ?? 15,
    timeline_budget: initialData?.timeline_budget ?? 7,
    timeline_priorities: initialData?.timeline_priorities ?? 7,
    timeline_construction: initialData?.timeline_construction ?? 25,
    timeline_anteprojeto: initialData?.timeline_anteprojeto ?? null,
    timeline_mobilization: initialData?.timeline_mobilization ?? null,
    timeline_fiscalization: initialData?.timeline_fiscalization ?? null,
    price_full: initialData?.price_full ?? null,
    discount_cash_percent: initialData?.discount_cash_percent ?? null,
    installments_count: initialData?.installments_count ?? null,
    installment_entry: initialData?.installment_entry ?? null,
    installment_value: initialData?.installment_value ?? null,
    price_note: initialData?.price_note || DEFAULT_PRICE_NOTE,
    portfolio_projects: initialData?.portfolio_projects || [],
    portfolio_cards: initialData?.portfolio_cards || [],
    feedback_items: initialData?.feedback_items || [],
    ambientes: initialData?.ambientes || [],
    total_area: initialData?.total_area ?? null,
    etapas_ativas: initialData?.etapas_ativas || [...ALL_ETAPAS],
    custom_block_keys: initialData?.custom_block_keys ?? null,
    valid_until: initialData?.valid_until ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  // Proposta nova: quando o bloco carrega, marca todas as etapas configuradas
  // (inclusive as que o time criou), a menos que o usuário já tenha mexido.
  useEffect(() => {
    if (!blocksFetched || etapasTouched || initialData?.etapas_ativas) return;
    setData(prev => ({ ...prev, etapas_ativas: [...allStepKeys] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksFetched, allStepKeys.join("|")]);


  // Blocos personalizados ativos (Configurações → Proposta → Blocos do PDF).
  const customBlocks = useMemo(() => proposalBlocks.filter(isCustomBlock).filter((b) => b.is_active), [proposalBlocks]);
  const customDefaultKeys = useMemo(() => customBlocks.filter((b) => b.content.includeByDefault).map((b) => b.key), [customBlocks]);
  // Sem escolha salva (proposta nova ou antiga), valem os "Incluir por padrão".
  const effectiveCustomKeys = data.custom_block_keys ?? customDefaultKeys;
  /** Dados como saem do formulário: a escolha de blocos fica gravada. */
  const withCustomKeys = (d: ProposalFormData): ProposalFormData => ({ ...d, custom_block_keys: d.custom_block_keys ?? customDefaultKeys });
  const toggleCustomBlock = (key: string) => {
    setData(prev => {
      const current = prev.custom_block_keys ?? customDefaultKeys;
      return { ...prev, custom_block_keys: current.includes(key) ? current.filter(k => k !== key) : [...current, key] };
    });
  };

  const set = <K extends keyof ProposalFormData>(key: K, val: ProposalFormData[K]) =>
    setData(prev => ({ ...prev, [key]: val }));

  // Auto-calc cash price from discount
  const calcPriceCash = useMemo(() => {
    if (!data.price_full || !data.discount_cash_percent || data.discount_cash_percent <= 0) return null;
    return data.price_full * (1 - data.discount_cash_percent / 100);
  }, [data.price_full, data.discount_cash_percent]);

  // Auto-calc installment value
  const calcInstallmentValue = useMemo(() => {
    if (!data.price_full || !data.installments_count) return null;
    const entry = data.installment_entry || 0;
    return (data.price_full - entry) / data.installments_count;
  }, [data.price_full, data.installments_count, data.installment_entry]);

  // Auto-fill client name from lead
  const handleLeadChange = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    setData(prev => ({
      ...prev,
      lead_id: leadId,
      client_name: lead?.name || prev.client_name,
    }));
  };

  // Portfolio groups
  const portfolioGroups = useMemo(() => {
    const groups = new Map<string, typeof portfolio>();
    portfolio.forEach(p => {
      const key = p.project_name || "Sem nome";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return groups;
  }, [portfolio]);

  const togglePortfolioProject = (projectName: string) => {
    setData(prev => ({
      ...prev,
      portfolio_projects: prev.portfolio_projects.includes(projectName)
        ? prev.portfolio_projects.filter(p => p !== projectName)
        : [...prev.portfolio_projects, projectName],
    }));
  };

  const toggleFeedback = (id: string) => {
    setData(prev => ({
      ...prev,
      feedback_items: prev.feedback_items.includes(id)
        ? prev.feedback_items.filter(f => f !== id)
        : [...prev.feedback_items, id],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Client */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Dados do Cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Lead vinculado *</Label>
            <Select value={data.lead_id} onValueChange={handleLeadChange}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {leads.map(l => <SelectItem key={l.id} value={l.id}>{l.name} — {l.phone}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nome do cliente *</Label>
            <Input value={data.client_name} onChange={e => set("client_name", e.target.value)} placeholder="Ex: Renata Pacheco" />
          </div>
          <div className="space-y-1.5">
            <Label>Nome do projeto *</Label>
            <Input value={data.project_name} onChange={e => set("project_name", e.target.value)} placeholder="Ex: Reforma Sala e Cozinha — Apto Vila da Serra" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de projeto</Label>
            <Select value={data.project_type} onValueChange={v => set("project_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residencial">Residencial</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="saude">Saúde</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Validade da proposta</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !data.valid_until && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.valid_until ? format(new Date(data.valid_until + "T12:00:00"), "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data.valid_until ? new Date(data.valid_until + "T12:00:00") : undefined}
                  onSelect={(date) => set("valid_until", date ? date.toISOString().slice(0, 10) : null)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Scope */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Escopo do Serviço</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Descrição do escopo</Label>
            <Textarea value={data.scope_description} onChange={e => set("scope_description", e.target.value)} rows={5} />
            <p className="text-xs text-muted-foreground">Use **texto** para <strong>negrito</strong>.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Serviços inclusos</Label>
            <Select value={data.services_included} onValueChange={v => set("services_included", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="projeto">Projeto Executivo</SelectItem>
                <SelectItem value="gerenciamento">Gerenciamento de Obra</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Ambientes */}
      <Card>
        <CardHeader><CardTitle className="text-base">3. Ambientes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ambientes contemplados</Label>
            <Textarea
              value={data.ambientes.join("\n")}
              onChange={e => set("ambientes", e.target.value.split("\n").filter(Boolean))}
              rows={5}
              placeholder="Digite os ambientes, um por linha&#10;Ex: Sala de estar&#10;Cozinha&#10;Suíte master"
            />
            <p className="text-xs text-muted-foreground">Um ambiente por linha</p>
          </div>
          <div className="space-y-1.5">
            <Label>Metragem total (m²)</Label>
            <Input
              type="number"
              value={data.total_area ?? ""}
              onChange={e => set("total_area", e.target.value ? Number(e.target.value) : null)}
              placeholder="Ex: 180"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Etapas */}
      <Card>
        <CardHeader><CardTitle className="text-base">4. Etapas do Projeto</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione as etapas que compõem esta proposta. A lista e os textos das etapas são editados em Configurações → Proposta → Blocos do PDF.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setEtapasTouched(true); set("etapas_ativas", [...allStepKeys]); }}>
            Selecionar todas
          </Button>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {flowSteps.map(step => {
              const etapa = step.key!;
              return (
                <div key={etapa} className="flex items-center gap-2 p-2 border rounded">
                  <Checkbox
                    checked={data.etapas_ativas.includes(etapa)}
                    aria-label={`Etapa ${step.title.replace(/\n/g, " ")}`}
                    onCheckedChange={() => {
                      setEtapasTouched(true);
                      setData(prev => ({
                        ...prev,
                        etapas_ativas: prev.etapas_ativas.includes(etapa)
                          ? prev.etapas_ativas.filter(e => e !== etapa)
                          : [...prev.etapas_ativas, etapa],
                      }));
                    }}
                  />
                  <span className="text-sm">{step.title.replace(/\n/g, " ")}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Blocos personalizados do PDF */}
      {customBlocks.length > 0 && (
        <Card data-testid="proposal-custom-blocks">
          <CardHeader><CardTitle className="text-base">Blocos personalizados do PDF</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha quais blocos criados pela equipe entram nesta proposta (estudos de viabilidade, linhas do tempo, cartões). Eles são editados em Configurações → Proposta → Blocos do PDF.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {customBlocks.map(block => (
                <label key={block.key} className="flex items-start gap-2 p-2 border rounded cursor-pointer">
                  <Checkbox
                    checked={effectiveCustomKeys.includes(block.key)}
                    aria-label={`Incluir bloco ${block.label}`}
                    onCheckedChange={() => toggleCustomBlock(block.key)}
                  />
                  <span className="text-sm">
                    {block.label}
                    <span className="block text-xs text-muted-foreground">{customTypeDef(block.type).label}</span>
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">5. Prazos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Os campos exibidos seguem as etapas selecionadas acima.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {flowSteps
              .filter(step => step.key && FLOW_STEP_TIMELINE[step.key] && data.etapas_ativas.includes(step.key))
              .map(step => TIMELINE_FIELD[FLOW_STEP_TIMELINE[step.key!]])
              .map(item => {
              const isNullable = item.nullable;
              return (
                <div key={item.field} className="space-y-1.5">
                  <Label>{item.label}</Label>
                  <Input
                    type="number"
                    value={isNullable ? ((data[item.field] as number | null) ?? "") : (data[item.field] as number)}
                    onChange={e => set(item.field, isNullable && !e.target.value ? null : Number(e.target.value) as any)}
                  />
                </div>
              );
            })}
            <div className="space-y-1.5">
              <Label>Obra (dias trabalhados)</Label>
              <Input type="number" value={data.timeline_construction} onChange={e => set("timeline_construction", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Values */}
      <Card>
        <CardHeader><CardTitle className="text-base">5. Valores</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Valor cheio (R$) *</Label>
              <Input type="number" value={data.price_full ?? ""} onChange={e => set("price_full", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Desconto à vista (%)</Label>
              <Input type="number" value={data.discount_cash_percent ?? ""} onChange={e => set("discount_cash_percent", e.target.value ? Number(e.target.value) : null)} placeholder="Ex: 10" />
              {calcPriceCash != null && (
                <p className="text-xs text-muted-foreground">Valor à vista: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calcPriceCash)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Nº de parcelas</Label>
              <Input type="number" value={data.installments_count ?? ""} onChange={e => set("installments_count", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Entrada (R$)</Label>
              <Input type="number" value={data.installment_entry ?? ""} onChange={e => set("installment_entry", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor parcela (R$)</Label>
              <Input type="number" value={calcInstallmentValue?.toFixed(2) ?? data.installment_value ?? ""} readOnly className="bg-muted" />
              {calcInstallmentValue && data.installments_count && (
                <p className="text-xs text-muted-foreground">
                  Parcelas: {data.installments_count}x de R$ {calcInstallmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  {(data.installment_entry ?? 0) > 0 && ` | Entrada: R$ ${data.installment_entry!.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nota sobre valores</Label>
            <Textarea value={data.price_note} onChange={e => set("price_note", e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Portfolio Cards (for PDF page) */}
      <Card>
        <CardHeader><CardTitle className="text-base">7. Portfólio no PDF</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Selecione até 4 projetos para exibir na página "Nossos Projetos" do PDF. Adicione uma legenda opcional.</p>
          {userProjects.length > 0 ? (
            <div className="space-y-3">
              {userProjects.map(proj => {
                const isSelected = data.portfolio_cards.some(c => c.id === proj.id);
                const cardIndex = data.portfolio_cards.findIndex(c => c.id === proj.id);
                return (
                  <div key={proj.id} className="flex items-start gap-2 p-2 border rounded">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        setData(prev => {
                          if (isSelected) {
                            return { ...prev, portfolio_cards: prev.portfolio_cards.filter(c => c.id !== proj.id) };
                          }
                          if (prev.portfolio_cards.length >= 4) return prev;
                          return { ...prev, portfolio_cards: [...prev.portfolio_cards, { id: proj.id, nome: proj.name, foto_url: "", legenda: "" }] };
                        });
                      }}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{proj.name}</p>
                      {isSelected && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="URL da foto"
                            value={data.portfolio_cards[cardIndex]?.foto_url || ""}
                            onChange={e => {
                              setData(prev => {
                                const cards = [...prev.portfolio_cards];
                                cards[cardIndex] = { ...cards[cardIndex], foto_url: e.target.value };
                                return { ...prev, portfolio_cards: cards };
                              });
                            }}
                            className="text-xs"
                          />
                          <Input
                            placeholder="Legenda (opcional)"
                            value={data.portfolio_cards[cardIndex]?.legenda || ""}
                            onChange={e => {
                              setData(prev => {
                                const cards = [...prev.portfolio_cards];
                                cards[cardIndex] = { ...cards[cardIndex], legenda: e.target.value };
                                return { ...prev, portfolio_cards: cards };
                              });
                            }}
                            className="text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum projeto cadastrado.</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Portfolio Assets & Feedbacks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">8. Portfólio de Assets e Feedbacks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {portfolioGroups.size > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold">Projetos do portfólio</Label>
              <Button variant="outline" size="sm" onClick={() => setData(prev => ({ ...prev, portfolio_projects: Array.from(portfolioGroups.keys()) }))}>
                Selecionar todos
              </Button>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Array.from(portfolioGroups.entries()).map(([name, items]) => (
                  <div key={name} className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox
                      checked={data.portfolio_projects.includes(name)}
                      onCheckedChange={() => togglePortfolioProject(name)}
                    />
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{items.length} fotos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {feedbacks.length > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold">Feedbacks</Label>
              <Button variant="outline" size="sm" onClick={() => setData(prev => ({ ...prev, feedback_items: feedbacks.map(f => f.id) }))}>
                Selecionar todos
              </Button>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {feedbacks.map(f => (
                  <div key={f.id} className="relative cursor-pointer" onClick={() => toggleFeedback(f.id)}>
                    <img src={f.file_url || ""} alt={f.name} className={`h-24 w-full object-cover rounded border-2 ${data.feedback_items.includes(f.id) ? "border-primary" : "border-transparent"}`} />
                    {data.feedback_items.includes(f.id) && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">✓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {portfolioGroups.size === 0 && feedbacks.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum asset cadastrado. Acesse Configurações → Proposta para adicionar portfólio e feedbacks.</p>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Actions */}
      <div className="flex gap-3 justify-end sticky bottom-0 bg-background py-4 border-t">
        <Button variant="outline" onClick={() => onSave({ ...withCustomKeys(data), installment_value: calcInstallmentValue ?? data.installment_value }, "rascunho")} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> Salvar Rascunho
        </Button>
        <Button variant="secondary" onClick={() => onPreview({ ...withCustomKeys(data), installment_value: calcInstallmentValue ?? data.installment_value })}>
          <Eye className="h-4 w-4 mr-1" /> Preview
        </Button>
        <Button onClick={() => onGeneratePdf({ ...withCustomKeys(data), installment_value: calcInstallmentValue ?? data.installment_value })} disabled={saving}>
          <FileText className="h-4 w-4 mr-1" /> Gerar PDF
        </Button>
      </div>
    </div>
  );
}
