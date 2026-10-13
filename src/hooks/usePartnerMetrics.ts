import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ACTIVE_PARTNER_STAGES, PARTNER_STAGES, partnerStageLabels, type PartnerStage } from "@/hooks/useLeads";
import { computeFunnel, convRate, inPeriod, lastSixMonths, periodBounds, type DashboardPeriod, type FunnelResult } from "@/lib/funnel";
import type { PipelineMonth } from "@/hooks/useComercialMetrics";

export interface PartnerRow {
  id: string;
  name: string;
  partner_stage: PartnerStage | null;
}

export interface ReferredLeadRow {
  id: string;
  status: string;
  created_at: string;
  referred_by_partner_id: string;
}

export interface TopPartner {
  partnerId: string;
  name: string;
  count: number;
}

export interface PartnerStageCount {
  stage: PartnerStage;
  label: string;
  count: number;
}

export interface PartnerMetrics {
  totalParceiros: number;
  parceirosAtivos: number;
  /** Indicações (leads comerciais com parceiro) criadas no período. */
  indicacoesNoPeriodo: number;
  indicacoesFechadas: number;
  taxaConversaoIndicacoes: number;
  /** Parceiros distintos que indicaram alguém no período. */
  parceirosQueIndicaram: number;
  topParceiros: TopPartner[];
  /** Funil das indicações do período: Indicações → … → Fechado. */
  funil: FunnelResult;
  /** Indicações por mês (mesma forma do pipeline comercial). */
  indicacoes6m: PipelineMonth[];
  /** Quantos parceiros em cada etapa do pipeline de parceiros. */
  porEtapa: PartnerStageCount[];
}

/**
 * Métricas do pipeline de parceiros — espelha o padrão de
 * useComercialMetrics, mas nunca lê leads do tipo comercial (exceto os
 * que carregam referred_by_partner_id, só pra medir o resultado das
 * indicações). Consumido no Dashboard Comercial quando o filtro "Funil"
 * está em "Parceiros" — mesma estrutura de página, fonte própria.
 */
export function usePartnerMetrics(enabled: boolean = true, period: DashboardPeriod = "tudo") {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);

  const query = useQuery({
    queryKey: ["partner-metrics"],
    queryFn: async () => {
      const [partnersRes, referredRes] = await Promise.all([
        supabase.from("leads").select("id, name, partner_stage").eq("lead_type", "parceiro"),
        supabase
          .from("leads")
          .select("id, status, created_at, referred_by_partner_id")
          .eq("lead_type", "comercial")
          .not("referred_by_partner_id", "is", null),
      ]);
      return {
        partners: (partnersRes.data ?? []) as PartnerRow[],
        referred: (referredRes.data ?? []) as ReferredLeadRow[],
      };
    },
    // Lazy: só busca quando a aba "Parceiros" do dashboard é aberta —
    // antes disparava em toda visita ao Dashboard Comercial (aba
    // default), duas queries a mais sem necessidade nenhuma.
    enabled: !!user && enabled,
    staleTime: 60 * 1000,
  });

  const data = useMemo<PartnerMetrics | null>(() => {
    if (!query.data) return null;
    return buildPartnerMetrics(query.data.partners, query.data.referred, period, today);
  }, [query.data, period, today]);

  return { data, isLoading: query.isLoading };
}

/** Cálculo puro (testável) das métricas de parceiros para um período. */
export function buildPartnerMetrics(
  partners: PartnerRow[],
  referredAll: ReferredLeadRow[],
  period: DashboardPeriod,
  today: Date,
): PartnerMetrics {
  const bounds = periodBounds(period, today);
  const referred = referredAll.filter((r) => inPeriod(r.created_at, bounds));

  const totalParceiros = partners.length;
  const parceirosAtivos = partners.filter((p) => p.partner_stage && ACTIVE_PARTNER_STAGES.has(p.partner_stage)).length;

  const countByPartner = new Map<string, number>();
  referred.forEach((r) => countByPartner.set(r.referred_by_partner_id, (countByPartner.get(r.referred_by_partner_id) ?? 0) + 1));

  const topParceiros: TopPartner[] = partners
    .map((p) => ({ partnerId: p.id, name: p.name, count: countByPartner.get(p.id) ?? 0 }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const fechadas = referred.filter((r) => r.status === "fechado").length;

  const indicacoes6m: PipelineMonth[] = lastSixMonths(today).map(({ key, label }) => {
    const doMes = referredAll.filter((r) => r.created_at?.startsWith(key));
    return {
      month: label,
      fechados: doMes.filter((r) => r.status === "fechado").length,
      propostas: doMes.filter((r) => r.status === "proposta_enviada").length,
      em_andamento: doMes.filter((r) => !["fechado", "proposta_enviada", "perdido", "perdido_definitivo"].includes(r.status)).length,
    };
  });

  const porEtapa: PartnerStageCount[] = PARTNER_STAGES.map((stage) => ({
    stage,
    label: partnerStageLabels[stage],
    count: partners.filter((p) => p.partner_stage === stage).length,
  }));

  return {
    totalParceiros,
    parceirosAtivos,
    indicacoesNoPeriodo: referred.length,
    indicacoesFechadas: fechadas,
    taxaConversaoIndicacoes: convRate(fechadas, referred.length),
    parceirosQueIndicaram: countByPartner.size,
    topParceiros,
    funil: computeFunnel(referred, "Indicações"),
    indicacoes6m,
    porEtapa,
  };
}
