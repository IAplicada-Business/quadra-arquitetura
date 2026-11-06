import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { buildQuoteInserts, type ScopeActivityPick } from "@/lib/supplierScopeQuotes";

export interface SupplierScope {
  id: string;
  project_id: string;
  supplier_id: string;
  discipline: string | null;
  activities: any;
  sent_at: string | null;
  status: string;
  quoted_value: number | null;
  user_id: string;
  created_at: string;
  supplier_name?: string;
}

export function useSupplierScopes(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["supplier_scopes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_scopes" as any)
        .select("*, suppliers(name)")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((d: any) => ({
        ...d,
        supplier_name: d.suppliers?.name,
      })) as SupplierScope[];
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<SupplierScope>) => {
      const { data, error } = await supabase
        .from("supplier_scopes" as any)
        .insert({ ...item, project_id: projectId!, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_scopes", projectId] });
      toast({ title: "Escopo salvo" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  /* Um fornecedor costuma pegar várias disciplinas (a construtora faz
     alvenaria + hidráulica + cobertura). A tabela guarda uma disciplina por
     linha, então grava-se uma linha por disciplina de uma vez só — sem
     migration e sem um toast por disciplina. */
  const createMany = useMutation({
    mutationFn: async (items: Partial<SupplierScope>[]) => {
      if (items.length === 0) return [];
      const { data, error } = await supabase
        .from("supplier_scopes" as never)
        .insert(items.map(i => ({ ...i, project_id: projectId!, user_id: user!.id })) as never)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supplier_scopes", projectId] });
      const n = Array.isArray(data) ? data.length : 0;
      toast({ title: n > 1 ? `Escopo salvo para ${n} disciplinas` : "Escopo salvo" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  /**
   * Grava o escopo marcado e cria, na revisão atual de Orçamentos, a
   * cotação pendente de cada atividade que esse fornecedor ainda não tem.
   * Regravar substitui o rascunho ("gerado") daquelas disciplinas e não
   * duplica cotação que já existe.
   */
  const saveSelection = useMutation({
    mutationFn: async (payload: {
      supplierId: string;
      supplierName: string;
      groups: { discipline: string; activities: (ScopeActivityPick & { area_m2: number | null; duration_days: number | null })[] }[];
    }) => {
      if (!user) throw new Error("Sessão expirada. Entre de novo para salvar.");
      const groups = payload.groups.filter((g) => g.activities.length > 0);
      if (groups.length === 0) throw new Error("Marque ao menos uma atividade.");

      const disciplines = groups.map((g) => g.discipline);
      const { error: clearError } = await supabase
        .from("supplier_scopes")
        .delete()
        .eq("project_id", projectId!)
        .eq("supplier_id", payload.supplierId)
        .eq("status", "gerado")
        .in("discipline", disciplines);
      if (clearError) throw clearError;

      const { error: scopeError } = await supabase.from("supplier_scopes").insert(
        groups.map((g) => ({
          supplier_id: payload.supplierId,
          discipline: g.discipline,
          activities: g.activities.map((a) => ({
            id: a.id,
            name: a.name,
            area_m2: a.area_m2,
            duration_days: a.duration_days,
          })),
          status: "gerado",
          project_id: projectId!,
          user_id: user.id,
        })),
      );
      if (scopeError) throw scopeError;

      const [quotesRes, scopeRes] = await Promise.all([
        supabase
          .from("budget_quotes")
          .select("activity_id, supplier_id, revision_number, services_description")
          .eq("project_id", projectId!),
        supabase.from("scope_items").select("id, discipline, scope_type").eq("project_id", projectId!),
      ]);
      if (quotesRes.error) throw quotesRes.error;
      if (scopeRes.error) throw scopeRes.error;

      const inserts = buildQuoteInserts({
        activities: groups.flatMap((g) => g.activities.map((a) => ({ id: a.id, name: a.name, discipline: g.discipline }))),
        supplierId: payload.supplierId,
        supplierName: payload.supplierName,
        existingQuotes: quotesRes.data ?? [],
        scopeItems: scopeRes.data ?? [],
      });

      if (inserts.length > 0) {
        const { error: quoteError } = await supabase.from("budget_quotes").insert(
          inserts.map((row) => ({ ...row, project_id: projectId!, user_id: user.id })),
        );
        if (quoteError) throw quoteError;
      }

      return { quotes: inserts.length, selected: groups.reduce((sum, g) => sum + g.activities.length, 0) };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["supplier_scopes", projectId] });
      queryClient.invalidateQueries({ queryKey: ["budget_quotes", projectId] });
      toast({
        title: "Escopo salvo no orçamento",
        description: result.quotes > 0
          ? `${result.quotes} ${result.quotes === 1 ? "atividade entrou" : "atividades entraram"} em Orçamentos, como cotação pendente.`
          : "Essas atividades já estavam no orçamento deste fornecedor.",
      });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<SupplierScope>) => {
      const { error } = await supabase
        .from("supplier_scopes" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_scopes", projectId] });
      toast({ title: "Escopo atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplier_scopes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_scopes", projectId] });
      toast({ title: "Escopo removido" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { scopes: query.data ?? [], isLoading: query.isLoading, create, createMany, saveSelection, update, remove };
}
