import type { QueryClient } from "@tanstack/react-query";
import { REALTIME_TABLE_QUERY_KEYS } from "@/hooks/useRealtimeInvalidation";

/** Dado de projeto fica velho por no máximo 5 s entre dispositivos. */
export const PROJECT_SYNC_MS = 5_000;

/**
 * Sincronização mobile x desktop. O realtime (useRealtimeInvalidation) avisa
 * na hora; este refetch é a rede de segurança se o websocket cair ou estiver
 * bloqueado. Vale só para as queries de dados de projeto (prefixos do mapa
 * tabela -> queryKey): telas de conteúdo, blog, Instagram e dashboards
 * mantêm o padrão do QueryClient (5 min), sem carga extra.
 * Com a aba oculta não há polling (refetchIntervalInBackground: false).
 */
export function applyProjectSyncDefaults(client: QueryClient) {
  const prefixes = new Set(Object.values(REALTIME_TABLE_QUERY_KEYS).flat());
  for (const key of prefixes) {
    client.setQueryDefaults([key], {
      staleTime: PROJECT_SYNC_MS,
      refetchInterval: PROJECT_SYNC_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    });
  }
}
