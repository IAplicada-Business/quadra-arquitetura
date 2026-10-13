import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Trash2, Cloud, Sun, CloudRain, Snowflake, CalendarDays, Users, FileText, BarChart3, Sparkles, Loader2, MessageSquareText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSiteDiary } from "@/hooks/useSiteDiary";
import { useScopeItems } from "@/hooks/useScopeItems";
import { useProjectDisciplines } from "@/hooks/useProjectDisciplines";
import { useScheduleTasks } from "@/hooks/useScheduleTasks";
import { useWeeklyReports } from "@/hooks/useWeeklyReports";
import { useSupplierAllocations } from "@/hooks/useSupplierAllocations";
import { SupplierRatingDialog } from "@/components/construction/SupplierRatingDialog";
import { WeeklyReportModal } from "./WeeklyReportModal";
import { format } from "date-fns";
import { buildWeeklyAIContext, type ScheduleTaskLike, type WeeklyReportLike } from "@/lib/weeklyAIContext";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { SendMessageModal } from "@/components/messages/SendMessageModal";
import { useProjectAI } from "@/hooks/useProjectAI";
import { VoiceInputButton } from "@/components/ui/voice-input-button";

const weatherOptions = [
  { value: "ensolarado", label: "Ensolarado", icon: Sun },
  { value: "nublado", label: "Nublado", icon: Cloud },
  { value: "chuvoso", label: "Chuvoso", icon: CloudRain },
  { value: "frio", label: "Frio", icon: Snowflake },
];

export function ProjectTrackingTab({ projectId, projectName, clientName, clientPhone }: { projectId: string; projectName?: string; clientName?: string; clientPhone?: string }) {
  const { entries, isLoading, create, remove } = useSiteDiary(projectId);
  const { items: scopeItems } = useScopeItems(projectId);
  const { items: scheduleTasks } = useScheduleTasks(projectId);
  const { reports, create: createReport } = useWeeklyReports(projectId);
  const { allocations } = useSupplierAllocations(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [ratingAllocation, setRatingAllocation] = useState<any>(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const completedActivitiesRef = useRef<Set<string>>(new Set());

  // Fetch client responses
  const { data: clientResponses = [] } = useQuery({
    queryKey: ["client_pending_responses", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_pending_responses" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!projectId,
  });
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [prefillData, setPrefillData] = useState<{ summary: string; next_steps: string; client_pending?: string } | null>(null);
  const { callAction, loading: aiInsightsLoading } = useProjectAI();
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiInsightsOpen, setAiInsightsOpen] = useState(false);

  // Detect newly completed activities linked to suppliers
  useEffect(() => {
    const completedTasks = scheduleTasks.filter((t: any) => t.status === "concluida" || t.progress_percentage === 100);
    completedTasks.forEach((task: any) => {
      if (completedActivitiesRef.current.has(task.id)) return;
      completedActivitiesRef.current.add(task.id);
      // Check if there's a supplier allocation for this discipline
      const match = allocations.find(a => a.discipline === task.discipline && a.status === "ativo" && !a.rating);
      if (match) {
        toast(`Avaliar ${(match as any).suppliers?.name || "fornecedor"} para esta etapa?`, {
          action: {
            label: "Avaliar",
            onClick: () => setRatingAllocation(match),
          },
          duration: 8000,
        });
      }
    });
  }, [scheduleTasks, allocations]);

  const avgProgress = useMemo(() => {
    const tasks = scheduleTasks.filter((t: any) => t.progress_percentage != null);
    if (tasks.length === 0) return 0;
    return Math.round(tasks.reduce((s: number, t: any) => s + (t.progress_percentage || 0), 0) / tasks.length);
  }, [scheduleTasks]);

  // Form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [weather, setWeather] = useState("ensolarado");
  const [workersCount, setWorkersCount] = useState("");
  const [summary, setSummary] = useState("");
  const [observations, setObservations] = useState("");
  const [disciplinesActive, setDisciplinesActive] = useState<string[]>([]);

  // Disciplinas vêm da fonte canônica (project_activities, com fallback em scope_items).
  // Antes lia apenas scope_items "contratado", o que ignorava projetos que editaram só no escopo novo.
  const { disciplines: canonicalDisciplines } = useProjectDisciplines(projectId);
  const contractedDisciplines = canonicalDisciplines.length > 0
    ? canonicalDisciplines
    : scopeItems
        .filter(s => s.scope_type === "contratado" && !s.parent_id)
        .map(s => s.discipline)
        .filter(Boolean) as string[];

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split("T")[0]);
    setWeather("ensolarado");
    setWorkersCount("");
    setSummary("");
    setObservations("");
    setDisciplinesActive([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({
      entry_date: entryDate,
      weather,
      workers_count: workersCount ? Number(workersCount) : null,
      summary: summary || null,
      observations: observations || null,
      disciplines_active: disciplinesActive.length > 0 ? disciplinesActive : null,
    });
    setFormOpen(false);
    resetForm();
  };

  const toggleDiscipline = (d: string) => {
    setDisciplinesActive(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  // Filter entries
  const filteredEntries = entries.filter(e => {
    if (filterPeriod === "all") return true;
    const date = new Date(e.entry_date);
    const now = new Date();
    if (filterPeriod === "today") return e.entry_date === now.toISOString().split("T")[0];
    if (filterPeriod === "week") {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    if (filterPeriod === "month") {
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
      return date >= monthAgo;
    }
    return true;
  });

  // Metrics
  const totalEntries = entries.length;
  const lastEntry = entries[0];
  const avgWorkers = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + (e.workers_count || 0), 0) / entries.filter(e => e.workers_count).length) || 0
    : 0;

  // Contexto da obra inteira (diário recente, cronograma, último relatório):
  // a IA não depende mais de ter registro do diário nesta semana.
  const buildAIContext = () =>
    buildWeeklyAIContext({ entries, tasks: scheduleTasks as ScheduleTaskLike[], reports: reports as WeeklyReportLike[], progressPercent: avgProgress });
  const hasAnyContext = entries.length > 0 || scheduleTasks.length > 0 || reports.length > 0;

  const handleGenerateAISummary = async () => {
    const context = buildAIContext();
    if (!context) {
      toast.error("Sem dados para resumir", { description: "Registre o diário de obra ou monte o cronograma desta obra primeiro." });
      return;
    }
    setAiSummaryLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-ai-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ project_id: projectId, action: "weekly_summary", data: context }),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(result?.error || `Erro ao gerar resumo (${resp.status})`);
      setPrefillData(result);
      setReportOpen(true);
      toast.success(
        context.diary_scope === "semana" ? "Resumo gerado! Revise e confirme." : "Resumo gerado com o cronograma e os registros mais recentes. Revise e confirme.",
      );
    } catch (err: any) {
      toast.error("Não foi possível gerar o resumo", { description: err.message });
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleInsights = async () => {
    const context = buildAIContext();
    if (!context) {
      toast.error("Sem dados para analisar", { description: "Registre o diário de obra ou monte o cronograma desta obra primeiro." });
      return;
    }
    const result = await callAction(projectId, "weekly_insights", context as unknown as Record<string, unknown>);
    if (result) { setAiInsights(result); setAiInsightsOpen(true); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-display">{totalEntries}</p>
          <p className="text-xs text-muted-foreground">Total de Registros</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {lastEntry ? format(new Date(lastEntry.entry_date), "dd/MM", { locale: ptBR }) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Último Registro</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{avgWorkers}</p>
          <p className="text-xs text-muted-foreground">Média Trabalhadores</p>
        </CardContent></Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMsgOpen(true)} disabled={!clientPhone}>
            <MessageSquare className="h-4 w-4 mr-1" /> Enviar Mensagem
          </Button>
          <Button size="sm" variant="outline" onClick={handleGenerateAISummary} disabled={aiSummaryLoading || !hasAnyContext}>
            {aiSummaryLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Gerar Resumo com IA
          </Button>
          <Button size="sm" variant="outline" disabled={aiInsightsLoading || !hasAnyContext} onClick={handleInsights}>
            {aiInsightsLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Insights da semana
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setPrefillData(null); setReportOpen(true); }}>
            <BarChart3 className="h-4 w-4 mr-1" /> Gerar Relatório Semanal
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Registro
          </Button>
        </div>
      </div>

      {/* Entries List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhum registro no diário de obra.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(entry => {
            const wIcon = weatherOptions.find(w => w.value === entry.weather);
            const WeatherIcon = wIcon?.icon || Sun;
            return (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">
                          {format(new Date(entry.entry_date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <WeatherIcon className="h-3.5 w-3.5" />
                        <span>{wIcon?.label || entry.weather}</span>
                      </div>
                      {entry.workers_count != null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>{entry.workers_count} trab.</span>
                        </div>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {entry.summary && <p className="text-sm mb-2">{entry.summary}</p>}
                  {entry.observations && <p className="text-xs text-muted-foreground mb-2">{entry.observations}</p>}
                  {entry.disciplines_active && entry.disciplines_active.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.disciplines_active.map(d => (
                        <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Entry Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Registro - Diário de Obra</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} required />
              </div>
              <div>
                <Label>Clima</Label>
                <Select value={weather} onValueChange={setWeather}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {weatherOptions.map(w => (
                      <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Qtd. Trabalhadores</Label>
              <Input type="number" value={workersCount} onChange={e => setWorkersCount(e.target.value)} placeholder="Ex: 5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Resumo das Atividades</Label>
                <VoiceInputButton
                  title="Ditar resumo"
                  onTranscript={(t) => setSummary((prev) => (prev ? prev + " " + t : t))}
                />
              </div>
              <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="O que foi executado hoje..." rows={3} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Observações</Label>
                <VoiceInputButton
                  title="Ditar observações"
                  onTranscript={(t) => setObservations((prev) => (prev ? prev + " " + t : t))}
                />
              </div>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Problemas, atrasos, pendências..." rows={2} />
            </div>
            {contractedDisciplines.length > 0 && (
              <div>
                <Label>Disciplinas Ativas Hoje</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {contractedDisciplines.map(d => (
                    <Badge
                      key={d}
                      variant={disciplinesActive.includes(d) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleDiscipline(d)}
                    >
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending}>Registrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Respostas do Cliente */}
      {clientResponses.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquareText className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Respostas do Cliente</h3>
            {clientResponses.some((r: any) => {
              const d = new Date(r.responded_at || r.created_at);
              return r.status !== "aguardando" && (Date.now() - d.getTime()) < 48 * 60 * 60 * 1000;
            }) && (
              <Badge className="text-[10px]">Novo</Badge>
            )}
          </div>
          <div className="space-y-3">
            {(() => {
              const grouped = clientResponses.reduce((acc: Record<string, any[]>, r: any) => {
                const key = r.weekly_report_id;
                if (!acc[key]) acc[key] = [];
                acc[key].push(r);
                return acc;
              }, {});
              return Object.entries(grouped).map(([reportId, responses]) => {
                const report = reports.find((r: any) => r.id === reportId);
                const weekLabel = report ? format(new Date(report.week_start + "T00:00:00"), "dd/MM", { locale: ptBR }) : reportId.slice(0, 8);
                return (
                  <Card key={reportId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-muted-foreground">Semana de {weekLabel}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(responses as any[]).map((r: any) => (
                        <div key={r.id} className="border rounded-md p-3 space-y-1">
                          <p className="text-xs text-muted-foreground">Pendência: <span className="text-foreground">{r.pending_item}</span></p>
                          {r.response_text && <p className="text-sm">{r.response_text}</p>}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={r.status === "aprovado" ? "default" : "secondary"} className="text-[10px]">
                              {r.status === "aprovado" ? "✓ Aprovado" : r.status === "respondido" ? "Respondido" : r.status}
                            </Badge>
                            {r.client_name && <span>por {r.client_name}</span>}
                            {r.responded_at && <span>em {format(new Date(r.responded_at), "dd/MM HH:mm", { locale: ptBR })}</span>}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              });
            })()}
          </div>
        </section>
      )}


      <WeeklyReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        avgProgress={avgProgress}
        isPending={createReport.isPending}
        prefill={prefillData || undefined}
        onSubmit={(data) => {
          createReport.mutate(data, { onSuccess: () => { setReportOpen(false); setPrefillData(null); } });
        }}
      />

      <SupplierRatingDialog
        open={!!ratingAllocation}
        onOpenChange={(v) => { if (!v) setRatingAllocation(null); }}
        allocation={ratingAllocation}
      />
      <SendMessageModal
        open={msgOpen}
        onOpenChange={setMsgOpen}
        category="obra"
        phone={clientPhone || ""}
        context={{
          nome_cliente: clientName || "",
          projeto: projectName || "",
          progresso: `${avgProgress}%`,
          resumo: lastEntry?.summary || "",
        }}
      />

      {/* AI Insights Modal */}
      <Dialog open={aiInsightsOpen} onOpenChange={setAiInsightsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Insights da Semana</DialogTitle></DialogHeader>
          {aiInsights && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div><h4 className="font-semibold text-sm mb-1"> Principais Avanços</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiInsights.advances}</p></div>
              <div><h4 className="font-semibold text-sm mb-1"> Problemas / Riscos</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiInsights.issues}</p></div>
              <div><h4 className="font-semibold text-sm mb-1"> Sugestões</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiInsights.suggestions}</p></div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { const t = [aiInsights?.advances, aiInsights?.issues, aiInsights?.suggestions].filter(Boolean).join("\n\n"); navigator.clipboard.writeText(t); toast("Texto copiado!"); }}>Copiar</Button>
            <Button onClick={() => setAiInsightsOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
