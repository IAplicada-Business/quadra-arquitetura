import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

async function fetchActiveToken(projectId: string) {
  // Mais novo primeiro: se (por legado) houver mais de um ativo, não quebra com 406.
  const { data, error } = await supabase
    .from("client_portal_tokens" as any)
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (((data as any[]) ?? [])[0] ?? null) as any;
}

export function useClientPortalToken(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["client_portal_token", projectId] });

  const query = useQuery({
    queryKey: ["client_portal_token", projectId],
    queryFn: () => fetchActiveToken(projectId!),
    enabled: !!projectId,
    // Outra pessoa pode ter desativado/regenerado o link com o modal aberto.
    refetchOnWindowFocus: true,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("client_portal_tokens" as any)
        .insert({ project_id: projectId!, user_id: user!.id } as any)
        .select()
        .single();
      if (error) {
        // 23505: já existe link ativo (clique duplo ou outra pessoa gerou ao mesmo tempo).
        if ((error as { code?: string }).code === "23505") {
          const existing = await fetchActiveToken(projectId!);
          if (existing) return existing;
        }
        throw error;
      }
      return data as any;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Link do portal gerado com sucesso!" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao gerar link", description: e.message, variant: "destructive" }),
  });

  // Desativa o atual e cria o novo na mesma transação (ver migration 20261106120000).
  const rotate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("rotate_client_portal_token" as never, {
        p_project_id: projectId!,
      } as never);
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Novo link gerado", description: "O link anterior deixou de funcionar." });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao regenerar link", description: e.message, variant: "destructive" }),
  });

  const deactivate = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("client_portal_tokens" as any)
        .update({ is_active: false } as any)
        .eq("id", tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Link desativado" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    activeToken: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createToken: create.mutateAsync,
    rotateToken: rotate.mutateAsync,
    deactivateToken: deactivate.mutateAsync,
    isCreating: create.isPending,
    isRotating: rotate.isPending,
    isDeactivating: deactivate.isPending,
  };
}
