import { describe, it, expect } from "vitest";
import { etapaDaCompra, resumirCompras } from "@/lib/portalCompras";
import type { PortalPurchase } from "@/lib/portal";

const p = (o: Partial<PortalPurchase> & { id: string }): PortalPurchase => ({
  name: o.id,
  category: null,
  supplier_name: null,
  value: null,
  deadline: null,
  status: "pendente",
  payment_info: null,
  product_link: null,
  ...o,
});

describe("etapaDaCompra", () => {
  it("traduz o status interno para as etapas do mockup", () => {
    expect(etapaDaCompra("pendente")).toBe("decidir");
    expect(etapaDaCompra(null)).toBe("decidir");
    expect(etapaDaCompra("comprado")).toBe("pedido");
    expect(etapaDaCompra("em_rota")).toBe("rota");
    expect(etapaDaCompra("entregue")).toBe("entregue");
    expect(etapaDaCompra("instalado")).toBe("entregue");
  });
});

describe("resumirCompras", () => {
  it("agrupa por categoria, soma totais e conta por etapa", () => {
    const r = resumirCompras([
      p({ id: "a", category: "Revestimentos", value: 100, status: "comprado" }),
      p({ id: "b", category: "Revestimentos", value: 50, status: "pendente", deadline: "2026-12-01" }),
      p({ id: "c", category: "Elétrica", value: 500, status: "entregue" }),
      p({ id: "d", category: "  ", value: null }),
    ]);
    expect(r.total).toBe(650);
    expect(r.porEtapa).toEqual({ decidir: 2, pedido: 1, rota: 0, entregue: 1 });
    expect(r.categorias.map((c) => c.nome)).toEqual(["Elétrica", "Revestimentos", "Diversos"]);
    // dentro da categoria, "aguarda você" vem primeiro
    expect(r.categorias[1].itens.map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("sem compras devolve resumo vazio", () => {
    expect(resumirCompras([])).toEqual({ total: 0, porEtapa: { decidir: 0, pedido: 0, rota: 0, entregue: 0 }, categorias: [] });
  });
});
