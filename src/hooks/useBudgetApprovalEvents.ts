import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BudgetApprovalEvent {
  id: string;
  scenario_id: string;
  action: "toggle_item" | "approve" | "unlock";
  actor_name: string | null;
  created_at: string;
}

/** Histórico de aprovações de cenário (quem e quando) + reabrir cenário aprovado pelo cliente. */
export function useBudgetApprovalEvents(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const events = useQuery({
    queryKey: ["budget_approval_events", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_approval_events")
        .select("id, scenario_id, action, actor_name, created_at")
        .eq("project_id", projectId!)
        .neq("action", "toggle_item")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as BudgetApprovalEvent[];
    },
  });

  /** Reabre o cenário para o cliente voltar a marcar itens (ação só da equipe). */
  const unlock = useMutation({
    mutationFn: async (scenarioId: string) => {
      const { error } = await supabase
        .from("scenarios")
        .update({ is_locked: false, approved_at: null, approved_by_name: null, approved_by_token_id: null, approval_source: null })
        .eq("id", scenarioId);
      if (error) throw error;
      const { error: evErr } = await supabase.from("budget_approval_events").insert({
        project_id: projectId!,
        scenario_id: scenarioId,
        action: "unlock",
        actor_name: user?.email ?? null,
      });
      if (evErr) throw evErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenarios", projectId] });
      queryClient.invalidateQueries({ queryKey: ["budget_approval_events", projectId] });
      toast.success("Cenário reaberto para o cliente");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { events: events.data ?? [], unlock };
}
