import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subMonths, differenceInDays, parseISO } from "date-fns";
import { computeFunnel, inPeriod as inBounds, lastSixMonths, periodBounds, type DashboardPeriod, type FunnelStageCount } from "@/lib/funnel";

interface LeadRow {
  id: string;
  status: string;
  name: string;
  created_at: string;
  updated_at: string;
  origin: string | null;
  project_type: string | null;
}

interface ProposalRow {
  id: string;
  status: string;
  price_full: number | null;
  final_value: number | null;
  sent_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  lead_id: string;
  notes: string | null;
  leads: { name: string; phone: string; email: string | null; status: string | null } | null;
}

const LOST_OR_CLOSED_LEAD_STATUSES = new Set(["perdido", "perdido_definitivo", "fechado"]);

export type FunilStage = FunnelStageCount;

export interface PropostaAberta {
  id: string;
  leadName: string;
  daysSinceSent: number;
  value: number;
  urgencyLabel: string;
  urgencyColor: string;
}

export interface PipelineMonth {
  month: string;
  fechados: number;
  propostas: number;
  em_andamento: number;
}

export type ComercialPeriod = DashboardPeriod;

export const PERIOD_LABELS: Record<ComercialPeriod, string> = {
  mes_atual:   "Este mês",
  mes_passado: "Mês passado",
  trimestre:   "Últimos 3 meses",
  semestre:    "Últimos 6 meses",
  ano:         "Este ano",
  tudo:        "Todo o período",
};

export const ORIGIN_OPTIONS = [
  { value: "todos", label: "Todas as origens" },
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

export const PROJECT_TYPE_OPTIONS = [
  { value: "todos", label: "Todos os tipos" },
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "saude", label: "Saúde" },
  { value: "outro", label: "Outro" },
];

export function useComercialMetrics({
  period = "mes_atual",
  origin = "todos",
  projectType = "todos",
}: {
  period?: ComercialPeriod;
  origin?: string;
  projectType?: string;
} = {}) {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);

  const query = useQuery({
    queryKey: ["comercial-metrics", period, origin, projectType],
    queryFn: async () => {
      // .eq("lead_type", "comercial") — blinda o dashboard/funil comercial
      // dos leads do pipeline de parceiros (reposicionamento estratégico:
      // funis totalmente separados, mesma tabela).
      const [leadsRes0, proposalsRes] = await Promise.all([
        supabase.from("leads").select("id, status, name, created_at, updated_at, origin, project_type").eq("lead_type", "comercial"),
        supabase.from("proposals").select("id, status, price_full, final_value, sent_at, approved_at, created_at, updated_at, lead_id, notes, leads(name, phone, email, status)"),
      ]);
      // 42703 = coluna lead_type ainda não existe no banco (migration
      // pendente) — sem o filtro, volta ao comportamento anterior à
      // feature de parceiros em vez de zerar o dashboard inteiro.
      const leadsRes = leadsRes0.error?.code === "42703"
        ? await supabase.from("leads").select("id, status, name, created_at, updated_at, origin, project_type")
        : leadsRes0;
      return {
        leads: (leadsRes.data ?? []) as LeadRow[],
        proposals: (proposalsRes.data ?? []) as ProposalRow[],
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const computed = useMemo(() => {
    if (!query.data) return null;
    const { leads, proposals } = query.data;

    const bounds = periodBounds(period, today);
    const inPeriod = (dateStr: string) => inBounds(dateStr, bounds);

    // Filter leads by period + origin + projectType
    const filteredLeads = leads.filter(
      (l) =>
        inPeriod(l.created_at) &&
        (origin === "todos" || l.origin === origin) &&
        (projectType === "todos" || l.project_type === projectType)
    );

    // Previous period for variation (only meaningful for mes_atual)
    const prevPeriodStr = period === "mes_atual" ? format(subMonths(today, 1), "yyyy-MM") : null;
    const prevLeads = prevPeriodStr
      ? leads.filter(
          (l) =>
            l.created_at?.startsWith(prevPeriodStr) &&
            (origin === "todos" || l.origin === origin) &&
            (projectType === "todos" || l.project_type === projectType)
        )
      : [];

    // Funil
    const { stages: funil, rates: funnelRates, total: conversaoTotal } = computeFunnel(filteredLeads);
    const funnelFechado = funil[funil.length - 1].count;
    const funnelPerdido = filteredLeads.filter((l) => l.status === "perdido").length;

    // Receita fechada: proposals aprovadas de leads no período
    const periodLeadIds = new Set(filteredLeads.map((l) => l.id));
    const approvedFromPeriod = proposals.filter(
      (p) => p.status === "aprovada" && periodLeadIds.has(p.lead_id)
    );
    const receitaFechada = approvedFromPeriod.reduce(
      (s, p) => s + (p.price_full ?? p.final_value ?? 0), 0
    );
    const ticketMedio = approvedFromPeriod.length > 0 ? receitaFechada / approvedFromPeriod.length : 0;

    // KPIs
    const leadsThisCount = filteredLeads.length;
    const leadsPrevCount = prevLeads.length;
    const leadsVariation = leadsPrevCount > 0 ? Math.round(((leadsThisCount - leadsPrevCount) / leadsPrevCount) * 100) : 0;

    const prevFechados = prevLeads.filter((l) => l.status === "fechado").length;
    const taxaConversaoThis = leadsThisCount > 0 ? Math.round((funnelFechado / leadsThisCount) * 100) : 0;
    const taxaConversaoPrev = leadsPrevCount > 0 ? Math.round((prevFechados / leadsPrevCount) * 100) : 0;
    const taxaVariation = period === "mes_atual" && taxaConversaoPrev > 0 ? taxaConversaoThis - taxaConversaoPrev : 0;

    // Tempo médio de fechamento (todos os leads fechados, sem filtro de período)
    const closedLeads = leads.filter((l) => l.status === "fechado" && l.created_at && l.updated_at);
    const avgClosingDays =
      closedLeads.length > 0
        ? Math.round(
            closedLeads.reduce((s, l) => s + differenceInDays(parseISO(l.updated_at), parseISO(l.created_at)), 0) /
              closedLeads.length
          )
        : 0;

    // Propostas aguardando (global, não filtrado por período).
    // Exclui propostas de leads já perdidos ou fechados.
    const proposalsAguardando = proposals.filter(
      (p) => p.status === "enviada" && !LOST_OR_CLOSED_LEAD_STATUSES.has(p.leads?.status ?? "")
    );
    const hasUrgent = proposalsAguardando.some(
      (p) => p.sent_at && differenceInDays(today, parseISO(p.sent_at)) > 7
    );

    // Propostas em aberto (global)
    const propostasAbertas: PropostaAberta[] = proposalsAguardando
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, 5)
      .map((p) => {
        const daysSince = p.sent_at ? differenceInDays(today, parseISO(p.sent_at)) : 0;
        const urgencyLabel = daysSince >= 7 ? "Urgente" : "Aguardando";
        const urgencyColor = daysSince >= 7 ? "text-red-500" : "text-muted-foreground";
        return {
          id: p.id,
          leadName: p.leads?.name ?? "Lead",
          daysSinceSent: daysSince,
          value: p.price_full ?? p.final_value ?? 0,
          urgencyLabel,
          urgencyColor,
        };
      });

    const totalEmNegociacao = propostasAbertas.reduce((s, p) => s + p.value, 0);

    // Pipeline 6 meses (sempre últimos 6, independe do filtro de período para manter histórico)
    const mLeads = leads.filter(
      (l) =>
        (origin === "todos" || l.origin === origin) &&
        (projectType === "todos" || l.project_type === projectType)
    );
    const pipeline6m: PipelineMonth[] = lastSixMonths(today).map(({ key, label }) => ({
      month: label,
      fechados: mLeads.filter((l) => l.status === "fechado" && l.updated_at?.startsWith(key)).length,
      propostas: mLeads.filter((l) => l.status === "proposta_enviada" && l.created_at?.startsWith(key)).length,
      em_andamento: mLeads.filter((l) => ["contato_feito", "reuniao_agendada"].includes(l.status) && l.created_at?.startsWith(key)).length,
    }));

    return {
      funil,
      funnelRates,
      conversaoTotal,
      ticketMedio,
      kpis: {
        leadsThisMonth: leadsThisCount,
        leadsVariation,
        taxaConversao: taxaConversaoThis,
        taxaVariation,
        tempoMedioFechamento: avgClosingDays,
        proposalsAguardando: proposalsAguardando.length,
        hasUrgent,
        receitaFechada,
        leadsPerdidos: funnelPerdido,
      },
      propostasAbertas,
      totalEmNegociacao,
      pipeline6m,
    };
  }, [query.data, today, period, origin, projectType]);

  return { data: computed, isLoading: query.isLoading };
}
