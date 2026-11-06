import { useState, useEffect, useMemo } from "react";
import { Copy, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface SupplierGroup {
  supplierName: string;
  totalEstimate: number;
  materials: { name: string; quantity: number | null; unit: string | null }[];
}

interface ShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export function ShoppingListDialog({ open, onOpenChange, projectId, projectName }: ShoppingListDialogProps) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SupplierGroup[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    const fetchData = async () => {
      // Fetch approved budget quotes with material_estimate > 0
      const { data: quotes } = await supabase
        .from("budget_quotes")
        .select("id, supplier_name, material_estimate, scope_item_id")
        .eq("project_id", projectId)
        .eq("status", "aprovado")
        .gt("material_estimate", 0);

      // Fetch active material tracking items
      const { data: materials } = await supabase
        .from("material_tracking")
        .select("material_name, quantity_needed, quantity_purchased, unit, supplier_name, budget_quote_id")
        .eq("project_id", projectId)
        .eq("is_active", true);

      const supplierMap: Record<string, SupplierGroup> = {};

      // Group quotes by supplier
      for (const q of quotes || []) {
        const name = q.supplier_name || "Sem fornecedor";
        if (!supplierMap[name]) {
          supplierMap[name] = { supplierName: name, totalEstimate: 0, materials: [] };
        }
        supplierMap[name].totalEstimate += q.material_estimate || 0;
      }

      // Add materials — filter those still needing purchase
      for (const m of materials || []) {
        const needed = m.quantity_needed ?? 0;
        const purchased = m.quantity_purchased ?? 0;
        if (needed <= 0 || purchased >= needed) continue;

        const name = m.supplier_name || "Sem fornecedor";
        if (!supplierMap[name]) {
          supplierMap[name] = { supplierName: name, totalEstimate: 0, materials: [] };
        }
        supplierMap[name].materials.push({
          name: m.material_name,
          quantity: needed - purchased,
          unit: m.unit,
        });
      }

      setGroups(Object.values(supplierMap).filter(g => g.materials.length > 0 || g.totalEstimate > 0));
      setLoading(false);
    };

    fetchData();
  }, [open, projectId]);

  const generateText = (group: SupplierGroup) => {
    let text = `*Lista de Compras — ${projectName}*\n*Fornecedor: ${group.supplierName}*\n\n`;
    for (const m of group.materials) {
      text += `• ${m.name} — ${m.quantity ?? "—"} ${m.unit || "un"}\n`;
    }
    text += `\nTotal estimado: ${formatCurrency(group.totalEstimate)}\nQuadra`;
    return text;
  };

  const generateAllText = () => {
    return groups.map(generateText).join("\n\n---\n\n");
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Lista copiada para a área de transferência" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Lista de Compras
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum material pendente encontrado. Aprove cotações com estimativa de material e adicione materiais ao rastreamento.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.supplierName}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{group.supplierName}</CardTitle>
                    <Badge variant="secondary">{formatCurrency(group.totalEstimate)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.materials.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {group.materials.map((m, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{m.name}</span>
                          <span className="text-muted-foreground ml-auto">
                            {m.quantity ?? "—"} {m.unit || "un"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">Estimativa de material sem itens detalhados no rastreamento.</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => copyToClipboard(generateText(group))}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar para WhatsApp
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button className="w-full" onClick={() => copyToClipboard(generateAllText())}>
              <Copy className="h-4 w-4 mr-1" /> Copiar tudo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
