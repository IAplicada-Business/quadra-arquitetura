import { useMemo } from "react";
import { Package, Truck, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMaterialTracking } from "@/hooks/useMaterialTracking";
import { InfoHint } from "@/components/visual/InfoHint";

/**
 * Vista de Inventário da obra — 3 colunas solicitadas na call de 16/04:
 *   1. "A comprar"     — quantidade que ainda precisa ser adquirida
 *   2. "Comprado"       — já foi comprado, ainda em trânsito (não entregue)
 *   3. "Em estoque"     — entregue na obra, ainda não utilizado
 *
 * Deriva dos campos existentes em material_tracking:
 *   a_comprar    = max(0, quantity_needed - quantity_purchased)
 *   em_transito  = max(0, quantity_purchased - quantity_delivered)
 *   em_estoque   = max(0, quantity_delivered - quantity_used)
 */
export function ProjectMaterialsInventory({ projectId }: { projectId: string }) {
  const tracking = useMaterialTracking(projectId);

  const { toBuy, inTransit, inStock } = useMemo(() => {
    const toBuy: Array<{ item: any; qty: number }> = [];
    const inTransit: Array<{ item: any; qty: number }> = [];
    const inStock: Array<{ item: any; qty: number }> = [];

    for (const item of tracking.items as any[]) {
      const needed = Number(item.quantity_needed ?? 0);
      const purchased = Number(item.quantity_purchased ?? 0);
      const delivered = Number(item.quantity_delivered ?? 0);
      const used = Number(item.quantity_used ?? 0);

      const pendingPurchase = Math.max(0, needed - purchased);
      const pendingDelivery = Math.max(0, purchased - delivered);
      const available = Math.max(0, delivered - used);

      if (pendingPurchase > 0) toBuy.push({ item, qty: pendingPurchase });
      if (pendingDelivery > 0) inTransit.push({ item, qty: pendingDelivery });
      if (available > 0) inStock.push({ item, qty: available });
    }

    return { toBuy, inTransit, inStock };
  }, [tracking.items]);

  if (tracking.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-1.5">
          Inventário
          <InfoHint>
            <span className="block">Visão rápida do que ainda precisa ser comprado, o que está a caminho e o que já está disponível no canteiro.</span>
            <span className="block mt-1.5">
              Calculado a partir de <em>necessário / comprado / entregue / usado</em> em cada material. Atualize esses campos em "Rastreamento" para refletir aqui.
            </span>
          </InfoHint>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* A comprar */}
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
              <ShoppingCart className="h-4 w-4" />
              A comprar
              <Badge variant="outline" className="ml-auto text-[10px] border-orange-300">
                {toBuy.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {toBuy.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nada pendente de compra.</p>
            ) : (
              toBuy.map(({ item, qty }) => (
                <InventoryRow key={`buy-${item.id}`} item={item} qty={qty} accent="text-orange-700" />
              ))
            )}
          </CardContent>
        </Card>

        {/* Comprado (em trânsito) */}
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <Truck className="h-4 w-4" />
              Comprado (a caminho)
              <Badge variant="outline" className="ml-auto text-[10px] border-amber-300">
                {inTransit.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {inTransit.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nada em trânsito.</p>
            ) : (
              inTransit.map(({ item, qty }) => (
                <InventoryRow key={`transit-${item.id}`} item={item} qty={qty} accent="text-amber-700" />
              ))
            )}
          </CardContent>
        </Card>

        {/* Em estoque */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
              <Package className="h-4 w-4" />
              Em estoque na obra
              <Badge variant="outline" className="ml-auto text-[10px] border-green-300">
                {inStock.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {inStock.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Canteiro sem estoque registrado.</p>
            ) : (
              inStock.map(({ item, qty }) => (
                <InventoryRow key={`stock-${item.id}`} item={item} qty={qty} accent="text-green-700" />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InventoryRow({ item, qty, accent }: { item: any; qty: number; accent: string }) {
  return (
    <div className="flex items-start justify-between gap-2 text-xs border-b last:border-0 pb-1.5 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate" title={item.material_name}>
          {item.material_name}
        </p>
        {item.discipline && (
          <p className="text-[10px] text-muted-foreground">{item.discipline}</p>
        )}
      </div>
      <div className={`text-right whitespace-nowrap font-semibold ${accent}`}>
        {qty.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
        {item.unit && <span className="text-[10px] text-muted-foreground ml-1">{item.unit}</span>}
      </div>
    </div>
  );
}
