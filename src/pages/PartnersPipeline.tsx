import { useState, useCallback, useMemo } from "react";
import { Plus, Phone, Pencil, Trash2, GripVertical, Handshake, Users, Star, Send, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLeads, PARTNER_STAGES, partnerStageLabels, ACTIVE_PARTNER_STAGES, type Lead } from "@/hooks/useLeads";
import { usePartnerReferrals } from "@/hooks/usePartnerReferrals";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { PartnerDetailSheet } from "@/components/leads/PartnerDetailSheet";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { PageTitle } from "@/components/layout/PageTitle";

const stageColors: Record<string, string> = {
  novo: "bg-blue-500/10 text-blue-700 border-blue-200",
  primeira_conversa: "bg-amber-500/10 text-amber-700 border-amber-200",
  parceria_ativa: "bg-green-500/10 text-green-700 border-green-200",
  trouxe_indicacao: "bg-purple-500/10 text-purple-700 border-purple-200",
  fidelizado: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  inativo: "bg-gray-500/10 text-gray-700 border-gray-200",
};

const stageBorderColors: Record<string, string> = {
  novo: "border-blue-400",
  primeira_conversa: "border-amber-400",
  parceria_ativa: "border-green-400",
  trouxe_indicacao: "border-purple-400",
  fidelizado: "border-cyan-400",
  inativo: "border-gray-400",
};

export default function PartnersPipeline() {
  const leadsHook = useLeads("parceiro");
  const { leads: partners, isLoading, update, remove } = leadsHook;
  const { getSummary } = usePartnerReferrals();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  // Painel lateral: abre pra qualquer parceiro, em qualquer etapa, sem
  // sair do kanban (pedido: ver indicações/obras agrupadas de relance).
  const [detailPartnerId, setDetailPartnerId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return partners;
    const q = search.toLowerCase();
    return partners.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q));
  }, [partners, search]);

  const openNew = () => { setEditingLead(null); setFormOpen(true); };
  const openEdit = (lead: Lead) => { setEditingLead(lead); setFormOpen(true); };

  const moveStage = (partner: Lead, newStage: string) => {
    update.mutate({ id: partner.id, partner_stage: newStage });
  };

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStage(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverStage(null);
    if (!id) return;
    const partner = partners.find((p) => p.id === id);
    if (!partner || partner.partner_stage === newStage) return;
    moveStage(partner, newStage);
  }, [partners]);

  const totalAtivos = partners.filter((p) => p.partner_stage && ACTIVE_PARTNER_STAGES.has(p.partner_stage)).length;
  const totalIndicacoes = partners.reduce((sum, p) => sum + getSummary(p.id).count, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <PageTitle
            icon={<Handshake />}
            title="Pipeline de Parceiros"
            description="Arquitetos e estúdios parceiros — pipeline independente do funil comercial."
          />
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo Parceiro
        </Button>
      </div>

      {/* Filters */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por estúdio ou telefone…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-full text-blue-600"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Parceiros</p>
              <p className="text-xl font-bold text-blue-700">{partners.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-full text-green-600"><Star className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Parceiros Ativos</p>
              <p className="text-xl font-bold text-green-700">{totalAtivos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 border-purple-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 rounded-full text-purple-600"><Send className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Indicações Trazidas</p>
              <p className="text-xl font-bold text-purple-700">{totalIndicacoes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
        {PARTNER_STAGES.map((stage) => {
          const columnPartners = filtered.filter((p) => p.partner_stage === stage);
          const isOver = dragOverStage === stage;
          return (
            <div
              key={stage}
              className="min-w-[260px] flex-1 flex-shrink-0 flex flex-col"
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverStage(stage)}
              onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className={`rounded-t-lg px-3 py-2 border ${stageColors[stage]} font-medium text-sm flex items-center justify-between gap-2`}>
                <span>{partnerStageLabels[stage]}</span>
                <Badge variant="outline" className="text-xs">{columnPartners.length}</Badge>
              </div>
              <div className={`border border-t-0 rounded-b-lg bg-muted/30 flex-1 p-2 space-y-2 overflow-y-auto transition-all duration-200 ${isOver ? `border-2 border-dashed ${stageBorderColors[stage]} bg-accent/20` : ""}`}>
                {columnPartners.map((partner) => {
                  const summary = getSummary(partner.id);
                  return (
                    <Card
                      key={partner.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, partner.id)}
                      onDragEnd={handleDragEnd}
                      className={`shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${draggingId === partner.id ? "opacity-50" : ""}`}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                            <p
                              className="font-semibold text-sm leading-tight cursor-pointer hover:underline"
                              onClick={() => setDetailPartnerId(partner.id)}
                            >
                              {partner.name}
                            </p>
                          </div>
                          <div className="flex gap-0.5">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(partner)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => remove.mutate(partner.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {partner.phone}
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t">
                          <span className="text-muted-foreground">Indicações trazidas</span>
                          <Badge variant="secondary" className="text-[10px]">{summary.count}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Última indicação</span>
                          <span>{summary.lastReferralAt ? format(new Date(summary.lastReferralAt), "dd/MM/yyyy", { locale: pt }) : "Nunca"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {columnPartners.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Arraste parceiros para cá
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {formOpen && (
        <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} editingLead={editingLead} lockType="parceiro" leadsHook={leadsHook} />
      )}
      <PartnerDetailSheet
        partnerId={detailPartnerId}
        onOpenChange={(open) => { if (!open) setDetailPartnerId(null); }}
        leadsHook={leadsHook}
      />
    </div>
  );
}
