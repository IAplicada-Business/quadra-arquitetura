import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Junta rajadas de mudanças (ex.: reordenar 30 atividades) numa invalidação só. */
export const REALTIME_DEBOUNCE_MS = 300;

/**
 * Tabela do banco -> prefixos de queryKey do React Query que devem ser
 * recarregados quando alguém (em outro dispositivo, ou o portal) a altera.
 * Cada tabela precisa estar na publicação `supabase_realtime`
 * (migration `20261113150000_realtime_publication.sql`).
 */
export const REALTIME_TABLE_QUERY_KEYS: Record<string, string[]> = {
  projects: ["projects", "project"],
  schedule_tasks: ["schedule_tasks"],
  schedule_scenarios: ["schedule_scenarios"],
  project_activities: ["project_activities"],
  scope_items: ["scope_items"],
  budget_quotes: ["budget_quotes"],
  budget_quote_items: ["budget_quote_items"],
  budget_discipline_suppliers: ["budget_discipline_suppliers"],
  scenarios: ["scenarios"],
  scenario_items: ["scenarios"],
  budget_approval_events: ["scenarios", "budget_approval_events"],
  payments: ["payments"],
  invoices: ["invoices", "invoices_nf"],
  purchases: ["purchases"],
  material_tracking: ["material_tracking"],
  supplier_scopes: ["supplier_scopes"],
  supplier_allocations: ["supplier_allocations"],
  weekly_reports: ["weekly_reports"],
  site_diary_entries: ["site_diary"],
  site_visits: ["site_visits"],
  client_closing_schedule: ["client_closing_schedule"],
  pending_items: ["pending_items"],
};

/**
 * Mantém as telas da equipe em sincronia entre dispositivos: qualquer
 * mudança nas tabelas acima invalida o cache correspondente na hora.
 * É a parte "instantânea"; a rede de segurança é o refetch periódico do
 * QueryClient (src/App.tsx). Monte uma vez, no layout autenticado.
 */
export function useRealtimeInvalidation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      for (const key of pending) queryClient.invalidateQueries({ queryKey: [key] });
      pending.clear();
    };
    const schedule = (table: string) => {
      for (const key of REALTIME_TABLE_QUERY_KEYS[table] ?? []) pending.add(key);
      clearTimeout(timer);
      timer = setTimeout(flush, REALTIME_DEBOUNCE_MS);
    };

    // Nome único por instância (mesmo motivo de useNotifications): evita
    // receber o canal já inscrito e quebrar o `.on()` depois do `.subscribe()`.
    let channel = supabase.channel(`staff-sync-${user.id}-${Math.random().toString(36).slice(2)}`);
    for (const table of Object.keys(REALTIME_TABLE_QUERY_KEYS)) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => schedule(table));
    }
    let lost = false;
    channel.subscribe((status: string) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") lost = true;
      // Reconectou depois de uma queda: pode ter perdido eventos, recarrega tudo.
      if (status === "SUBSCRIBED" && lost) {
        lost = false;
        for (const keys of Object.values(REALTIME_TABLE_QUERY_KEYS)) for (const k of keys) pending.add(k);
        clearTimeout(timer);
        timer = setTimeout(flush, REALTIME_DEBOUNCE_MS);
      }
    });

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}
