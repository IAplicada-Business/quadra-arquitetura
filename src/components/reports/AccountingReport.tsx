import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInvoicesNF } from "@/hooks/useInvoicesNF";
import { exportNFsToXlsx, type NFExportRow } from "@/lib/nfExport";

const NF_TYPE_LABEL: Record<string, string> = { emitida: "Emitida", recebida: "Recebida" };
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  enviada_contador: "Enviada ao Contador",
  arquivada: "Arquivada",
};

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

/**
 * Relatório financeiro formatado para envio à contabilidade.
 * Solicitado na call de 16/04: "Se tiver um relatório financeiro assim,
 * tipo pra gente mandar para eles também, junto com o nosso extrato".
 *
 * Consolida NFs emitidas e recebidas no mês escolhido, com totais e CSV.
 * Pensado para imprimir/salvar como PDF e anexar no e-mail para o contador.
 */
export function AccountingReport() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState<string>(defaultMonth);

  const { items } = useInvoicesNF({
    competenceMonth: month || undefined,
  });

  const { emitidas, recebidas, totalEmitidas, totalRecebidas, saldo } = useMemo(() => {
    const emitidas = items.filter((i: any) => i.nf_type === "emitida");
    const recebidas = items.filter((i: any) => i.nf_type === "recebida");
    const totalEmitidas = emitidas.reduce((s, i: any) => s + (i.amount ?? 0), 0);
    const totalRecebidas = recebidas.reduce((s, i: any) => s + (i.amount ?? 0), 0);
    return {
      emitidas,
      recebidas,
      totalEmitidas,
      totalRecebidas,
      saldo: totalEmitidas - totalRecebidas,
    };
  }, [items]);

  const monthLabel = useMemo(() => {
    if (!month) return "";
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [month]);

  const handleExportXlsx = () => {
    const toRow = (i: any): NFExportRow => ({
      nf_number: i.nf_number,
      nf_type: i.nf_type,
      project_name: i.projects?.name,
      issuer_name: i.issuer_name,
      recipient_name: i.recipient_name,
      amount: i.amount,
      issue_date: i.issue_date,
      competence_month: i.competence_month,
      status: i.status,
    });
    exportNFsToXlsx(
      `contabilidade_${month || "geral"}`,
      emitidas.map(toRow),
      recebidas.map(toRow),
      { includeProject: true }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar — não imprime */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-muted/30 rounded-lg border print:hidden">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Competência</label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" onClick={handleExportXlsx} disabled={items.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar Excel
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <FileText className="h-4 w-4 mr-2" /> Imprimir / PDF
        </Button>
      </div>

      {/* Cabeçalho — imprime */}
      <div className="text-center border-b pb-4 mb-2">
        <h2 className="text-2xl font-bold uppercase tracking-wide">
          Relatório Fiscal para Contabilidade
        </h2>
        <p className="text-muted-foreground mt-1">
          Quadra · Competência: {monthLabel || "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Gerado em {new Date().toLocaleDateString("pt-BR")} às{" "}
          {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">NFs Emitidas</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalEmitidas)}</p>
            <p className="text-xs text-muted-foreground mt-1">{emitidas.length} nota(s)</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">NFs Recebidas</p>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalRecebidas)}</p>
            <p className="text-xs text-muted-foreground mt-1">{recebidas.length} nota(s)</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Saldo (Emitidas − Recebidas)</p>
            <p className={`text-2xl font-bold ${saldo >= 0 ? "text-amber-700" : "text-destructive"}`}>
              {formatCurrency(saldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Emitidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas Fiscais Emitidas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {emitidas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma NF emitida nesta competência.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emitidas.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.nf_number || "—"}</TableCell>
                    <TableCell className="text-xs">{i.projects?.name || "—"}</TableCell>
                    <TableCell className="text-xs">{i.issuer_name || "—"}</TableCell>
                    <TableCell className="text-xs">{formatDate(i.issue_date)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(i.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {i.status === "enviada_contador" ? "Enviada" : i.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/30">
                  <TableCell colSpan={4} className="text-right">Total</TableCell>
                  <TableCell className="text-right text-green-700">{formatCurrency(totalEmitidas)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tabela Recebidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas Fiscais Recebidas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recebidas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma NF recebida nesta competência.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Emitente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recebidas.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.nf_number || "—"}</TableCell>
                    <TableCell className="text-xs">{i.projects?.name || "—"}</TableCell>
                    <TableCell className="text-xs">{i.issuer_name || "—"}</TableCell>
                    <TableCell className="text-xs">{formatDate(i.issue_date)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(i.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {i.status === "enviada_contador" ? "Enviada" : i.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/30">
                  <TableCell colSpan={4} className="text-right">Total</TableCell>
                  <TableCell className="text-right text-blue-700">{formatCurrency(totalRecebidas)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center pt-4 border-t">
        Este relatório é gerado a partir das NFs cadastradas em /invoices. Inclua o seu extrato bancário do período ao enviar à contabilidade.
      </p>
    </div>
  );
}
