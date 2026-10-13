import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Phone, Mail, ArrowRight, Trash2, Pencil, UserCheck,
  LayoutGrid, List, Search, Filter, Users, CalendarCheck, TrendingUp, XCircle,
  BarChart3, GripVertical, MessageSquare, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLeads, LEAD_STATUSES, leadStatusLabels, Lead } from "@/hooks/useLeads";
import { useAcquisitionChannels } from "@/hooks/useAcquisitionChannels";
import { differenceInDays, subMonths, format, startOfMonth, startOfYear } from "date-fns";
import { pt } from "date-fns/locale";
import { SendMessageModal } from "@/components/messages/SendMessageModal";
import { ChannelBadge } from "@/components/leads/ChannelBadge";
import { ChannelMultiSelectFilter, NO_CHANNEL_VALUE } from "@/components/leads/ChannelMultiSelectFilter";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { PageTitle } from "@/components/layout/PageTitle";

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
  perdido_definitivo: "bg-red-500/10 text-red-700 border-red-200",
  backlog_recontato: "bg-orange-500/10 text-orange-700 border-orange-200",
  perdido: "bg-red-500/10 text-red-700 border-red-200",
};

const columnBorderColors: Record<string, string> = {
  novo: "border-blue-400",
  contato_feito: "border-amber-400",
  reuniao_agendada: "border-purple-400",
  proposta_enviada: "border-cyan-400",
  fechado: "border-green-400",
  perdido_definitivo: "border-red-400",
  backlog_recontato: "border-orange-400",
  perdido: "border-red-400",
};

// Status terminais (sem "próximo" no funil e excluídos do pipeline ativo)
const TERMINAL_STATUSES = new Set(["fechado", "perdido_definitivo", "backlog_recontato", "perdido"]);
const LOST_STATUSES = new Set(["perdido_definitivo", "perdido"]);

export default function LeadsPipeline() {
  const navigate = useNavigate();
  const leadsHook = useLeads();
  const { leads, isLoading, update, remove, convertToClient } = leadsHook;
  const { channels: allChannels } = useAcquisitionChannels();

  const [view, setView] = useState<"kanban" | "tabela" | "analise">("kanban");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterOrigin, setFilterOrigin] = useState("todos");
  const [filterPeriod, setFilterPeriod] = useState("todos");
  const [filterChannelIds, setFilterChannelIds] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Message modal state
  const [msgLead, setMsgLead] = useState<Lead | null>(null);

  // Drag-and-drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Sprint 7 — colunas colapsáveis (pedido na call: "colunas com
  // ocultação e expansão quando necessário"). Persistimos por sessão.
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("pipeline_collapsed_cols");
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });
  const toggleColumnCollapse = (status: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      try { localStorage.setItem("pipeline_collapsed_cols", JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = leads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) => l.name.toLowerCase().includes(q) || l.phone.includes(q) || (l.email && l.email.toLowerCase().includes(q)));
    }
    if (filterStatus !== "todos") result = result.filter((l) => l.status === filterStatus);
    if (filterOrigin !== "todos") result = result.filter((l) => l.origin === filterOrigin);
    if (filterChannelIds.length > 0) {
      result = result.filter((l) =>
        l.channel_id ? filterChannelIds.includes(l.channel_id) : filterChannelIds.includes(NO_CHANNEL_VALUE)
      );
    }
    if (filterPeriod !== "todos") {
      const now = new Date();
      result = result.filter((l) => {
        const d = new Date(l.created_at);
        if (filterPeriod === "este_mes") return d >= startOfMonth(now);
        if (filterPeriod === "ultimo_mes") return d >= startOfMonth(subMonths(now, 1)) && d < startOfMonth(now);
        if (filterPeriod === "3_meses") return d >= subMonths(now, 3);
        if (filterPeriod === "este_ano") return d >= startOfYear(now);
        return true;
      });
    }
    return result;
  }, [leads, search, filterStatus, filterOrigin, filterChannelIds, filterPeriod]);

  const openNew = () => {
    setEditingLead(null);
    setFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormOpen(true);
  };

  const moveStatus = (lead: Lead, newStatus: string) => {
    if (newStatus === "fechado" && !lead.converted_client_id) {
      convertToClient.mutate(lead);
    } else {
      update.mutate({ id: lead.id, status: newStatus });
    }
  };

  const getNextStatus = (status: string): string | null => {
    if (TERMINAL_STATUSES.has(status)) return null;
    const activeFlow = ["novo", "contato_feito", "reuniao_agendada", "proposta_enviada", "fechado"];
    const idx = activeFlow.indexOf(status);
    if (idx < 0 || idx >= activeFlow.length - 1) return null;
    return activeFlow[idx + 1];
  };

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(leadId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStatus(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback((status: string) => {
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, status: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      if (dragOverStatus === status) setDragOverStatus(null);
    }
  }, [dragOverStatus]);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverStatus(null);
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    moveStatus(lead, newStatus);
  }, [leads, update, convertToClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 animate-fade-in flex flex-col ${view === "kanban" ? "flex-1 min-h-0" : ""}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <PageTitle
            title="Pipeline de Leads"
            description="Funil comercial: arraste os cards entre as etapas, do primeiro contato ao fechamento."
            meta={filtered.length < leads.length ? `${filtered.length} de ${leads.length}` : undefined}
          />
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="h-9">
              <TabsTrigger value="kanban" className="px-3"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="tabela" className="px-3"><List className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="analise" className="px-3"><BarChart3 className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      {view !== "analise" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, telefone ou email…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{leadStatusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Origens</SelectItem>
              {Object.entries(originLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ChannelMultiSelectFilter channels={allChannels} selected={filterChannelIds} onChange={setFilterChannelIds} />
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo o período</SelectItem>
              <SelectItem value="este_mes">Este mês</SelectItem>
              <SelectItem value="ultimo_mes">Mês passado</SelectItem>
              <SelectItem value="3_meses">Últimos 3 meses</SelectItem>
              <SelectItem value="este_ano">Este ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Metrics Cards */}
      {view !== "analise" && (() => {
        const total = leads.length;
        const novos = leads.filter((l) => l.status === "novo").length;
        const reunioes = leads.filter((l) => l.status === "reuniao_agendada").length;
        const fechados = leads.filter((l) => l.status === "fechado").length;
        const perdidos = leads.filter((l) => LOST_STATUSES.has(l.status)).length;
        const backlog = leads.filter((l) => l.status === "backlog_recontato").length;
        const conversionRate = total > 0 ? Math.round((fechados / total) * 100) : 0;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-full text-blue-600"><Users className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Leads</p>
                  <p className="text-xl font-bold text-blue-700">{total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 border-amber-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-full text-amber-600"><Plus className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Novos</p>
                  <p className="text-xl font-bold text-amber-700">{novos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50/50 border-purple-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 rounded-full text-purple-600"><CalendarCheck className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Reuniões</p>
                  <p className="text-xl font-bold text-purple-700">{reunioes}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 border-green-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-green-100 rounded-full text-green-600"><TrendingUp className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Conversão</p>
                  <p className="text-xl font-bold text-green-700">{conversionRate}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50/50 border-orange-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 rounded-full text-orange-600"><ArrowRight className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Backlog</p>
                  <p className="text-xl font-bold text-orange-700">{backlog}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 border-red-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-full text-red-600"><XCircle className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Perdidos</p>
                  <p className="text-xl font-bold text-red-700">{perdidos}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {LEAD_STATUSES.map((status) => {
            const columnLeads = filtered.filter((l) => l.status === status);
            // Hide legacy "perdido" column when empty — it's a migration artifact
            if (status === "perdido" && columnLeads.length === 0) return null;
            const isOver = dragOverStatus === status;
            const isCollapsed = collapsedColumns.has(status);
            // Coluna colapsada vira faixa vertical estreita que ainda
            // aceita drop (atalho para empilhar leads rapidamente).
            if (isCollapsed) {
              return (
                <div
                  key={status}
                  className={`w-10 flex-shrink-0 flex flex-col rounded-lg border ${statusColors[status]} ${isOver ? `border-2 border-dashed ${columnBorderColors[status]}` : ""} cursor-pointer hover:bg-muted/40 transition-colors`}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnter(status)}
                  onDragLeave={(e) => handleDragLeave(e, status)}
                  onDrop={(e) => handleDrop(e, status)}
                  onClick={() => toggleColumnCollapse(status)}
                  title={`Expandir ${leadStatusLabels[status]}`}
                >
                  <div className="flex flex-col items-center gap-2 py-3">
                    <ChevronsRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span
                      className="text-[11px] font-medium tracking-wider"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                    >
                      {leadStatusLabels[status]}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{columnLeads.length}</Badge>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={status}
                className="min-w-[250px] flex-1 flex-shrink-0 flex flex-col"
                onDragOver={handleDragOver}
                onDragEnter={() => handleDragEnter(status)}
                onDragLeave={(e) => handleDragLeave(e, status)}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className={`rounded-t-lg px-3 py-2 border ${statusColors[status]} font-medium text-sm flex items-center justify-between gap-2`}>
                  <span className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleColumnCollapse(status)}
                      className="hover:text-foreground"
                      title="Recolher coluna"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>
                    {leadStatusLabels[status]}
                  </span>
                  <Badge variant="outline" className="text-xs">{columnLeads.length}</Badge>
                </div>
                <div className={`border border-t-0 rounded-b-lg bg-muted/30 flex-1 p-2 space-y-2 overflow-y-auto transition-all duration-200 ${isOver ? `border-2 border-dashed ${columnBorderColors[status]} bg-accent/20` : ""}`}>
                  {columnLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      className={`shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${draggingId === lead.id ? "opacity-50" : ""}`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                            <p className="font-semibold text-sm leading-tight cursor-pointer hover:underline" onClick={() => navigate(`/leads/${lead.id}`)}>{lead.name}</p>
                          </div>
                          <div className="flex gap-0.5">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(lead)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => remove.mutate(lead.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
                          {lead.email && (
                            <span className="flex items-center gap-1 min-w-0"><Mail className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{lead.email}</span></span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">{typeLabels[lead.project_type] || lead.project_type}</Badge>
                          <ChannelBadge channel={allChannels.find((c) => c.id === lead.channel_id)} />
                          {lead.status === "fechado" && lead.converted_client_id && (
                            <Badge variant="secondary" className="text-[10px]">
                              <UserCheck className="h-3 w-3 mr-1" /> Cliente criado
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t">
                          <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" title="Enviar mensagem" onClick={() => setMsgLead(lead)}>
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          <div className="flex flex-wrap items-center gap-1 justify-end">
                            {lead.status === "proposta_enviada" && (
                              <Button size="sm" variant="secondary" className="text-xs h-7 flex-shrink-0" onClick={() => navigate("/leads/proposals")}>
                                Proposta
                              </Button>
                            )}
                            {!TERMINAL_STATUSES.has(lead.status) && (
                              <>
                                <Button size="sm" variant="ghost" className="text-xs h-7 flex-shrink-0 text-orange-700" title="Mover para backlog de recontato" onClick={() => moveStatus(lead, "backlog_recontato")}>
                                  Backlog
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs h-7 flex-shrink-0 text-destructive" title="Marcar como perdido definitivo" onClick={() => moveStatus(lead, "perdido_definitivo")}>
                                  Perdido
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      Arraste leads para cá
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === "tabela" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Origem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado</TableCell>
                  </TableRow>
                )}
                {filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => navigate(`/leads/${lead.id}`)}>{lead.name}</TableCell>
                    <TableCell className="text-sm">{lead.phone}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{lead.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusColors[lead.status]}`}>
                        {leadStatusLabels[lead.status] || lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="text-xs">{typeLabels[lead.project_type] || lead.project_type}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {originLabels[lead.origin] || lead.origin}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getNextStatus(lead.status) && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Avançar" onClick={() => moveStatus(lead, getNextStatus(lead.status)!)}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(lead)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(lead.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Analytics View */}
      {view === "analise" && <LeadAnalytics leads={leads} />}

      {/* Lead Form Dialog */}
      {formOpen && (
        <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} editingLead={editingLead} leadsHook={leadsHook} />
      )}
      {/* Send Message Modal */}
      {msgLead && (
        <SendMessageModal
          open={!!msgLead}
          onOpenChange={(o) => { if (!o) setMsgLead(null); }}
          category={["lead", "proposta"]}
          phone={msgLead.phone}
          context={{
            nome_cliente: msgLead.name,
            telefone: msgLead.phone,
            tipo_projeto: typeLabels[msgLead.project_type] || msgLead.project_type,
          }}
        />
      )}
    </div>
  );
}

/* ─── Analytics Component ─── */

function LeadAnalytics({ leads }: { leads: Lead[] }) {
  const analytics = useMemo(() => {
    const total = leads.length;
    const byStatus: Record<string, number> = {};
    LEAD_STATUSES.forEach((s) => { byStatus[s] = leads.filter((l) => l.status === s).length; });

    const fechados = byStatus["fechado"] || 0;
    const perdidos = (byStatus["perdido_definitivo"] || 0) + (byStatus["perdido"] || 0);
    const backlog = byStatus["backlog_recontato"] || 0;
    const conversionRate = total > 0 ? ((fechados / total) * 100) : 0;

    // Funnel conversion rates between stages (exclui status terminais não-fechado)
    const stages = LEAD_STATUSES.filter((s) => !LOST_STATUSES.has(s) && s !== "backlog_recontato");
    const funnelRates: { from: string; to: string; rate: number }[] = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const fromCount = stages.slice(i).reduce((sum, s) => sum + (byStatus[s] || 0), 0);
      const toCount = stages.slice(i + 1).reduce((sum, s) => sum + (byStatus[s] || 0), 0);
      funnelRates.push({
        from: stages[i],
        to: stages[i + 1],
        rate: fromCount > 0 ? (toCount / fromCount) * 100 : 0,
      });
    }

    // Avg days in pipeline for closed leads
    const closedLeads = leads.filter((l) => l.status === "fechado");
    const avgDays = closedLeads.length > 0
      ? Math.round(closedLeads.reduce((sum, l) => sum + differenceInDays(new Date(l.updated_at), new Date(l.created_at)), 0) / closedLeads.length)
      : 0;

    // By origin
    const origins = [...new Set(leads.map((l) => l.origin))];
    const byOrigin = origins.map((o) => {
      const oLeads = leads.filter((l) => l.origin === o);
      const oFechados = oLeads.filter((l) => l.status === "fechado").length;
      return { origin: o, total: oLeads.length, fechados: oFechados, rate: oLeads.length > 0 ? (oFechados / oLeads.length) * 100 : 0 };
    }).sort((a, b) => b.rate - a.rate);

    // By type
    const types = [...new Set(leads.map((l) => l.project_type))];
    const byType = types.map((t) => {
      const tLeads = leads.filter((l) => l.project_type === t);
      const tFechados = tLeads.filter((l) => l.status === "fechado").length;
      return { type: t, total: tLeads.length, fechados: tFechados, rate: tLeads.length > 0 ? (tFechados / tLeads.length) * 100 : 0 };
    }).sort((a, b) => b.rate - a.rate);

    // Monthly leads (last 6 months)
    const now = new Date();
    const monthly: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = startOfMonth(subMonths(now, i - 1));
      const count = leads.filter((l) => {
        const d = new Date(l.created_at);
        return d >= monthStart && d < monthEnd;
      }).length;
      monthly.push({ month: format(monthStart, "MMM yy", { locale: pt }), count });
    }
    const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);

    // Lost reasons (inclui status "perdido" legado + "perdido_definitivo")
    const lostLeads = leads.filter((l) => LOST_STATUSES.has(l.status) && l.lost_reason);
    const lostReasons: Record<string, number> = {};
    lostLeads.forEach((l) => {
      const reason = l.lost_reason || "Não informado";
      lostReasons[reason] = (lostReasons[reason] || 0) + 1;
    });

    return { total, byStatus, fechados, perdidos, backlog, conversionRate, funnelRates, avgDays, byOrigin, byType, monthly, maxMonthly, lostReasons, stages };
  }, [leads]);

  const funnelColors = ["bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-cyan-500", "bg-green-500"];

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhum lead cadastrado para análise.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conversion Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{analytics.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{analytics.fechados} de {analytics.total} leads convertidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Médio no Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.avgDays} <span className="text-lg text-muted-foreground font-normal">dias</span></p>
            <p className="text-xs text-muted-foreground mt-1">Para leads fechados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Perdidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{analytics.perdidos}</p>
            <p className="text-xs text-muted-foreground mt-1">{analytics.total > 0 ? ((analytics.perdidos / analytics.total) * 100).toFixed(1) : 0}% do total</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.stages.map((status, i) => {
            const count = analytics.byStatus[status] || 0;
            const pct = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
            return (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{leadStatusLabels[status]}</span>
                  <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${funnelColors[i] || "bg-primary"} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                {i < analytics.funnelRates.length && (
                  <p className="text-[11px] text-muted-foreground pl-1">
                    → {leadStatusLabels[analytics.funnelRates[i].to]}: {analytics.funnelRates[i].rate.toFixed(0)}% de conversão
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Origin */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversão por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Fechados</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.byOrigin.map((row, i) => (
                  <TableRow key={row.origin} className={i === 0 && row.rate > 0 ? "bg-green-50/50" : ""}>
                    <TableCell className="font-medium">{originLabels[row.origin] || row.origin}</TableCell>
                    <TableCell className="text-center">{row.total}</TableCell>
                    <TableCell className="text-center">{row.fechados}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.rate > 0 ? "default" : "outline"} className="text-xs">
                        {row.rate.toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversão por Tipo de Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Fechados</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.byType.map((row, i) => (
                  <TableRow key={row.type} className={i === 0 && row.rate > 0 ? "bg-green-50/50" : ""}>
                    <TableCell className="font-medium">{typeLabels[row.type] || row.type}</TableCell>
                    <TableCell className="text-center">{row.total}</TableCell>
                    <TableCell className="text-center">{row.fechados}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.rate > 0 ? "default" : "outline"} className="text-xs">
                        {row.rate.toFixed(0)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Monthly + Lost Reasons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por Mês (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {analytics.monthly.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{m.count}</span>
                  <div
                    className="w-full bg-primary/80 rounded-t transition-all duration-500"
                    style={{ height: `${(m.count / analytics.maxMonthly) * 100}%`, minHeight: m.count > 0 ? "4px" : "0px" }}
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">{m.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Motivos de Perda</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(analytics.lostReasons).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum motivo de perda registrado</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(analytics.lostReasons)
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">{reason}</span>
                      <Badge variant="destructive" className="text-xs ml-2">{count}</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
