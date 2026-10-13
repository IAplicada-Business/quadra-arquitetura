import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nextProjectNumber } from "@/hooks/useProjectNumbers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { handleDeleteError } from "@/lib/handleDeleteError";
import { sanitizeEmptyStrings } from "@/lib/sanitizePayload";
import type { Database } from "@/integrations/supabase/types";

type ClientOrigin = Database["public"]["Enums"]["client_origin"];
type ClientType = Database["public"]["Enums"]["client_type"];
export type LeadType = Database["public"]["Enums"]["lead_type"];
export type PartnerStage = Database["public"]["Enums"]["partner_stage"];

export const PARTNER_STAGES: PartnerStage[] = [
  "novo",
  "primeira_conversa",
  "parceria_ativa",
  "trouxe_indicacao",
  "fidelizado",
  "inativo",
];

export const partnerStageLabels: Record<PartnerStage, string> = {
  novo: "Novo",
  primeira_conversa: "Primeira Conversa",
  parceria_ativa: "Parceria Ativa",
  trouxe_indicacao: "Trouxe Indicação",
  fidelizado: "Fidelizado",
  inativo: "Inativo",
};

// Estágios que contam como "parceiro ativo" nas métricas — engajado o
// suficiente pra já ter gerado ou poder gerar indicação. "novo" e
// "primeira_conversa" ainda não provaram a parceria; "inativo" é
// explícito.
export const ACTIVE_PARTNER_STAGES = new Set<PartnerStage>(["parceria_ativa", "trouxe_indicacao", "fidelizado"]);

export const LEAD_STATUSES = [
  "novo",
  "contato_feito",
  "reuniao_agendada",
  "proposta_enviada",
  "fechado",
  "perdido_definitivo",
  "backlog_recontato",
  "perdido",
] as const;

export const leadStatusLabels: Record<string, string> = {
  novo: "Novo Lead",
  contato_feito: "Contato Feito",
  reuniao_agendada: "Reunião Agendada",
  proposta_enviada: "Proposta Enviada",
  fechado: "Fechado",
  perdido_definitivo: "Perdido (definitivo)",
  backlog_recontato: "Backlog (recontato)",
  perdido: "Perdido (legado)",
};

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string;
  phone_secondary: string | null;
  project_type: string;
  origin: string;
  channel_id: string | null;
  lead_type: LeadType;
  partner_stage: PartnerStage | null;
  referred_by_partner_id: string | null;
  responsible: string | null;
  notes: string | null;
  status: string;
  meeting_date: string | null;
  converted_client_id: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * `type` separa o funil comercial (B2B/B2C) do pipeline de parceiros —
 * mesma tabela `leads`, discriminada por `lead_type`. Default
 * "comercial" protege todo consumidor existente (LeadsPipeline,
 * LeadDetail, LeadsProposals, LeadsContracts) sem precisar tocar em
 * cada um: só o Pipeline de Parceiros passa "parceiro" explicitamente.
 */
export function useLeads(type: LeadType = "comercial") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ["leads", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("lead_type", type)
        .order("created_at", { ascending: false });
      if (error) {
        // 42703 = coluna não existe — a migration que cria leads.lead_type
        // ainda não rodou no banco (o filtro é código novo, mas o schema
        // real pode estar atrasado em relação ao deploy do frontend).
        // Sem o filtro, cai no comportamento de antes desta feature: mostra
        // todos os leads. Evita sumir com o pipeline inteiro por causa de
        // uma migration pendente.
        if (error.code === "42703") {
          const fallback = await supabase.from("leads").select("*").order("created_at", { ascending: false });
          if (fallback.error) throw fallback.error;
          toast({
            title: "Aviso: banco de dados desatualizado",
            description: "A coluna lead_type ainda não existe — rode as migrations pendentes. Mostrando todos os leads sem separar por tipo.",
            variant: "destructive",
          });
          return fallback.data as Lead[];
        }
        throw error;
      }
      return data as Lead[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!leadsQuery.error) return;
    const err = leadsQuery.error as { code?: string; message?: string };
    if (err.code === "42703") return; // já tratado (toast + fallback) dentro do queryFn
    toast({ title: "Erro ao carregar leads", description: err.message, variant: "destructive" });
  }, [leadsQuery.error]);

  const create = useMutation({
    mutationFn: async (lead: {
      name: string; phone: string; email?: string; phone_secondary?: string;
      project_type?: string; origin?: string; channel_id?: string | null;
      lead_type?: LeadType; partner_stage?: PartnerStage | null; referred_by_partner_id?: string | null;
      responsible?: string; notes?: string; status?: string; meeting_date?: string;
    }) => {
      const insertType = lead.lead_type ?? type;
      const { error } = await supabase.from("leads").insert({
        user_id: user!.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email || null,
        phone_secondary: lead.phone_secondary || null,
        project_type: (lead.project_type || "residencial") as ClientType,
        origin: (lead.origin || "outro") as ClientOrigin,
        channel_id: lead.channel_id || null,
        lead_type: insertType,
        partner_stage: insertType === "parceiro" ? (lead.partner_stage ?? "novo") : null,
        referred_by_partner_id: insertType === "comercial" ? (lead.referred_by_partner_id || null) : null,
        responsible: lead.responsible || null,
        notes: lead.notes || null,
        status: lead.status || "novo",
        meeting_date: lead.meeting_date || null,
      });
      if (error) throw error;
      return insertType;
    },
    onSuccess: (insertType) => {
      // Chave sem o `type` invalida as duas listas (comercial e parceiro) —
      // importante pro toggle de tipo no formulário: um "Novo Lead"
      // criado como parceiro precisa sumir da lista comercial e aparecer
      // na de parceiros, mesmo estando as duas montadas ao mesmo tempo.
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: insertType === "parceiro" ? "Parceiro criado com sucesso" : "Lead criado com sucesso" });
    },
    onError: (e: Error) => toast({ title: "Erro ao criar lead", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      // Formulário manda meeting_date (e outros opcionais) como "" — Postgres
      // rejeita date com string vazia (22007). create() já fazia || null; update não.
      const castUpdates = sanitizeEmptyStrings({ ...updates }) as Record<string, unknown> & {
        origin?: ClientOrigin;
        project_type?: ClientType;
      };
      const { error } = await supabase.from("leads").update(castUpdates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar lead", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead removido" });
    },
    onError: (e: any) => handleDeleteError(e, "leads"),
  });

  const convertToClient = useMutation({
    mutationFn: async (lead: Lead) => {
      // 1. Check for existing client by email or phone
      let clientId: string | null = null;
      if (lead.email) {
        const { data: existing } = await supabase.from("clients").select("id").eq("email", lead.email).limit(1).single();
        if (existing) clientId = existing.id;
      }
      if (!clientId && lead.phone) {
        const { data: existing } = await supabase.from("clients").select("id").eq("phone", lead.phone).limit(1).single();
        if (existing) clientId = existing.id;
      }

      // 2. Create client if not found
      if (!clientId) {
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .insert({
            user_id: user!.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            phone_secondary: lead.phone_secondary ?? null,
            client_type: lead.project_type as any,
            origin: lead.origin as any,
            observations: lead.notes ?? null,
            source_lead_id: lead.id,
            converted_at: new Date().toISOString(),
          } as any)
          .select()
          .single();
        if (clientError) throw clientError;
        clientId = client.id;
      }

      // 3. Update lead with converted_client_id and status
      const { error: leadError } = await supabase
        .from("leads")
        .update({ converted_client_id: clientId, status: "fechado", converted_at: new Date().toISOString() })
        .eq("id", lead.id);
      if (leadError) throw leadError;

      // 4. Fetch approved proposal for this lead (if any)
      const { data: proposal } = await supabase
        .from("proposals")
        .select("id, price_full, final_value, project_name, project_type")
        .eq("lead_id", lead.id)
        .eq("status", "aprovada")
        .limit(1)
        .single();

      // Próximo código automático (Q<n>); ver src/lib/projectNumber.ts
      const nextNumber = await nextProjectNumber();

      // 6. Create project
      const projectName = `${lead.name} — ${lead.project_type || "projeto"}`;
      const { data: project, error: projError } = await supabase
        .from("projects")
        .insert({
          user_id: user!.id,
          name: projectName,
          client_id: clientId,
          status: "planejamento" as any,
          project_type: (lead.project_type as any) || "residencial",
          project_number: nextNumber,
          estimated_budget: proposal?.price_full ?? proposal?.final_value ?? null,
        } as any)
        .select()
        .single();
      if (projError) throw projError;

      // 7. Create revenue payment if proposal exists
      if (proposal) {
        await supabase.from("payments").insert({
          user_id: user!.id,
          project_id: project.id,
          description: `Honorários — ${lead.name}`,
          value: proposal.price_full ?? proposal.final_value ?? 0,
          status: "pendente" as any,
          supplier_name: "Receita Escritório",
          source: "escritorio",
        } as any);
      }

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: `Projeto ${(project as any).project_number} criado para ${(project as any).name?.split(" — ")[0]}`,
        description: "Lead convertido em cliente e projeto criado",
      });
    },
    onError: (e: Error) => toast({ title: "Erro ao converter lead", description: e.message, variant: "destructive" }),
  });

  return {
    leads: leadsQuery.data ?? [],
    isLoading: leadsQuery.isLoading,
    create,
    update,
    remove,
    convertToClient,
  };
}
