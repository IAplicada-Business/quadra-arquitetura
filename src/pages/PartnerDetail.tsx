import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, Pencil, Handshake, Send } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useLeads, partnerStageLabels, leadStatusLabels, type Lead } from "@/hooks/useLeads";
import { supabase } from "@/integrations/supabase/client";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";

const stageColors: Record<string, string> = {
  novo: "bg-blue-500/10 text-blue-700 border-blue-200",
  primeira_conversa: "bg-amber-500/10 text-amber-700 border-amber-200",
  parceria_ativa: "bg-green-500/10 text-green-700 border-green-200",
  trouxe_indicacao: "bg-purple-500/10 text-purple-700 border-purple-200",
  fidelizado: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  inativo: "bg-gray-500/10 text-gray-700 border-gray-200",
};

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leadsHook = useLeads("parceiro");
  const { leads: partners, isLoading: partnersLoading } = leadsHook;
  const partner = useMemo(() => partners.find((p) => p.id === id), [partners, id]);
  const [editOpen, setEditOpen] = useState(false);

  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ["leads", "referred-by", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("referred_by_partner_id", id!)
        .eq("lead_type", "comercial")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!id,
  });

  if (partnersLoading || referralsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/partners/pipeline")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <p className="text-muted-foreground">Parceiro não encontrado.</p>
      </div>
    );
  }

  const fechadas = referrals.filter((r) => r.status === "fechado").length;
  const taxaConversao = referrals.length > 0 ? Math.round((fechadas / referrals.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb>
        <BreadcrumbList className="text-xs text-muted-foreground [&>li>svg]:size-3">
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/partners/pipeline">Parceiros</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary font-medium">{partner.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/partners/pipeline")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 space-y-1">
          <h1 className="text-2xl font-display font-semibold leading-tight flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" /> {partner.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {partner.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{partner.phone}</span>}
            {partner.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{partner.email}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {partner.partner_stage && (
              <Badge variant="outline" className={`text-xs ${stageColors[partner.partner_stage]}`}>
                {partnerStageLabels[partner.partner_stage]}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Parceiro desde {format(new Date(partner.created_at), "MMM 'de' yyyy", { locale: pt })}
            </Badge>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
      </div>

      {/* Histórico da parceria */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Histórico da Parceria</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Estágio atual</p>
            <p className="text-sm font-medium">{partner.partner_stage ? partnerStageLabels[partner.partner_stage] : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Indicações trazidas</p>
            <p className="text-sm font-medium">{referrals.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taxa de conversão das indicações</p>
            <p className="text-sm font-medium">{taxaConversao}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Última atualização</p>
            <p className="text-sm font-medium">{format(new Date(partner.updated_at), "dd/MM/yyyy", { locale: pt })}</p>
          </div>
          {partner.notes && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="text-sm">{partner.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indicações trazidas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2"><Send className="h-4 w-4" /> Indicações Trazidas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Send className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Este parceiro ainda não trouxe nenhuma indicação.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Indicado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => navigate(`/leads/${lead.id}`)}>
                      {lead.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{lead.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{leadStatusLabels[lead.status] || lead.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: pt })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editOpen && (
        <LeadFormDialog open={editOpen} onOpenChange={setEditOpen} editingLead={partner} lockType="parceiro" leadsHook={leadsHook} />
      )}
    </div>
  );
}
