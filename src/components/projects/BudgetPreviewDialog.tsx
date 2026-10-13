import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileDown, Save } from "lucide-react";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { useMaterialIndices } from "@/hooks/useMaterialIndices";
import { usePriceResearch } from "@/hooks/usePriceResearch";
import { useLaborCosts } from "@/hooks/useLaborCosts";
import { useBudgetQuotes } from "@/hooks/useBudgetQuotes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { computeActivityCost } from "@/lib/budgetImport";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface ActivityLine {
  activityId: string;
  activityName: string;
  discipline: string | null;
  areaM2: number;
  materialCost: number;
  laborCost: number;
  total: number;
  confidence: "green" | "yellow" | "grey";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName: string;
  /** Revisão aberta na aba (as cotações salvas entram nela). */
  revisionNumber?: number;
}

export function BudgetPreviewDialog({ open, onOpenChange, projectId, projectName, revisionNumber = 1 }: Props) {
  const { activities } = useProjectActivities(projectId);
  const { indices } = useMaterialIndices();
  const { research } = usePriceResearch(projectId);
  const { laborCosts } = useLaborCosts();
  const { create: createQuote } = useBudgetQuotes(projectId);
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Mesmo cálculo da importação (src/lib/budgetImport.ts).
  const lines = useMemo<ActivityLine[]>(() => {
    const now = new Date();
    return activities
      .filter((a) => a.area_m2 && a.area_m2 > 0)
      .map((activity) => {
        const cost = computeActivityCost(activity, { indices, research, laborCosts }, now);
        return {
          activityId: activity.id,
          activityName: activity.name,
          discipline: activity.discipline,
          areaM2: activity.area_m2 || 0,
          materialCost: cost.materialCost,
          laborCost: cost.laborCost,
          total: cost.total,
          confidence: cost.confidence,
        };
      });
  }, [activities, indices, research, laborCosts]);

  const grouped = useMemo(() => {
    const groups: Record<string, { lines: ActivityLine[]; subtotal: number }> = {};
    for (const line of lines) {
      const key = line.discipline || "Sem disciplina";
      if (!groups[key]) groups[key] = { lines: [], subtotal: 0 };
      groups[key].lines.push(line);
      groups[key].subtotal += line.total;
    }
    return groups;
  }, [lines]);

  const totalGeral = lines.reduce((sum, l) => sum + l.total, 0);

  const confidenceBadge = (c: "green" | "yellow" | "grey") => {
    if (c === "green") return <Badge className="bg-green-600 text-[10px]">Pesquisado</Badge>;
    if (c === "yellow") return <Badge className="bg-yellow-500 text-[10px]">7-30 dias</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Manual</Badge>;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.text("Prévia do Orçamento Executivo", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.text(`Projeto: ${projectName}`, 14, y);
    y += 5;
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, y);
    y += 10;

    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const cols = [14, 60, 85, 105, 130, 155, 180];
    const headers = ["Atividade", "Disciplina", "Área m²", "Material", "Mão de Obra", "Total", "Conf."];
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 2;
    doc.line(14, y, pageWidth - 14, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line.activityName.substring(0, 25), cols[0], y);
      doc.text((line.discipline || "-").substring(0, 12), cols[1], y);
      doc.text(String(line.areaM2), cols[2], y);
      doc.text(formatCurrency(line.materialCost), cols[3], y);
      doc.text(formatCurrency(line.laborCost), cols[4], y);
      doc.text(formatCurrency(line.total), cols[5], y);
      doc.text(line.confidence === "green" ? "✓" : line.confidence === "yellow" ? "~" : "-", cols[6], y);
      y += 6;
    }

    y += 4;
    doc.line(14, y, pageWidth - 14, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`TOTAL GERAL: ${formatCurrency(totalGeral)}`, 14, y);

    doc.save(`orcamento-previo-${projectName.replace(/\s+/g, "-")}.pdf`);
    toast({ title: "PDF exportado com sucesso" });
  };

  const handleSaveAsQuote = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const line of lines) {
        if (line.total > 0) {
          await createQuote.mutateAsync({
            supplier_name: "Prévia automática",
            services_description: line.activityName,
            activity_id: line.activityId,
            discipline: line.discipline,
            value: line.laborCost > 0 ? line.laborCost : null,
            material_estimate: line.materialCost > 0 ? line.materialCost : null,
            status: "cotado",
            revision_number: revisionNumber,
            revision: `Rev ${revisionNumber}`,
            is_current_revision: true,
          });
        }
      }
      toast({ title: "Cotações criadas a partir da prévia" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar cotações", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prévia do Orçamento Executivo</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Composição automática baseada em atividades, índices de material e custos de mão de obra
          </p>
        </DialogHeader>

        {lines.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma atividade com área (m²) preenchida. Cadastre atividades na aba Escopo.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([disc, group]) => (
              <div key={disc}>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="secondary">{disc}</Badge>
                  <span className="text-sm font-semibold text-primary">{formatCurrency(group.subtotal)}</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atividade</TableHead>
                      <TableHead className="text-right">Área m²</TableHead>
                      <TableHead className="text-right">Material</TableHead>
                      <TableHead className="text-right">Mão de Obra</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Confiança</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.lines.map((line) => (
                      <TableRow key={line.activityId}>
                        <TableCell className="font-medium">{line.activityName}</TableCell>
                        <TableCell className="text-right">{line.areaM2}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.materialCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.laborCost)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(line.total)}</TableCell>
                        <TableCell className="text-center">{confidenceBadge(line.confidence)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}

            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-lg font-semibold">Total Geral</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</span>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p><Badge className="bg-green-600 text-[10px] mr-1">Pesquisado</Badge> Preço pesquisado há menos de 7 dias</p>
              <p><Badge className="bg-yellow-500 text-[10px] mr-1">7-30 dias</Badge> Preço pesquisado entre 7 e 30 dias</p>
              <p><Badge variant="secondary" className="text-[10px] mr-1">Manual</Badge> Sem pesquisa de preço ou preço manual</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={lines.length === 0}>
            <FileDown className="h-4 w-4 mr-1.5" /> Exportar PDF
          </Button>
          <Button onClick={handleSaveAsQuote} disabled={lines.length === 0 || saving}>
            <Save className="h-4 w-4 mr-1.5" /> Salvar como Cotação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
