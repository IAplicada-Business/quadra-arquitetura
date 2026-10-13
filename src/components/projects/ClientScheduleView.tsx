import { useMemo, useState, useRef } from "react";
import { Copy, Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, format, differenceInCalendarWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getDisciplineColor } from "@/lib/disciplineColors";
import { InfoHint } from "@/components/visual/InfoHint";

interface ClientTask {
  id: string;
  task_name: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  discipline: string | null;
  color: string | null;
  progress_percentage: number | null;
}

interface ClientScheduleViewProps {
  tasks: ClientTask[];
  projectName?: string;
}

interface WeekBlock {
  weekIndex: number;
  weekLabel: string;
  startDate: Date;
  disciplines: Map<string, { color: string; taskCount: number; statuses: Set<string> }>;
}

export function ClientScheduleView({ tasks, projectName }: ClientScheduleViewProps) {
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Group tasks by week, then aggregate by discipline per week
  const weekBlocks = useMemo(() => {
    const tasksWithDates = tasks.filter(t => t.start_date);
    if (tasksWithDates.length === 0) return [];

    // Find the earliest start date as reference
    const sortedStarts = tasksWithDates
      .map(t => new Date(t.start_date!))
      .sort((a, b) => a.getTime() - b.getTime());
    const refStart = startOfWeek(sortedStarts[0], { weekStartsOn: 1 });

    const blocksMap = new Map<number, WeekBlock>();

    tasksWithDates.forEach(task => {
      const taskStart = new Date(task.start_date!);
      const taskEnd = task.end_date ? new Date(task.end_date) : taskStart;

      // Determine which weeks this task spans
      const startWeekIdx = differenceInCalendarWeeks(taskStart, refStart, { weekStartsOn: 1 });
      const endWeekIdx = differenceInCalendarWeeks(taskEnd, refStart, { weekStartsOn: 1 });

      for (let wIdx = startWeekIdx; wIdx <= endWeekIdx; wIdx++) {
        if (!blocksMap.has(wIdx)) {
          const ws = new Date(refStart.getTime() + wIdx * 7 * 24 * 60 * 60 * 1000);
          const we = endOfWeek(ws, { weekStartsOn: 1 });
          blocksMap.set(wIdx, {
            weekIndex: wIdx,
            weekLabel: `${format(ws, "dd/MM")} a ${format(we, "dd/MM")}`,
            startDate: ws,
            disciplines: new Map(),
          });
        }

        const block = blocksMap.get(wIdx)!;
        const disc = task.discipline || "Outros";
        if (!block.disciplines.has(disc)) {
          block.disciplines.set(disc, {
            color: task.color || getDisciplineColor(disc),
            taskCount: 0,
            statuses: new Set(),
          });
        }
        const discInfo = block.disciplines.get(disc)!;
        discInfo.taskCount++;
        if (task.status) discInfo.statuses.add(task.status);
      }
    });

    return Array.from(blocksMap.values()).sort((a, b) => a.weekIndex - b.weekIndex);
  }, [tasks]);

  // Merge consecutive weeks with same disciplines
  const mergedBlocks = useMemo(() => {
    if (weekBlocks.length === 0) return [];
    const result: { weekRange: string; weekNumbers: number[]; disciplines: Map<string, { color: string; taskCount: number }> }[] = [];

    weekBlocks.forEach((block) => {
      const discKeys = Array.from(block.disciplines.keys()).sort().join(",");
      const last = result[result.length - 1];
      const lastDiscKeys = last ? Array.from(last.disciplines.keys()).sort().join(",") : "";

      if (last && lastDiscKeys === discKeys && block.weekIndex === last.weekNumbers[last.weekNumbers.length - 1] + 1) {
        last.weekNumbers.push(block.weekIndex);
        last.weekRange = `Semana ${last.weekNumbers[0] + 1}${last.weekNumbers.length > 1 ? `-${last.weekNumbers[last.weekNumbers.length - 1] + 1}` : ""}`;
      } else {
        result.push({
          weekRange: `Semana ${block.weekIndex + 1}`,
          weekNumbers: [block.weekIndex],
          disciplines: block.disciplines,
        });
      }
    });

    return result;
  }, [weekBlocks]);

  const handleCopy = async () => {
    const text = mergedBlocks.map(b => {
      const discs = Array.from(b.disciplines.keys()).join(", ");
      return `${b.weekRange}: ${discs}`;
    }).join("\n");

    let html = `<div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">`;
    html += `<h2 style="color: #1F4E79; border-bottom: 2px solid #1F4E79; padding-bottom: 8px;"> Cronograma — ${projectName || "Obra"}</h2>`;

    mergedBlocks.forEach((block) => {
      html += `<div style="margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1F4E79;">`;
      html += `<h3 style="margin: 0 0 8px; color: #334155; font-size: 14px;">${block.weekRange}</h3>`;
      html += `<div style="display: flex; flex-wrap: wrap; gap: 6px;">`;
      block.disciplines.forEach((info, disc) => {
        html += `<span style="display: inline-block; padding: 3px 10px; background: ${info.color}22; color: ${info.color}; border: 1px solid ${info.color}44; border-radius: 12px; font-size: 12px; font-weight: 500;">${disc}</span>`;
      });
      html += `</div></div>`;
    });

    html += `<p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 24px;">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>`;
    html += `</div>`;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(text);
    }

    setCopied(true);
    toast({ title: "Cronograma copiado para envio!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Popup bloqueado", description: "Permita popups para exportar PDF.", variant: "destructive" });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cronograma — ${projectName || "Obra"}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
          h1 { color: #1F4E79; border-bottom: 3px solid #1F4E79; padding-bottom: 12px; font-size: 24px; }
          .week-block { margin: 16px 0; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1F4E79; }
          .week-title { margin: 0 0 10px; color: #334155; font-size: 16px; font-weight: 600; }
          .disc-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; margin: 3px; }
          .footer { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 32px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1> Cronograma — ${projectName || "Obra"}</h1>
        ${mergedBlocks.map(block => `
          <div class="week-block">
            <div class="week-title">${block.weekRange}</div>
            <div>${Array.from(block.disciplines.entries()).map(([disc, info]) =>
              `<span class="disc-badge" style="background: ${info.color}22; color: ${info.color}; border: 1px solid ${info.color}44;">${disc}</span>`
            ).join("")}</div>
          </div>
        `).join("")}
        <div class="footer">Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4" ref={printRef}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-display flex items-center gap-1.5">
            Visão do Cliente
            <InfoHint>Resumo semanal por disciplina.</InfoHint>
          </h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Exportar PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copiado!" : "Copiar para Enviar"}
          </Button>
        </div>
      </div>

      {mergedBlocks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          Nenhuma etapa visível para o cliente. Marque tarefas como "Visível para cliente" no formulário.
        </div>
      ) : (
        <div className="grid gap-3">
          {mergedBlocks.map((block, i) => (
            <Card key={i} className="border-l-4" style={{ borderLeftColor: "#1F4E79" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-display">{block.weekRange}</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(block.disciplines.entries()).map(([disc, info]) => (
                    <Badge
                      key={disc}
                      variant="outline"
                      className="text-xs px-3 py-1"
                      style={{
                        backgroundColor: `${info.color}15`,
                        borderColor: `${info.color}44`,
                        color: info.color,
                      }}
                    >
                      {disc}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
