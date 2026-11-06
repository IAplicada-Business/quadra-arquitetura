import { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, endOfWeek, addDays, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer, Copy, Save, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  projectId: string;
  projectName: string;
  projectAddress?: string;
}

interface ReportData {
  concluded: any[];
  inProgress: any[];
  overdue: any[];
  pending: any[];
  nextWeek: any[];
  diary: any[];
  materials: any[];
  payments: any[];
}

export default function WeeklyReportView({ projectId, projectName, projectAddress }: Props) {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const nextWeekStart = useMemo(() => addDays(weekEnd, 1), [weekEnd]);
  const nextWeekEnd = useMemo(() => addDays(weekEnd, 7), [weekEnd]);

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");
  const fmtBR = (d: Date) => format(d, "dd/MM", { locale: ptBR });
  const fmtBRFull = (d: Date) => format(d, "dd/MM/yyyy", { locale: ptBR });

  useEffect(() => {
    fetchData();
  }, [weekStart, projectId]);

  async function fetchData() {
    setLoading(true);
    const ws = fmtDate(weekStart);
    const we = fmtDate(weekEnd);
    const nws = fmtDate(nextWeekStart);
    const nwe = fmtDate(nextWeekEnd);

    const [tasksRes, diaryRes, matsRes, paysRes] = await Promise.all([
      supabase.from("schedule_tasks").select("*").eq("project_id", projectId).limit(500),
      supabase.from("site_diary_entries").select("*").eq("project_id", projectId).gte("entry_date", ws).lte("entry_date", we).order("entry_date"),
      supabase.from("material_tracking").select("*").eq("project_id", projectId).eq("is_active", true).or(`purchase_date.gte.${ws},delivery_date.gte.${ws}`).or(`purchase_date.lte.${we},delivery_date.lte.${we}`),
      supabase.from("payments").select("*").eq("project_id", projectId).eq("status", "pago").gte("paid_date", ws).lte("paid_date", we),
    ]);

    const tasks = tasksRes.data ?? [];
    const today = new Date();

    const concluded = tasks.filter(t => t.status === "executado" && t.end_date && t.end_date >= ws && t.end_date <= we);
    const inProgress = tasks.filter(t => t.status === "em_execucao");
    const overdue = tasks.filter(t => {
      if (!t.end_date || t.status === "executado") return false;
      return isBefore(parseISO(t.end_date), today) && t.status !== "executado";
    });
    const pending = tasks.filter(t => t.status === "pendencia");
    const nextWeekTasks = tasks.filter(t => t.start_date && t.start_date >= nws && t.start_date <= nwe && t.status !== "executado");

    // Filter materials within the period
    const materials = (matsRes.data ?? []).filter(m => {
      const pd = m.purchase_date;
      const dd = m.delivery_date;
      return (pd && pd >= ws && pd <= we) || (dd && dd >= ws && dd <= we);
    });

    setData({
      concluded,
      inProgress,
      overdue,
      pending,
      nextWeek: nextWeekTasks,
      diary: diaryRes.data ?? [],
      materials,
      payments: paysRes.data ?? [],
    });
    setLoading(false);
  }

  const avgWorkers = useMemo(() => {
    if (!data?.diary.length) return 0;
    const total = data.diary.reduce((s, d) => s + (d.workers_count || 0), 0);
    return Math.round(total / data.diary.length);
  }, [data]);

  const totalMaterials = useMemo(() => {
    if (!data) return 0;
    // Sum values from material purchases in the period
    return data.materials.reduce((s, m) => s + (m.quantity_purchased || 0) * 1, 0);
  }, [data]);

  const totalPayments = useMemo(() => {
    if (!data) return 0;
    return data.payments.reduce((s, p) => s + (Number(p.value) || 0), 0);
  }, [data]);

  const photos = useMemo(() => {
    if (!data) return [];
    return data.diary.flatMap(d => d.photos || []).slice(0, 6);
  }, [data]);

  function generateWhatsAppText(): string {
    if (!data) return "";
    const lines: string[] = [];
    lines.push(`═══════════════════════════════`);
    lines.push(`*RELATÓRIO SEMANAL DE OBRA*`);
    lines.push(`*${projectName}*${projectAddress ? ` — ${projectAddress}` : ""}`);
    lines.push(`Semana: ${fmtBR(weekStart)} a ${fmtBRFull(weekEnd)}`);
    lines.push(`Quadra`);
    lines.push(`═══════════════════════════════`);
    lines.push("");
    lines.push(`*RESUMO DA SEMANA*`);
    lines.push(`• Atividades concluídas: ${data.concluded.length}`);
    lines.push(`• Atividades em andamento: ${data.inProgress.length}`);
    lines.push(`• Pendências: ${data.pending.length + data.overdue.length}`);
    lines.push(`• Trabalhadores na semana: média ${avgWorkers}/dia`);
    lines.push("");

    if (data.concluded.length) {
      lines.push(`*ATIVIDADES CONCLUÍDAS*`);
      data.concluded.forEach(t => lines.push(`• ${t.task_name}${t.discipline ? ` — ${t.discipline}` : ""}${t.supplier_name ? ` (${t.supplier_name})` : ""}`));
      lines.push("");
    }

    if (data.inProgress.length) {
      lines.push(`*EM ANDAMENTO*`);
      data.inProgress.forEach(t => lines.push(`• ${t.task_name}${t.discipline ? ` — ${t.discipline}` : ""} — ${t.progress_percentage || 0}%`));
      lines.push("");
    }

    if (data.overdue.length || data.pending.length) {
      lines.push(`*PENDÊNCIAS E ATRASOS*`);
      [...data.overdue, ...data.pending].forEach(t => {
        const days = t.end_date ? Math.max(0, Math.floor((Date.now() - new Date(t.end_date).getTime()) / 86400000)) : 0;
        lines.push(`• ${t.task_name}${t.discipline ? ` — ${t.discipline}` : ""}${days > 0 ? ` — ${days} dias de atraso` : ""}`);
      });
      lines.push("");
    }

    if (data.nextWeek.length) {
      lines.push(`*PRÓXIMA SEMANA*`);
      data.nextWeek.forEach(t => lines.push(`• ${t.task_name}${t.discipline ? ` — ${t.discipline}` : ""}`));
      lines.push("");
    }

    lines.push(`*FINANCEIRO DO PERÍODO*`);
    lines.push(`• Materiais comprados/entregues: ${data.materials.length} itens`);
    lines.push(`• Pagamentos realizados: R$ ${totalPayments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    lines.push("");
    lines.push(`═══════════════════════════════`);

    return lines.join("\n");
  }

  async function handleCopyWhatsApp() {
    const text = generateWhatsAppText();
    await navigator.clipboard.writeText(text);
    toast({ title: "Relatório copiado para a área de transferência" });
  }

  async function handleSave() {
    if (!data || !user) return;
    setSaving(true);
    const { error } = await supabase.from("reports" as any).insert({
      project_id: projectId,
      user_id: user.id,
      type: "semanal",
      period_start: fmtDate(weekStart),
      period_end: fmtDate(weekEnd),
      content: data,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Relatório salvo com sucesso" });
    }
  }

  function handlePrint() {
    window.print();
  }

  function prevWeek() {
    setWeekStart(prev => addDays(prev, -7));
  }
  function nextWeekNav() {
    setWeekStart(prev => addDays(prev, 7));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="flex items-center gap-1 border rounded-lg px-2 py-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            {fmtBR(weekStart)} — {fmtBRFull(weekEnd)}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextWeekNav}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleCopyWhatsApp}>
            <Copy className="h-4 w-4 mr-1" /> WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Report Preview */}
      <Card className="bg-white p-8 print:shadow-none print:border-none print:p-4 text-gray-800">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
          <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-1">═══════════════════════════════════════</p>
          <h2 className="text-2xl font-bold uppercase tracking-wide">Relatório Semanal de Obra</h2>
          <p className="text-lg font-semibold mt-1">{projectName}{projectAddress ? ` — ${projectAddress}` : ""}</p>
          <p className="text-sm text-gray-500 mt-1">Semana: {fmtBR(weekStart)} a {fmtBRFull(weekEnd)}</p>
          <p className="text-sm font-medium text-gray-600 mt-1">Quadra</p>
          <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mt-1">═══════════════════════════════════════</p>
        </div>

        {/* Summary */}
        <Section title="RESUMO DA SEMANA">
          <ul className="space-y-1 text-sm">
            <li>• Atividades concluídas: <strong>{data.concluded.length}</strong></li>
            <li>• Atividades em andamento: <strong>{data.inProgress.length}</strong></li>
            <li>• Pendências: <strong>{data.pending.length + data.overdue.length}</strong></li>
            <li>• Trabalhadores na semana: média <strong>{avgWorkers}/dia</strong></li>
          </ul>
        </Section>

        {/* Concluded */}
        {data.concluded.length > 0 && (
          <Section title="ATIVIDADES CONCLUÍDAS">
            <TaskList tasks={data.concluded} showProgress={false} />
          </Section>
        )}

        {/* In Progress */}
        {data.inProgress.length > 0 && (
          <Section title="EM ANDAMENTO">
            <TaskList tasks={data.inProgress} showProgress />
          </Section>
        )}

        {/* Overdue & Pending */}
        {(data.overdue.length > 0 || data.pending.length > 0) && (
          <Section title="PENDÊNCIAS E ATRASOS">
            <TaskList tasks={[...data.overdue, ...data.pending]} showDelay />
          </Section>
        )}

        {/* Next Week */}
        {data.nextWeek.length > 0 && (
          <Section title="PRÓXIMA SEMANA">
            <TaskList tasks={data.nextWeek} showProgress={false} />
          </Section>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <Section title="REGISTRO FOTOGRÁFICO">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((url, i) => (
                <img key={i} src={url} alt={`Foto ${i + 1}`} className="rounded-lg w-full h-40 object-cover border" />
              ))}
            </div>
          </Section>
        )}

        {/* Financial */}
        <Section title="FINANCEIRO DO PERÍODO">
          <ul className="space-y-1 text-sm">
            <li>• Materiais comprados/entregues: <strong>{data.materials.length} itens</strong></li>
            <li>• Pagamentos realizados: <strong>R$ {totalPayments.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></li>
          </ul>
        </Section>

        <p className="text-xs tracking-[0.3em] text-gray-400 uppercase text-center mt-6">═══════════════════════════════════════</p>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 border-b pb-1 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function TaskList({ tasks, showProgress, showDelay }: { tasks: any[]; showProgress?: boolean; showDelay?: boolean }) {
  return (
    <ul className="space-y-1 text-sm">
      {tasks.map(t => {
        const days = showDelay && t.end_date ? Math.max(0, Math.floor((Date.now() - new Date(t.end_date).getTime()) / 86400000)) : 0;
        return (
          <li key={t.id}>
            • {t.task_name}
            {t.discipline && <span className="text-gray-500"> — {t.discipline}</span>}
            {t.supplier_name && <span className="text-gray-500"> ({t.supplier_name})</span>}
            {showProgress && <span className="text-gray-500"> — {t.progress_percentage || 0}%</span>}
            {showDelay && days > 0 && <span className="text-red-600 font-medium"> — {days} dias de atraso</span>}
          </li>
        );
      })}
    </ul>
  );
}
