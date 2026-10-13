import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Download, ChevronDown, ChevronRight, CheckCheck, MessageSquare, Sparkles, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProjectPayments } from "@/hooks/useProjectPayments";
import { useInvoices } from "@/hooks/useInvoices";
import { useProjectPurchases } from "@/hooks/useProjectPurchases";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentForm } from "./PaymentForm";
import { InvoiceForm } from "./InvoiceForm";
import { InvoiceNFList } from "./InvoiceNFList";
import jsPDF from "jspdf";
import { toast } from "@/hooks/use-toast";
import { SendMessageModal } from "@/components/messages/SendMessageModal";
import { useProjectAI } from "@/hooks/useProjectAI";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning-ink border-warning/30" },
  notificado: { label: "Notificado", className: "bg-primary/15 text-primary border-primary/30" },
  pago: { label: "Pago", className: "bg-success/15 text-success border-success/30" },
  atrasado: { label: "Atrasado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

function MarginBadge({ margin }: { margin: number }) {
  const color = margin > 20 ? "bg-success/15 text-success" : margin >= 10 ? "bg-warning/15 text-warning-ink" : "bg-destructive/15 text-destructive";
  return <Badge variant="outline" className={`${color} text-sm font-bold`}>{margin.toFixed(1)}%</Badge>;
}

function DRERow({ label, value, total, bold, negative }: { label: string; value: number; total: number; bold: boolean; negative?: boolean }) {
  const pct = total > 0 ? Math.abs(value / total) * 100 : 0;
  return (
    <div className={`flex items-center justify-between py-1.5 px-3 ${bold ? "font-bold" : ""}`}>
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-4">
        <span className={`text-sm tabular-nums ${negative ? "text-destructive" : ""}`}>
          {formatCurrency(Math.abs(value))}
        </span>
        <span className="text-xs text-muted-foreground w-14 text-right tabular-nums">{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

type DREData = {
  receitaHonorarios: number; receitaObra: number; receitaTotal: number;
  despesasFornecedores: number; despesasCompras: number; despesasTotal: number;
  resultadoBruto: number; impostos: number; resultadoLiquido: number;
  margem: number; rate: number;
};

function exportDREPdf(dre: DREData, projectName?: string) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Quadra Arquitetura", 20, 20);
  doc.setFontSize(12);
  doc.text(`Demonstrativo de Resultado do Projeto — ${projectName || "Projeto"}`, 20, 30);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, 38);
  doc.setFontSize(10);
  const lines: [string, string][] = [
    ["(+) Receita Honorários", formatCurrency(dre.receitaHonorarios)],
    ["(+) Receita Obra", formatCurrency(dre.receitaObra)],
    ["(=) RECEITA TOTAL", formatCurrency(dre.receitaTotal)],
    ["", ""],
    ["(−) Despesas Fornecedores", formatCurrency(dre.despesasFornecedores)],
    ["(−) Compras", formatCurrency(dre.despesasCompras)],
    ["(=) RESULTADO BRUTO", formatCurrency(dre.resultadoBruto)],
    ["", ""],
    [`(−) Impostos (${dre.rate}%)`, formatCurrency(dre.impostos)],
    ["(=) RESULTADO LÍQUIDO", formatCurrency(dre.resultadoLiquido)],
    ["", ""],
    ["MARGEM", `${dre.margem.toFixed(1)}%`],
  ];
  let y = 50;
  for (const [label, val] of lines) {
    if (!label) { y += 4; continue; }
    const isBold = label.startsWith("(=)") || label === "MARGEM";
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(label, 20, y);
    doc.text(val, 190, y, { align: "right" });
    y += 7;
  }
  doc.save(`Resultado_Projeto_${(projectName || "projeto").replace(/\s+/g, "_")}.pdf`);
}

export function ProjectFinancialTab({ projectId, projectName, clientName, clientPhone }: { projectId: string; projectName?: string; clientName?: string; clientPhone?: string }) {
  const { user } = useAuth();
  const payments = useProjectPayments(projectId);
  const invoices = useInvoices(projectId);
  const purchases = useProjectPurchases(projectId);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [invoiceFormOpen, setInvoiceFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Record<string, unknown> | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Record<string, unknown> | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [msgOpen, setMsgOpen] = useState(false);
  const { callAction, loading: aiLoading } = useProjectAI();
  const { activities } = useProjectActivities(projectId);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);

  // Tax rate from settings
  const { data: taxRate } = useQuery({
    queryKey: ["settings-tax-rate"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      return (data as any)?.tax_rate_percent ?? 6;
    },
    enabled: !!user,
  });

  // DRE calculations
  const dre = useMemo(() => {
    const rate = taxRate ?? 6;
    const receitaHonorarios = payments.items
      .filter((p) => p.source === "escritorio" && p.status === "pago")
      .reduce((s, p) => s + p.value, 0);
    const receitaObra = payments.items
      .filter((p) => p.source === "obra" && p.value > 0 && p.description?.toLowerCase().includes("receita"))
      .reduce((s, p) => s + p.value, 0);
    const receitaTotal = receitaHonorarios + receitaObra;

    const despesasFornecedores = payments.items
      .filter((p) => (p.source === "obra" || p.source === "cotacao") && p.status === "pago" && !p.description?.toLowerCase().includes("receita"))
      .reduce((s, p) => s + p.value, 0);
    const despesasCompras = purchases.items.reduce((s, p) => s + (p.value || 0), 0);
    const despesasTotal = despesasFornecedores + despesasCompras;

    const resultadoBruto = receitaTotal - despesasTotal;
    const impostos = receitaTotal * (rate / 100);
    const resultadoLiquido = resultadoBruto - impostos;
    const margem = receitaTotal > 0 ? (resultadoLiquido / receitaTotal) * 100 : 0;

    return {
      receitaHonorarios, receitaObra, receitaTotal,
      despesasFornecedores, despesasCompras, despesasTotal,
      resultadoBruto, impostos, resultadoLiquido, margem, rate,
    };
  }, [payments.items, purchases.items, taxRate]);

  // Payment totals
  const paymentTotals = useMemo(() => {
    const paid = payments.items.filter((p) => p.status === "pago").reduce((s, p) => s + p.value, 0);
    const pending = payments.items.filter((p) => p.status !== "pago").reduce((s, p) => s + p.value, 0);
    return { paid, pending, total: paid + pending };
  }, [payments.items]);

  // Group payments: parent rows + children
  const { parentRows, childrenMap } = useMemo(() => {
    const children = new Map<string, typeof payments.items>();
    const parentIds = new Set<string>();

    // Find all children (have parent_payment_id)
    for (const p of payments.items) {
      const parentId = (p as any).parent_payment_id as string | null;
      if (parentId) {
        if (!children.has(parentId)) children.set(parentId, []);
        children.get(parentId)!.push(p);
        parentIds.add(parentId);
      }
    }

    // Parent rows = items that are NOT children themselves
    const parents = payments.items.filter((p) => !(p as any).parent_payment_id);

    return { parentRows: parents, childrenMap: children };
  }, [payments.items]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Invoice totals grouped by category
  const invoiceGroups = useMemo(() => {
    const groups: Record<string, { items: typeof invoices.items; total: number }> = {};
    for (const inv of invoices.items) {
      const cat = inv.category || "Diversos";
      if (!groups[cat]) groups[cat] = { items: [], total: 0 };
      groups[cat].items.push(inv);
      groups[cat].total += inv.value || 0;
    }
    return groups;
  }, [invoices.items]);

  const invoiceTotal = invoices.items.reduce((s, i) => s + (i.value || 0), 0);

  const renderPaymentRow = (p: typeof payments.items[0], isChild = false) => {
    const st = paymentStatusConfig[p.status || "pendente"];
    const kids = childrenMap.get(p.id);
    const hasKids = !!kids && kids.length > 0;
    const isExpanded = expandedGroups.has(p.id);
    const groupHasUnpaid = hasKids && (
      p.status !== "pago" || kids.some((k) => k.status !== "pago")
    );

    return (
      <TableRow key={p.id} className={isChild ? "bg-muted/30" : ""}>
        <TableCell className={`font-medium ${isChild ? "pl-8" : ""}`}>
          <div className="flex items-center gap-1.5">
            {hasKids && (
              <Button size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={() => toggleGroup(p.id)}>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            )}
            <span>{p.description || "—"}</span>
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold">{formatCurrency(p.value)}</TableCell>
        <TableCell>{formatDate(p.due_date)}</TableCell>
        <TableCell>{formatDate(p.paid_date)}</TableCell>
        <TableCell>
          {p.installment_number && p.total_installments ? (
            <Badge
              variant="outline"
              className="cursor-pointer bg-primary/10 text-primary border-primary/30 text-xs"
              onClick={() => hasKids && toggleGroup(p.id)}
            >
              {p.installment_number}/{p.total_installments}
            </Badge>
          ) : "—"}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={st?.className}>{st?.label || p.status}</Badge>
            {p.source === "cotacao" && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">Gerado da cotação</Badge>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            {groupHasUnpaid && !isChild && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-success"
                onClick={() => payments.payRemaining.mutate(p.id)}
                disabled={payments.payRemaining.isPending}
                title="Quitar restantes"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Quitar
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingPayment(p as Record<string, unknown>); setPaymentFormOpen(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => payments.remove.mutate(p.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="pagamentos">
        <TabsList>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="notas">NF Compras</TabsTrigger>
          <TabsTrigger value="dre">Resultado do Projeto</TabsTrigger>
        </TabsList>

        <TabsContent value="pagamentos" className="space-y-4 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Pago</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold text-success">{formatCurrency(paymentTotals.paid)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Pendente</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold text-warning-ink">{formatCurrency(paymentTotals.pending)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Geral</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold text-display">{formatCurrency(paymentTotals.total)}</p></CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-display">Fluxo de Pagamentos</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setMsgOpen(true)} disabled={!clientPhone}>
                <MessageSquare className="h-4 w-4 mr-1" /> Enviar Mensagem
              </Button>
              <Button size="sm" onClick={() => { setEditingPayment(null); setPaymentFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Novo Pagamento
              </Button>
            </div>
          </div>

          {payments.isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : payments.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhum pagamento cadastrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {parentRows.map((p) => {
                  const kids = childrenMap.get(p.id);
                  const isExpanded = expandedGroups.has(p.id);
                  return (
                    <>{renderPaymentRow(p)}
                      {isExpanded && kids?.map((child) => renderPaymentRow(child, true))}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="notas" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-display">Notas Fiscais</h3>
              <p className="text-sm text-muted-foreground">Total: {formatCurrency(invoiceTotal)}</p>
            </div>
            <Button size="sm" onClick={() => { setEditingInvoice(null); setInvoiceFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova NF
            </Button>
          </div>

          {invoices.isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : Object.keys(invoiceGroups).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhuma nota fiscal cadastrada.
            </div>
          ) : (
            Object.entries(invoiceGroups).map(([category, { items: catItems, total }]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-display">{category}</h4>
                  <span className="text-sm font-medium text-primary">{formatCurrency(total)}</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Nº</TableHead>
                      <TableHead>Lugar</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catItems.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.invoice_number || "—"}</TableCell>
                        <TableCell>{inv.store_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{inv.description || "—"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.value)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingInvoice(inv as Record<string, unknown>); setInvoiceFormOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => invoices.remove.mutate(inv.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="dre" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-display">Demonstrativo de Resultado do Projeto</h3>
              <p className="text-sm text-muted-foreground">Receitas e despesas desta obra. O DRE do escritório fica no Dashboard Financeiro.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={aiLoading} onClick={async () => {
                const progresso = activities.length > 0
                  ? Math.round(activities.filter(a => a.status === "concluida").length / activities.length * 100) : 0;
                const result = await callAction(projectId, "financial_analysis", {
                  receita: dre.receitaTotal, despesas: dre.despesasTotal,
                  pendentes: paymentTotals.pending, progresso,
                });
                if (result) { setAiAnalysis(result); setAiAnalysisOpen(true); }
              }}>
                {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Análise financeira com IA
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportDREPdf(dre, projectName)}>
                <Download className="h-4 w-4 mr-1" /> Exportar demonstrativo
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-1">
                <DRERow label="(+) Receita Honorários" value={dre.receitaHonorarios} total={dre.receitaTotal} bold={false} />
                <DRERow label="(+) Receita Obra" value={dre.receitaObra} total={dre.receitaTotal} bold={false} />
                <div className="border-t border-border my-2" />
                <DRERow label="(=) RECEITA TOTAL" value={dre.receitaTotal} total={dre.receitaTotal} bold />

                <div className="h-3" />
                <DRERow label="(−) Despesas Fornecedores" value={-dre.despesasFornecedores} total={dre.receitaTotal} bold={false} negative />
                <DRERow label="(−) Compras" value={-dre.despesasCompras} total={dre.receitaTotal} bold={false} negative />
                <div className="border-t border-border my-2" />
                <DRERow label="(=) RESULTADO BRUTO" value={dre.resultadoBruto} total={dre.receitaTotal} bold />

                <div className="h-3" />
                <DRERow label={`(−) Impostos Estimados (${dre.rate}%)`} value={-dre.impostos} total={dre.receitaTotal} bold={false} negative />
                <div className="border-t border-border my-2" />
                <DRERow label="(=) RESULTADO LÍQUIDO" value={dre.resultadoLiquido} total={dre.receitaTotal} bold />

                <div className="h-3" />
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                  <span className="font-bold text-sm">MARGEM</span>
                  <MarginBadge margin={dre.margem} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentForm
        open={paymentFormOpen}
        onOpenChange={setPaymentFormOpen}
        onSubmit={(data) => {
          if (editingPayment) {
            payments.update.mutate({ id: editingPayment.id as string, ...data });
          } else {
            payments.create.mutate(data);
          }
          setEditingPayment(null);
        }}
        onSubmitInstallments={(data) => {
          payments.createInstallments.mutate(data);
          setEditingPayment(null);
        }}
        initialData={editingPayment}
        isLoading={payments.create.isPending || payments.update.isPending || payments.createInstallments.isPending}
      />

      <InvoiceForm
        open={invoiceFormOpen}
        onOpenChange={setInvoiceFormOpen}
        onSubmit={(data) => {
          if (editingInvoice) {
            invoices.update.mutate({ id: editingInvoice.id as string, ...data });
          } else {
            invoices.create.mutate(data);
          }
          setEditingInvoice(null);
        }}
        initialData={editingInvoice}
        isLoading={invoices.create.isPending || invoices.update.isPending}
      />
      <SendMessageModal
        open={msgOpen}
        onOpenChange={setMsgOpen}
        category="financeiro"
        phone={clientPhone || ""}
        context={{
          nome_cliente: clientName || "",
          projeto: projectName || "",
        }}
      />

      {/* AI Financial Analysis Modal */}
      <Dialog open={aiAnalysisOpen} onOpenChange={setAiAnalysisOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Análise Financeira com IA</DialogTitle>
          </DialogHeader>
          {aiAnalysis && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="text-sm whitespace-pre-wrap">{aiAnalysis.analysis_text}</div>
              {aiAnalysis.risks && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Riscos Identificados</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiAnalysis.risks}</p>
                </div>
              )}
              {aiAnalysis.recommendations && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Recomendações</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiAnalysis.recommendations}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              const text = [aiAnalysis?.analysis_text, aiAnalysis?.risks, aiAnalysis?.recommendations].filter(Boolean).join("\n\n");
              navigator.clipboard.writeText(text);
              toast({ title: "Texto copiado!" });
            }}>
              <Copy className="h-4 w-4 mr-1" /> Copiar texto
            </Button>
            <Button onClick={() => setAiAnalysisOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
