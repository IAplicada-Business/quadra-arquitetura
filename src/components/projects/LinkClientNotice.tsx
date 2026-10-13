import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { suggestClient, type ClientOption } from "@/lib/clientSuggestion";

/**
 * Aviso para obra sem cliente vinculado, com a correção ali mesmo: escolher
 * um cliente já cadastrado e vincular. Sem cliente, {cliente} no onboarding
 * e no portal aparece como "Bem-vindos".
 */
export function LinkClientNotice({ projectId, projectName }: { projectId: string; projectName?: string }) {
  const queryClient = useQueryClient();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as ClientOption[];
    },
  });

  const suggestion = useMemo(() => suggestClient(projectName, clients), [projectName, clients]);
  const [clientId, setClientId] = useState<string>("");
  useEffect(() => {
    if (!clientId && suggestion) setClientId(suggestion.id);
  }, [suggestion, clientId]);

  const link = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").update({ client_id: id }).eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Cliente vinculado à obra", description: "O onboarding e o portal já usam o nome do cliente." });
    },
    onError: (e: Error) => toast({ title: "Erro ao vincular cliente", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2" role="alert" data-testid="link-client-notice">
      <p className="flex items-start gap-2 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          <strong>Esta obra não tem cliente vinculado.</strong> Onde o texto usa <code>{"{cliente}"}</code>, o onboarding e o portal mostram
          "Bem-vindos" em vez do nome. Vincule o cliente abaixo para corrigir.
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2 pl-6">
        <Select value={clientId} onValueChange={setClientId} disabled={isLoading || link.isPending}>
          <SelectTrigger className="h-8 w-64 bg-background text-sm" aria-label="Cliente da obra">
            <SelectValue placeholder={isLoading ? "Carregando clientes…" : "Escolha o cliente"} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name.trim()}
                {suggestion?.id === c.id ? " (sugerido)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => clientId && link.mutate(clientId)} disabled={!clientId || link.isPending}>
          <Link2 className="h-4 w-4 mr-1" /> {link.isPending ? "Vinculando…" : "Vincular cliente"}
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/clients">Cadastrar novo cliente</Link>
        </Button>
      </div>
    </div>
  );
}
