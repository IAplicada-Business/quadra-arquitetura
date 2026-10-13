import { forwardRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, ChevronDown, ChevronUp, Copy, Download, Loader2, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { buildWeeklyReportMessage, reportPhotoUrls, weekRangeLabel, weeklyReportFileName, whatsappPhone, type WeeklyReportRecord } from "@/lib/weeklyReport";
import { generateWeeklyReportPdf } from "@/lib/generateWeeklyReportPdf";

export interface ClientResponseLike {
  weekly_report_id: string;
  pending_item: string;
  status: string;
  client_name?: string | null;
  responded_at?: string | null;
}

interface Props {
  reports: WeeklyReportRecord[];
  isLoading?: boolean;
  projectName?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  portalUrl?: string | null;
  responses?: ClientResponseLike[];
  /** Id do relatório recém-salvo: abre expandido e com destaque. */
  highlightId?: string | null;
  onEdit: (r: WeeklyReportRecord) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

/**
 * Lista dos relatórios semanais da obra, dentro de Acompanhamento.
 * Antes eles eram salvos mas não apareciam em lugar nenhum no sistema
 * interno; aqui dá para consultar, editar, baixar em PDF e enviar.
 */
export const WeeklyReportsSection = forwardRef<HTMLElement, Props>(function WeeklyReportsSection(
  { reports, isLoading, projectName, clientName, clientPhone, portalUrl, responses = [], highlightId, onEdit, onDelete, onNew },
  ref,
) {
  const [expanded, setExpanded] = useState<string | null>(highlightId ?? reports[0]?.id ?? null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WeeklyReportRecord | null>(null);
  const phone = whatsappPhone(clientPhone);

  const message = (r: WeeklyReportRecord) => buildWeeklyReportMessage(r, { projectName, clientName, portalUrl });

  const handleDownload = async (r: WeeklyReportRecord) => {
    setDownloading(r.id);
    try {
      const blob = await generateWeeklyReportPdf(r, { projectName, clientName });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = weeklyReportFileName(projectName, r.week_start);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("PDF do relatório baixado");
    } catch (e) {
      toast.error("Não foi possível gerar o PDF", { description: (e as Error).message });
    } finally {
      setDownloading(null);
    }
  };

  const handleCopy = async (r: WeeklyReportRecord) => {
    try {
      await navigator.clipboard.writeText(message(r));
      toast.success("Texto do relatório copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleWhatsApp = (r: WeeklyReportRecord) => {
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message(r))}`, "_blank");
  };

  return (
    <section ref={ref} data-testid="weekly-reports-section" className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Relatórios semanais</h3>
          <Badge variant="secondary" className="text-[10px]">{reports.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {portalUrl ? "Todos os relatórios já aparecem no portal do cliente." : "Gere o link do portal no Resumo da obra para o cliente ver os relatórios."}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum relatório semanal ainda.
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={onNew}>
              <BarChart3 className="h-4 w-4 mr-1" /> Gerar Relatório Semanal
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const isOpen = expanded === r.id;
            const photos = reportPhotoUrls(r);
            const resp = responses.find((x) => x.weekly_report_id === r.id && x.status !== "aguardando");
            return (
              <Card key={r.id} data-testid={`weekly-report-${r.id}`} className={highlightId === r.id ? "border-primary ring-1 ring-primary/30" : undefined}>
                <CardHeader className="pb-2">
                  <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setExpanded(isOpen ? null : r.id)} aria-expanded={isOpen}>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold">{weekRangeLabel(r.week_start)}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Criado em {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {r.created_by ? ` por ${r.created_by}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.client_pending && (
                        <Badge variant={resp ? "default" : "outline"} className="text-[10px]">
                          {resp ? (resp.status === "aprovado" ? "Cliente aprovou" : "Cliente respondeu") : "Aguardando cliente"}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold tabular-nums">{r.completion_percent}%</span>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  <Progress value={r.completion_percent} className="h-1.5" />
                </CardHeader>

                {isOpen && (
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Resumo</p>
                      <p className="text-sm whitespace-pre-line">{r.summary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Próximas etapas</p>
                      <p className="text-sm whitespace-pre-line">{r.next_steps}</p>
                    </div>
                    {r.client_pending && (
                      <div className="rounded-r-md border-l-4 border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/20">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Pendência do cliente</p>
                        <p className="text-sm whitespace-pre-line">{r.client_pending}</p>
                      </div>
                    )}
                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {photos.map((url, i) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden rounded border">
                            <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 border-t pt-3">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(r)} disabled={downloading === r.id}>
                        {downloading === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                        Baixar PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsApp(r)}
                        disabled={!phone}
                        title={phone ? "Abre o WhatsApp com o relatório pronto para enviar" : "Cadastre o telefone do cliente para enviar pelo WhatsApp"}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" /> Enviar no WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCopy(r)}>
                        <Copy className="h-4 w-4 mr-1" /> Copiar texto
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onEdit(r)}>
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(r)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Excluir
                      </Button>
                    </div>
                    {!phone && <p className="text-[11px] text-muted-foreground">Sem telefone do cliente cadastrado: use Copiar texto ou o link do portal.</p>}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? weekRangeLabel(confirmDelete.week_start) : ""}. Ele some também do portal do cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
});
