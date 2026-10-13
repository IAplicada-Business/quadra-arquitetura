import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useProjectDetail(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("No project ID");
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name, phone)")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const updateProject = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!projectId) throw new Error("No project ID");
      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  return { project: projectQuery.data, isLoading: projectQuery.isLoading, updateProject };
}
