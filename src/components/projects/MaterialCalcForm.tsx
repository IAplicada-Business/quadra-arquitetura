import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORIES = [
  "Tijolos", "Revestimentos", "Argamassa", "Reboco", "Contrapiso",
  "Elétrica", "Pintura", "Hidráulica", "Forro", "Impermeabilização", "Outros"
];

interface MaterialCalcFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    category: string;
    item_name: string;
    unit?: string;
    quantity?: number;
    parameters?: string;
    notes?: string;
  }) => void;
  initialData?: Record<string, unknown> | null;
  isLoading?: boolean;
}

export function MaterialCalcForm({ open, onOpenChange, onSubmit, initialData, isLoading }: MaterialCalcFormProps) {
  const [category, setCategory] = useState(initialData?.category as string || "");
  const [itemName, setItemName] = useState(initialData?.item_name as string || "");
  const [unit, setUnit] = useState(initialData?.unit as string || "");
  const [quantity, setQuantity] = useState(initialData?.quantity ? String(initialData.quantity) : "");
  const [area, setArea] = useState("");
  const [lossFactor, setLossFactor] = useState("1.05");
  const [notes, setNotes] = useState(initialData?.notes as string || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !itemName) return;

    const params: Record<string, unknown> = {};
    if (area) params.area = Number(area);
    if (lossFactor) params.loss_factor = Number(lossFactor);

    onSubmit({
      category,
      item_name: itemName,
      unit: unit || undefined,
      quantity: quantity ? Number(quantity) : undefined,
      parameters: JSON.stringify(params),
      notes: notes || undefined,
    });
    onOpenChange(false);
    // Reset
    setCategory(""); setItemName(""); setUnit(""); setQuantity("");
    setArea(""); setLossFactor("1.05"); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-display">
            {initialData ? "Editar Item" : "Novo Item de Cálculo"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nome do Item</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Ex: Tijolo 14cm, Porcelanato 60x60..." required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Unidade</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m², un, m³, saco" />
            </div>
            <div>
              <Label>Área (m²)</Label>
              <Input type="number" step="0.01" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Área" />
            </div>
            <div>
              <Label>Fator de Perda</Label>
              <Input type="number" step="0.01" value={lossFactor} onChange={(e) => setLossFactor(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Quantidade Calculada</Label>
            <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantidade final" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notas adicionais..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{initialData ? "Salvar" : "Adicionar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
