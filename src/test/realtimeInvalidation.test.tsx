import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { REALTIME_DEBOUNCE_MS, REALTIME_TABLE_QUERY_KEYS, useRealtimeInvalidation } from "@/hooks/useRealtimeInvalidation";
import { applyProjectSyncDefaults, PROJECT_SYNC_MS } from "@/lib/queryDefaults";

const rt = vi.hoisted(() => ({
  handlers: {} as Record<string, () => void>,
  status: null as null | ((s: string) => void),
  removed: 0,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const ch = {
        on: (_t: string, f: { table: string }, cb: () => void) => {
          rt.handlers[f.table] = cb;
          return ch;
        },
        subscribe: (cb: (s: string) => void) => {
          rt.status = cb;
          return ch;
        },
      };
      return ch;
    },
    removeChannel: async () => {
      rt.removed++;
    },
  },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

function Probe() {
  useRealtimeInvalidation();
  return null;
}

let client: QueryClient;
let invalidate: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers();
  rt.handlers = {};
  rt.removed = 0;
  client = new QueryClient();
  invalidate = vi.spyOn(client, "invalidateQueries");
});
afterEach(() => vi.useRealTimers());

const mount = () =>
  render(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );

describe("sincronização entre dispositivos", () => {
  it("assina todas as tabelas de projeto do mapa", () => {
    mount();
    expect(Object.keys(rt.handlers).sort()).toEqual(Object.keys(REALTIME_TABLE_QUERY_KEYS).sort());
  });

  it("mudança numa tabela invalida só as queries dela, em rajada única", () => {
    mount();
    act(() => {
      rt.handlers["budget_quotes"]();
      rt.handlers["budget_quotes"]();
      rt.handlers["scenario_items"]();
    });
    expect(invalidate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS + 10);
    });
    const keys = invalidate.mock.calls.map((c) => (c[0] as { queryKey: string[] }).queryKey[0]).sort();
    expect(keys).toEqual(["budget_quotes", "scenarios"]);
  });

  it("reconectar depois de uma queda recarrega tudo; a primeira conexão não", () => {
    mount();
    act(() => rt.status?.("SUBSCRIBED"));
    act(() => {
      vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS + 10);
    });
    expect(invalidate).not.toHaveBeenCalled();

    act(() => rt.status?.("CHANNEL_ERROR"));
    act(() => rt.status?.("SUBSCRIBED"));
    act(() => {
      vi.advanceTimersByTime(REALTIME_DEBOUNCE_MS + 10);
    });
    expect(invalidate.mock.calls.length).toBeGreaterThan(5);
  });

  it("remove o canal ao desmontar", () => {
    const { unmount } = mount();
    unmount();
    expect(rt.removed).toBe(1);
  });

  it("rede de segurança: só queries de projeto atualizam a cada 5 s", () => {
    applyProjectSyncDefaults(client);
    expect(client.getQueryDefaults(["schedule_tasks", "p1"])).toMatchObject({
      staleTime: PROJECT_SYNC_MS,
      refetchInterval: PROJECT_SYNC_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    });
    expect(client.getQueryDefaults(["instagram_metrics"]).refetchInterval).toBeUndefined();
    expect(PROJECT_SYNC_MS).toBeLessThanOrEqual(5000);
  });
});
