import { addDays, addWeeks, format } from "date-fns";

export type InstallmentInterval = "semanal" | "quinzenal" | "mensal";

export interface CotacaoInstallment {
  project_id: string;
  user_id: string;
  description: string;
  value: number;
  due_date: string;
  status: "pendente";
  source: "cotacao";
  installment_number: number;
  total_installments: number;
}

/** Parcelas geradas ao aprovar a cotação (uma linha por parcela, numeradas 1..n). */
export function buildCotacaoInstallments(args: {
  projectId: string;
  userId: string;
  total: number;
  count: number;
  startDate: Date;
  interval: InstallmentInterval | string;
}): CotacaoInstallment[] {
  const count = Math.max(1, Math.floor(args.count) || 1);
  const value = Math.round((args.total / count) * 100) / 100;
  return Array.from({ length: count }, (_, i) => {
    const due =
      args.interval === "semanal"
        ? addWeeks(args.startDate, i)
        : args.interval === "quinzenal"
          ? addDays(args.startDate, i * 15)
          : addDays(args.startDate, i * 30);
    return {
      project_id: args.projectId,
      user_id: args.userId,
      description: `Parcela ${i + 1}/${count} — Obra`,
      value,
      due_date: format(due, "yyyy-MM-dd"),
      status: "pendente" as const,
      source: "cotacao" as const,
      installment_number: i + 1,
      total_installments: count,
    };
  });
}

/**
 * Guarda de reentrância para ações assíncronas (duplo clique, duas abas).
 * `useRef` + função: a trava é síncrona, ao contrário de `setLoading(true)`,
 * que só vale depois do próximo render.
 */
export function createSingleFlight() {
  let running = false;
  return async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (running) return undefined;
    running = true;
    try {
      return await fn();
    } finally {
      running = false;
    }
  };
}
