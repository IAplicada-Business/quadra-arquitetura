import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useDefaultDisciplines } from "@/hooks/useDefaultDisciplines";

export interface ScenarioItem {
  id: string;
  user_id: string;
  scenario_id: string;
  discipline: string;
  description: string | null;
  estimated_value: number;
  is_included: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  total_value: number;
  is_approved: boolean;
  /** Aprovação feita pelo cliente na Trilha (só registra; a equipe gera parcelas e escopo). */
  approved_at?: string | null;
  approved_by_name?: string | null;
  approval_source?: "team" | "client" | null;
  is_locked?: boolean;
  created_at: string;
  updated_at: string;
  scenario_items?: ScenarioItem[];
}

export function useScenarios(projectId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { disciplines: defaultDisciplines } = useDefaultDisciplines();

  const scenariosQuery = useQuery({
    queryKey: ["scenarios", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenarios")
        .select("*, scenario_items(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Scenario[];
    },
    enabled: !!projectId && !!user,
  });

  const createScenario = useMutation({
    mutationFn: async (name: string) => {
      const { data: scenario, error } = await supabase
        .from("scenarios")
        .insert({ user_id: user!.id, project_id: projectId, name })
        .select()
        .single();
      if (error) throw error;

      if (defaultDisciplines.length > 0) {
        const items = defaultDisciplines.map((d) => ({
          scenario_id: scenario.id,
          user_id: user!.id,
          discipline: d.name,
          display_order: d.display_order,
          estimated_value: 0,
          is_included: true,
        }));
        await supabase.from("scenario_items").insert(items);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      toast({ title: "Cenário criado" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeScenario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scenarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      toast({ title: "Cenário removido" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const addItem = useMutation({
    mutationFn: async (item: { scenario_id: string; discipline: string; description?: string; estimated_value?: number; is_included?: boolean; display_order?: number }) => {
      const { error } = await supabase.from("scenario_items").insert({ ...item, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from("scenario_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scenario_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const approveScenario = useMutation({
    mutationFn: async (scenario: Scenario) => {
      const allItems = scenario.scenario_items || [];
      const includedItems = allItems.filter((i) => i.is_included);

      // 1. Mark scenario as approved, un-approve others
      const { error: approveErr } = await supabase
        .from("scenarios")
        .update({ is_approved: true })
        .eq("id", scenario.id);
      if (approveErr) throw approveErr;

      const { error: unApproveErr } = await supabase
        .from("scenarios")
        .update({ is_approved: false })
        .eq("project_id", projectId)
        .neq("id", scenario.id);
      if (unApproveErr) throw unApproveErr;

      // 2. Clear existing scope_items for this project (avoid duplicates on re-approval)
      const { error: clearErr } = await supabase
        .from("scope_items")
        .delete()
        .eq("project_id", projectId);
      if (clearErr) throw clearErr;

      // 3. Insert ALL items as scope_type="projeto" (idealized scope)
      if (allItems.length > 0) {
        const projetoInserts = allItems.map((item, idx) => ({
          user_id: user!.id,
          project_id: projectId,
          discipline: item.discipline,
          description: item.description,
          estimated_value: item.estimated_value,
          entry_order: idx + 1,
          scope_type: "projeto",
          status: "planejado",
        }));
        const { error: projErr } = await supabase.from("scope_items").insert(projetoInserts);
        if (projErr) throw projErr;
      }

      // 4. Insert INCLUDED items as scope_type="contratado" and return them
      let contratadoIds: string[] = [];
      if (includedItems.length > 0) {
        const contratadoInserts = includedItems.map((item, idx) => ({
          user_id: user!.id,
          project_id: projectId,
          discipline: item.discipline,
          description: item.description,
          estimated_value: item.estimated_value,
          entry_order: idx + 1,
          scope_type: "contratado",
          status: "contratado",
        }));
        const { data: contData, error: contErr } = await supabase
          .from("scope_items")
          .insert(contratadoInserts)
          .select("id, discipline, description");
        if (contErr) throw contErr;
        contratadoIds = (contData || []).map((d) => d.id);

        // 4b. Auto-create budget_quotes for each contratado scope item
        if (contData && contData.length > 0) {
          const budgetInserts = contData.map((si) => ({
            project_id: projectId,
            user_id: user!.id,
            scope_item_id: si.id,
            services_description: `${si.discipline}${si.description ? ' - ' + si.description : ''}`,
            status: "pendente" as const,
          }));
          await supabase.from("budget_quotes").insert(budgetInserts);
        }
      }

      // 5. Update project budgets
      const idealTotal = allItems.reduce((sum, i) => sum + (i.estimated_value || 0), 0);
      const contractedTotal = includedItems.reduce((sum, i) => sum + (i.estimated_value || 0), 0);
      const { error: updErr } = await supabase
        .from("projects")
        .update({
          approved_scenario_id: scenario.id,
          ideal_budget: idealTotal,
          estimated_budget: contractedTotal,
          client_budget: contractedTotal,
        })
        .eq("id", projectId);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["scope_items", projectId] });
      queryClient.invalidateQueries({ queryKey: ["budget_quotes", projectId] });
      toast({ title: "Cenário aprovado! Escopo e orçamentos preenchidos automaticamente." });
    },
    onError: (e: Error) => toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" }),
  });

  return {
    scenarios: scenariosQuery.data ?? [],
    isLoading: scenariosQuery.isLoading,
    createScenario,
    removeScenario,
    addItem,
    updateItem,
    removeItem,
    approveScenario,
  };
}
