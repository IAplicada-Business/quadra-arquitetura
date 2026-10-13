import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nextProjectNumber } from "@/hooks/useProjectNumbers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { handleDeleteError } from "@/lib/handleDeleteError";
import { sanitizeEmptyStrings } from "@/lib/sanitizePayload";

/**
 * Colunas graváveis em `contracts`.
 * Inclui as colunas base (já em produção) + as da migration
 * `20260806120000_fix_edit_rls_and_contract_columns.sql`.
 * Se a migration ainda não tiver sido aplicada, o PostgREST falha nessas
 * colunas novas — por isso o filtro abaixo só manda as que sabemos seguras
 * até a migration rodar; depois disso, mude `CONTRACT_EXTENDED_READY` para true.
 */
const CONTRACT_EXTENDED_READY = false;

const CONTRACT_BASE_COLUMNS = [
  "proposal_id", "client_id", "template_id", "template_name", "title", "clauses",
  "custom_clauses", "address", "city", "construction_neighborhood", "environments",
  "value", "total_area", "payment_conditions", "payment_method", "start_date",
  "estimated_duration", "service_description", "notes", "status", "project_id",
  "lead_id", "client_name", "client_cpf_cnpj", "client_email", "client_phone",
  "client_address", "contract_number", "sent_at", "signed_at", "cancelled_at",
  "cancellation_reason", "created_by",
] as const;

const CONTRACT_EXTENDED_COLUMNS = [
  "pdf_url", "client_person_type", "client_nationality", "client_marital_status",
  "client_rg", "client_razao_social", "client_tipo_societario",
  "client_representante_legal", "client_logradouro", "client_numero",
  "client_complemento", "client_bairro", "client_cidade", "client_estado",
  "client_cep", "timeline_levantamento", "timeline_briefing",
  "timeline_anteprojeto", "timeline_anteprojeto_aprovacao",
  "timeline_projeto_executivo", "timeline_reuniao_prioridades",
  "timeline_gestao_pagamentos", "installments_schedule",
] as const;

const CONTRACT_WRITE_COLUMNS = new Set<string>([
  ...CONTRACT_BASE_COLUMNS,
  ...(CONTRACT_EXTENDED_READY ? CONTRACT_EXTENDED_COLUMNS : []),
]);

function pickContractColumns(payload: Record<string, unknown>) {
  const clean = sanitizeEmptyStrings(payload);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(clean)) {
    if (CONTRACT_WRITE_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}

export interface Contract {
  id: string;
  user_id: string;
  proposal_id: string;
  client_id: string | null;
  template_name: string | null;
  clauses: string | null;
  address: string | null;
  city: string | null;
  value: number | null;
  payment_conditions: string | null;
  start_date: string | null;
  status: string;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  proposals?: { lead_id: string; value: number | null; leads?: { name: string; phone: string; email: string | null; project_type: string; origin: string } | null } | null;
}

export function useContracts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const contractsQuery = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, proposals(lead_id, value, leads(name, phone, email, project_type, origin))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (contract: Record<string, unknown>) => {
      // Formulário de contratos manda dezenas de campos (timeline_*, client_*)
      // que ainda não existem no schema de produção — filtramos para não
      // quebrar com "Could not find the '…' column in the schema cache".
      const { error } = await supabase.from("contracts").insert({
        ...pickContractColumns(contract),
        user_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato criado" });
    },
    onError: (e: Error) => toast({ title: "Erro ao criar contrato", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase
        .from("contracts")
        .update(pickContractColumns(updates) as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      toast({ title: "Contrato removido" });
    },
    onError: (e: any) => handleDeleteError(e, "contracts"),
  });

  const signAndCreateProject = useMutation({
    mutationFn: async (contract: Contract) => {
      const lead = contract.proposals?.leads;
      const leadId = contract.proposals?.lead_id;

      // Próximo código automático (Q<n>); ver src/lib/projectNumber.ts
      const nextNumber = await nextProjectNumber();

      // 1. Create project
      const { data: project, error: projError } = await supabase
        .from("projects")
        .insert({
          user_id: user!.id,
          name: lead?.name ? `Projeto ${lead.name}` : "Novo Projeto",
          client_id: contract.client_id,
          address: contract.address,
          city: contract.city,
          estimated_budget: contract.value,
          project_type: (lead?.project_type as any) || "residencial",
          status: "contrato" as any,
          contract_id: contract.id,
          project_number: nextNumber,
          source_proposal_id: contract.proposal_id,
        } as any)
        .select()
        .single();
      if (projError) throw projError;

      // 2. Update contract with project_id and status
      const { error: contractErr } = await supabase
        .from("contracts")
        .update({ status: "assinado", project_id: project.id })
        .eq("id", contract.id);
      if (contractErr) throw contractErr;

      // 3. Mark lead as fechado if not already
      if (leadId) {
        await supabase.from("leads").update({ status: "fechado" }).eq("id", leadId);
      }

      // 4. Insert revenue payment (source: escritorio)
      await supabase.from("payments").insert({
        user_id: user!.id,
        project_id: project.id,
        description: `Honorários — ${lead?.name || "Projeto"}`,
        value: contract.value || contract.proposals?.value || 0,
        status: "pendente" as any,
        supplier_name: "Receita Escritório",
        source: "escritorio",
      } as any);

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Contrato assinado e projeto criado!" });
    },
    onError: (e: Error) => toast({ title: "Erro ao assinar contrato", description: e.message, variant: "destructive" }),
  });

  return { contracts: contractsQuery.data ?? [], isLoading: contractsQuery.isLoading, create, update, remove, signAndCreateProject };
}
