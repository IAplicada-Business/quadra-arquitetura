import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useBudgetQuotes(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["budget_quotes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_quotes")
        .select("*, scope_items(discipline), suppliers(name)")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const autoCreateMaterialTracking = async (budgetQuoteId: string, materialEstimate: number, scopeItemId?: string | null) => {
    if (materialEstimate <= 0) return;
    // Check if material_tracking already exists for this budget_quote
    const { data: existing } = await supabase
      .from("material_tracking")
      .select("id, quantity_needed")
      .eq("budget_quote_id", budgetQuoteId)
      .limit(1);
    if (existing && existing.length > 0) {
      if (existing[0].quantity_needed !== materialEstimate) {
        await supabase.from("material_tracking")
          .update({ quantity_needed: materialEstimate })
          .eq("id", existing[0].id);
        queryClient.invalidateQueries({ queryKey: ["material_tracking", projectId] });
      }
      return;
    }

    // Get discipline from scope item if available
    let discipline: string | null = null;
    if (scopeItemId) {
      const { data: si } = await supabase.from("scope_items").select("discipline").eq("id", scopeItemId).single();
      discipline = si?.discipline || null;
    }

    await supabase.from("material_tracking").insert({
      project_id: projectId!,
      user_id: user!.id,
      material_name: discipline ? `${discipline} (orçamento)` : "Material (orçamento)",
      quantity_needed: materialEstimate,
      discipline,
      source: "orcamento",
      budget_quote_id: budgetQuoteId,
      is_active: true,
    });
    queryClient.invalidateQueries({ queryKey: ["material_tracking", projectId] });
  };

  const create = useMutation({
    mutationFn: async (item: {
      scope_item_id?: string | null;
      activity_id?: string | null;
      discipline?: string | null;
      supplier_id?: string | null;
      supplier_name?: string | null;
      services_description?: string | null;
      value?: number | null;
      material_estimate?: number | null;
      delivery_time?: string | null;
      payment_terms?: string | null;
      status?: "pendente" | "cotado" | "aprovado" | "rejeitado";
      revision?: string;
      revision_number?: number;
      is_current_revision?: boolean;
    }) => {
      const { data, error } = await supabase.from("budget_quotes").insert({
        scope_item_id: item.scope_item_id ?? null,
        activity_id: item.activity_id ?? null,
        discipline: item.discipline ?? null,
        supplier_id: item.supplier_id ?? null,
        supplier_name: item.supplier_name ?? null,
        services_description: item.services_description ?? null,
        value: item.value ?? null,
        material_estimate: item.material_estimate ?? null,
        delivery_time: item.delivery_time ?? null,
        payment_terms: item.payment_terms ?? null,
        status: item.status ?? "pendente",
        revision: item.revision ?? "Rev 1",
        revision_number: item.revision_number ?? 1,
        is_current_revision: item.is_current_revision ?? true,
        project_id: projectId!,
        user_id: user!.id,
      }).select().single();
      if (error) throw error;
      return { data, item };
    },
    onSuccess: async ({ data, item }) => {
      queryClient.invalidateQueries({ queryKey: ["budget_quotes", projectId] });
      toast({ title: "Cotação adicionada" });
      // Auto-create material tracking if material_estimate > 0
      if (data && (item.material_estimate ?? 0) > 0) {
        await autoCreateMaterialTracking(data.id, item.material_estimate!, item.scope_item_id);
      }
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase.from("budget_quotes").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget_quotes", projectId] });
      toast({ title: "Cotação atualizada" });
      // Auto-create material tracking if material_estimate > 0
      if (data && (data.material_estimate ?? 0) > 0) {
        await autoCreateMaterialTracking(data.id, data.material_estimate!, data.scope_item_id);
      }
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_quotes", projectId] });
      queryClient.invalidateQueries({ queryKey: ["payments", projectId] });
      queryClient.invalidateQueries({ queryKey: ["budget_quote_items", projectId] });
      queryClient.invalidateQueries({ queryKey: ["material_tracking", projectId] });
      toast({ title: "Cotação removida" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createRevision = useMutation({
    mutationFn: async (currentRevision: number) => {
      // Get current quotes before marking them
      const { data: currentQuotes, error: fetchError } = await supabase
        .from("budget_quotes")
        .select("*")
        .eq("project_id", projectId!)
        .eq("revision_number", currentRevision);
      if (fetchError) throw fetchError;

      const oldQuoteIds = (currentQuotes ?? []).map((q) => q.id);

      // Mark all current quotes as not current
      const { error: updateError } = await supabase
        .from("budget_quotes")
        .update({ is_current_revision: false })
        .eq("project_id", projectId!)
        .eq("is_current_revision", true);
      if (updateError) throw updateError;

      // Deactivate material_tracking linked to old revision quotes
      if (oldQuoteIds.length > 0) {
        const { error: mtError } = await supabase
          .from("material_tracking")
          .update({ is_active: false })
          .in("budget_quote_id", oldQuoteIds);
        if (mtError) throw mtError;
      }

      if (currentQuotes && currentQuotes.length > 0) {
        const newRevNumber = currentRevision + 1;
        for (const quote of currentQuotes) {
          const { id, created_at, updated_at, ...q } = quote;
          const { data: newQuote, error: insertError } = await supabase
            .from("budget_quotes")
            .insert({
              ...q,
              revision: `Rev ${newRevNumber}`,
              revision_number: newRevNumber,
              is_current_revision: true,
            })
            .select()
            .single();
          if (insertError) throw insertError;

          // Create new active material_tracking for the new revision quote
          if (newQuote && (newQuote.material_estimate ?? 0) > 0) {
            await autoCreateMaterialTracking(newQuote.id, newQuote.material_estimate!, newQuote.scope_item_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_quotes", projectId] });
      queryClient.invalidateQueries({ queryKey: ["material_tracking", projectId] });
      toast({ title: "Nova revisão criada" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { quotes: query.data ?? [], isLoading: query.isLoading, create, update, remove, createRevision };
}
