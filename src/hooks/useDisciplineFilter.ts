import { useCallback, useSyncExternalStore } from "react";

/**
 * Filtro de disciplinas (multi-seleção) compartilhado, por obra, entre a
 * lista de compras, os pagamentos e o gráfico da prestação de contas.
 * Store em memória: qualquer componente da mesma obra enxerga a mesma seleção.
 */
const store = new Map<string, string[]>();
const listeners = new Set<() => void>();
const EMPTY: string[] = [];

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useDisciplineFilter(projectId: string | undefined) {
  const key = projectId ?? "";
  const selected = useSyncExternalStore(
    subscribe,
    () => store.get(key) ?? EMPTY,
    () => EMPTY,
  );
  const setSelected = useCallback(
    (next: string[]) => {
      store.set(key, next);
      listeners.forEach((l) => l());
    },
    [key],
  );
  return { selected, setSelected };
}
