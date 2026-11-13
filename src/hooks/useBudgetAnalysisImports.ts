import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { AnalysisImportFile } from "@/lib/analysisImport";

export interface BudgetAnalysisImport {
  id: string;
  project_id: string;
  title: string;
  file_name: string | null;
  created_at: string;
}

/** Análises em HTML importadas da obra. Só metadados na lista; o HTML vai pelo portal. */
export function useBudgetAnalysisImports(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["budget_analysis_imports", projectId];

  const query = useQuery({
    queryKey: key,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_analysis_imports" as never)
        .select("id, project_id, title, file_name, created_at")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BudgetAnalysisImport[];
    },
  });

  const importHtml = useMutation({
    mutationFn: async (file: AnalysisImportFile) => {
      if (!user) throw new Error("Sessão expirada. Entre de novo para importar.");
      const { error } = await supabase.from("budget_analysis_imports" as never).insert({
        project_id: projectId!,
        user_id: user.id,
        title: file.title,
        file_name: file.fileName,
        html: file.html,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast({ title: "Análise importada", description: "Ela aparece na aba Análise orçamentária do cliente. O orçamento não foi alterado." });
    },
    onError: (e: Error) => toast({ title: "Erro ao importar", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_analysis_imports" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast({ title: "Análise removida" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { imports: query.data ?? [], isLoading: query.isLoading, importHtml, remove };
}
