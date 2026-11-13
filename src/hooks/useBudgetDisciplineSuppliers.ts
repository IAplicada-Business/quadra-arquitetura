import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface BudgetDisciplineSupplier {
  id: string;
  project_id: string;
  discipline: string;
  supplier_id: string;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Fornecedor responsável por disciplina/grupo na aba Orçamentos.
 */
export function useBudgetDisciplineSuppliers(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const db = supabase;
  const queryKey = ["budget_discipline_suppliers", projectId];

  const query = useQuery({
    queryKey,
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("budget_discipline_suppliers")
        .select("id, project_id, discipline, supplier_id")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data ?? []) as BudgetDisciplineSupplier[];
    },
  });

  /** supplier_id por disciplina (chave sem acento/maiúscula). */
  const byDiscipline = useMemo(() => {
    const map = new Map<string, BudgetDisciplineSupplier>();
    for (const r of query.data ?? []) map.set(normalize(r.discipline), r);
    return map;
  }, [query.data]);

  const getSupplierId = (discipline: string) => byDiscipline.get(normalize(discipline))?.supplier_id;

  /** supplierId null remove o responsável. */
  const setResponsible = useMutation({
    mutationFn: async ({ discipline, supplierId }: { discipline: string; supplierId: string | null }) => {
      const existing = byDiscipline.get(normalize(discipline));
      if (!supplierId) {
        if (!existing) return;
        const { error } = await db.from("budget_discipline_suppliers").delete().eq("id", existing.id);
        if (error) throw error;
        return;
      }
      if (existing) {
        const { error } = await db
          .from("budget_discipline_suppliers")
          .update({ supplier_id: supplierId, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
        return;
      }
      const { error } = await db.from("budget_discipline_suppliers").insert({
        project_id: projectId!,
        user_id: user!.id,
        discipline,
        supplier_id: supplierId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Fornecedor responsável atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { responsibles: query.data ?? [], getSupplierId, setResponsible };
}
