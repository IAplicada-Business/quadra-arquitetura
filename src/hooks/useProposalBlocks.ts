import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  resolveProposalBlocks,
  type ProposalBlockRow,
  type ProposalBlockUpsert,
  type ProposalBlock,
} from "@/lib/proposalBlocks";
import { isCustomBlockKey } from "@/lib/proposalCustomBlocks";

export const PROPOSAL_BLOCKS_QUERY_KEY = ["proposal-blocks"] as const;

/**
 * Blocos configuráveis do PDF da proposta (tabela proposal_blocks).
 *
 * `blocks` já vem resolvido: linhas do banco mescladas com o padrão em
 * código, na ordem salva. Quem monta o PDF (LeadsProposals, LeadDetail)
 * só precisa passar `blocks` pro buildProposalPages.
 */
export function useProposalBlocks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PROPOSAL_BLOCKS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_blocks")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProposalBlockRow[];
    },
    enabled: !!user,
  });

  const blocks: ProposalBlock[] = useMemo(() => resolveProposalBlocks(query.data), [query.data]);

  const save = useMutation({
    mutationFn: async (upserts: ProposalBlockUpsert[]) => {
      const rows = upserts.map((u) => ({ ...u, user_id: user!.id }));
      // team_id é preenchido pelo DEFAULT (get_my_team_id) no banco;
      // o conflito em (team_id, key) atualiza a linha existente do time.
      const { error } = await supabase
        .from("proposal_blocks")
        .upsert(rows as never, { onConflict: "team_id,key" });
      if (error) throw error;

      // Blocos personalizados excluídos no editor: apaga as linhas do time
      // que não vieram no salvar. Blocos fixos nunca são apagados.
      const keep = new Set(upserts.map((u) => u.key));
      const removedIds = (query.data ?? []).filter((r) => isCustomBlockKey(r.key) && !keep.has(r.key)).map((r) => r.id);
      if (removedIds.length > 0) {
        const { error: delError } = await supabase.from("proposal_blocks").delete().in("id", removedIds);
        if (delError) throw delError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPOSAL_BLOCKS_QUERY_KEY });
      toast({ title: "Blocos da proposta salvos" });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar blocos", description: e.message, variant: "destructive" }),
  });

  return {
    rows: query.data ?? [],
    blocks,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    dataUpdatedAt: query.dataUpdatedAt,
    save,
  };
}
