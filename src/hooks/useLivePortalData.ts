import { useCallback, useEffect, useRef, useState } from "react";
import type { PortalData } from "@/lib/portal";

/** Conferência periódica, para quando o aviso em tempo real não chega. */
export const PORTAL_POLL_MS = 15_000;
/** Junta rajadas de avisos (ex.: reordenar 30 atividades) numa recarga só. */
export const PORTAL_DEBOUNCE_MS = 300;

export function portalChannelTopic(token: string): string {
  return `portal:${token}`;
}

/**
 * Escuta o canal Realtime "portal:<token>". A migration
 * client_portal_live_updates manda um aviso nele a cada mudança na obra.
 * O cliente Supabase é carregado sob demanda para o portal não depender
 * dele para abrir; qualquer falha aqui só desliga o aviso instantâneo.
 */
function subscribePortalChanges(token: string, onChange: () => void): () => void {
  let cancelled = false;
  let cleanup = () => {};
  import("@/integrations/supabase/client")
    .then(({ supabase }) => {
      if (cancelled) return;
      const channel = supabase
        .channel(portalChannelTopic(token))
        .on("broadcast", { event: "portal_changed" }, () => onChange())
        .subscribe();
      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    })
    .catch(() => {
      /* sem Realtime: fica a conferência periódica */
    });
  return () => {
    cancelled = true;
    cleanup();
  };
}

async function fetchPortalData(token: string): Promise<PortalData> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-client-portal-data`;
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ token }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erro desconhecido");
  return json as PortalData;
}

/**
 * Dados do portal sempre atuais: carrega uma vez e recarrega em silêncio
 * (sem esqueleto, sem perder a rolagem) quando
 *  - a equipe muda algo na obra (aviso em tempo real),
 *  - o cliente volta para a aba, ou a internet volta,
 *  - a cada PORTAL_POLL_MS com a aba visível.
 * Uma recarga que falha mantém os dados que já estão na tela.
 */
export function useLivePortalData(token: string | undefined) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const requestId = useRef(0);
  const hasData = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    const id = ++requestId.current;
    try {
      const next = await fetchPortalData(token);
      if (id !== requestId.current) return; // chegou uma resposta mais nova
      hasData.current = true;
      setData(next);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      if (id !== requestId.current) return;
      if (!hasData.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [token]);

  // Primeira carga.
  useEffect(() => {
    hasData.current = false;
    setLoading(true);
    void load();
  }, [load]);

  // Aviso em tempo real, agrupando rajadas.
  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribePortalChanges(token, () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), PORTAL_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [token, load]);

  // Volta para a aba, internet volta e conferência periódica.
  useEffect(() => {
    if (!token) return;
    const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
    const onVisible = () => {
      if (visible()) void load();
    };
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(onVisible, PORTAL_POLL_MS);
    return () => {
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [token, load]);

  return { data, setData, error, loading, updatedAt, refresh: load };
}
