/**
 * Tela "Compras" da Trilha do cliente: agrupa as compras da obra por
 * categoria e traduz o status interno para as quatro etapas do mockup
 * (Aguarda você → Pedido feito → Em rota → Na obra). Sem React nem Supabase.
 */
import type { PortalPurchase } from "@/lib/portal";

export type CompraEtapa = "decidir" | "pedido" | "rota" | "entregue";

export const COMPRA_ETAPAS: { key: CompraEtapa; label: string; passo: number }[] = [
  { key: "decidir", label: "Aguarda você", passo: 1 },
  { key: "pedido", label: "Pedido feito", passo: 2 },
  { key: "rota", label: "Em rota", passo: 3 },
  { key: "entregue", label: "Na obra", passo: 4 },
];

/** pendente → decidir; comprado → pedido; em_rota → rota; entregue/instalado → na obra. */
export function etapaDaCompra(status: string | null | undefined): CompraEtapa {
  switch ((status ?? "pendente").toLowerCase()) {
    case "comprado":
    case "pedido":
      return "pedido";
    case "em_rota":
    case "rota":
      return "rota";
    case "entregue":
    case "instalado":
      return "entregue";
    default:
      return "decidir";
  }
}

export interface CompraItem extends PortalPurchase {
  etapa: CompraEtapa;
  passo: number;
  valorNum: number;
}

export interface CompraCategoria {
  nome: string;
  itens: CompraItem[];
  total: number;
}

export interface ComprasResumo {
  total: number;
  porEtapa: Record<CompraEtapa, number>;
  categorias: CompraCategoria[];
}

export function resumirCompras(purchases: PortalPurchase[]): ComprasResumo {
  const porEtapa: Record<CompraEtapa, number> = { decidir: 0, pedido: 0, rota: 0, entregue: 0 };
  const cats = new Map<string, CompraCategoria>();
  let total = 0;
  for (const p of purchases) {
    const etapa = etapaDaCompra(p.status);
    const passo = COMPRA_ETAPAS.find((e) => e.key === etapa)!.passo;
    const valorNum = p.value ?? 0;
    const item: CompraItem = { ...p, etapa, passo, valorNum };
    porEtapa[etapa]++;
    total += valorNum;
    const nome = p.category?.trim() || "Diversos";
    const cat = cats.get(nome) ?? { nome, itens: [], total: 0 };
    cat.itens.push(item);
    cat.total += valorNum;
    cats.set(nome, cat);
  }
  const categorias = [...cats.values()]
    .map((c) => ({
      ...c,
      // "Aguarda você" primeiro; depois por prazo.
      itens: [...c.itens].sort((a, b) => a.passo - b.passo || (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")),
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  return { total, porEtapa, categorias };
}
