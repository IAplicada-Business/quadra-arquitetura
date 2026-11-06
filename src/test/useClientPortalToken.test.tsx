import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({
  selectRows: [] as unknown[],
  selectError: null as unknown,
  insertResult: { data: null as unknown, error: null as unknown },
  rpc: vi.fn(),
  orderArgs: [] as unknown[],
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    rpc: (...a: unknown[]) => m.rpc(...a),
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const k of ["select", "eq", "update"]) chain[k] = () => chain;
      chain.order = (...a: unknown[]) => { m.orderArgs.push(a); return chain; };
      chain.limit = () => Promise.resolve({ data: m.selectRows, error: m.selectError });
      chain.insert = () => ({ select: () => ({ single: () => Promise.resolve(m.insertResult) }) });
      return chain;
    },
  },
}));

import { useClientPortalToken } from "@/hooks/useClientPortalToken";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

describe("useClientPortalToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.selectRows = [];
    m.selectError = null;
    m.orderArgs = [];
    m.insertResult = { data: null, error: null };
  });

  it("com dois ativos devolve o mais novo (consulta ordenada por created_at desc)", async () => {
    m.selectRows = [{ id: "novo", token: "t2" }, { id: "velho", token: "t1" }];
    const { result } = renderHook(() => useClientPortalToken("p1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeToken.id).toBe("novo");
    expect(m.orderArgs[0]).toEqual(["created_at", { ascending: false }]);
  });

  it("erro de consulta vira isError, não 'sem link'", async () => {
    m.selectError = { message: "boom" };
    const { result } = renderHook(() => useClientPortalToken("p1"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("createToken com 23505 devolve o link ativo existente", async () => {
    m.insertResult = { data: null, error: { code: "23505", message: "duplicate" } };
    m.selectRows = [{ id: "existente", token: "t9" }];
    const { result } = renderHook(() => useClientPortalToken("p1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let out: { id: string } | undefined;
    await act(async () => { out = await result.current.createToken(); });
    expect(out?.id).toBe("existente");
  });

  it("regenerar chama a RPC de rotação atômica", async () => {
    m.rpc.mockResolvedValue({ data: { id: "n" }, error: null });
    const { result } = renderHook(() => useClientPortalToken("p1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.rotateToken(); });
    expect(m.rpc).toHaveBeenCalledWith("rotate_client_portal_token", { p_project_id: "p1" });
  });
});
