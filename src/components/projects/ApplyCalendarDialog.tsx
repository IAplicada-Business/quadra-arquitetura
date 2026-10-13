// Aplica o calendário BR (Prompts 2/3/4 do guia da Mariana) ao
// cronograma do projeto: pega a lista de atividades, respeita
// `depends_on`/durações, pula fim de semana, feriados nacionais e o
// recesso de 20/12 a 05/01.
import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, AlertCircle } from "lucide-react";
import { buildTimeline, type ScheduleStep } from "@/lib/businessCalendar";
import type { ProjectActivity } from "@/hooks/useProjectActivities";

interface ApplyCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: ProjectActivity[];
  defaultStartDate?: string | null;
  onApply: (changes: { id: string; start_date: string; end_date: string }[]) => void;
  isApplying?: boolean;
}

export function ApplyCalendarDialog({
  open, onOpenChange, activities, defaultStartDate, onApply, isApplying,
}: ApplyCalendarDialogProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(defaultStartDate || today);
  const [extraHolidaysText, setExtraHolidaysText] = useState("");
  const [includeYearEndRecess, setIncludeYearEndRecess] = useState(true);

  const validActivities = useMemo(
    () => activities.filter((a) => a.duration_days && a.duration_days > 0),
    [activities],
  );

  const skippedCount = activities.length - validActivities.length;

  const preview = useMemo(() => {
    if (!startDate || validActivities.length === 0) return [];
    const extras = extraHolidaysText
      .split(/[,;\n\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));

    const steps: ScheduleStep[] = validActivities.map((a) => ({
      id: a.id,
      name: a.name,
      duration_days: a.duration_days as number,
      depends_on: a.depends_on ?? undefined,
    }));

    return buildTimeline(steps, startDate, {
      includeYearEndRecess,
      extraHolidays: extras,
    });
  }, [validActivities, startDate, extraHolidaysText, includeYearEndRecess]);

  const handleApply = () => {
    if (preview.length === 0) return;
    onApply(preview.map((s) => ({ id: s.id, start_date: s.start_date, end_date: s.end_date })));
  };

  const lastEnd = useMemo(() => {
    if (preview.length === 0) return null;
    return preview.reduce((max, s) => (s.end_date > max ? s.end_date : max), preview[0].end_date);
  }, [preview]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Aplicar calendário brasileiro ao cronograma
          </DialogTitle>
          <DialogDescription>
            Calcula data de início e término de cada atividade respeitando feriados nacionais,
            fim de semana e (opcionalmente) o recesso de 20/12 a 05/01.
            Usa as dependências (<code>depends_on</code>) já cadastradas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de início da obra</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Feriados extras (estaduais/municipais)</Label>
              <Input
                placeholder="Ex: 2026-08-15, 2026-12-08"
                value={extraHolidaysText}
                onChange={(e) => setExtraHolidaysText(e.target.value)}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeYearEndRecess}
              onChange={(e) => setIncludeYearEndRecess(e.target.checked)}
            />
            Considerar recesso de fim de ano (20/12 a 05/01) como não-útil
          </label>

          {skippedCount > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-warning-ink" />
              <span>
                {skippedCount} atividade(s) sem duração em dias serão ignoradas.
                Edite a atividade e preencha <strong>duração (dias)</strong> antes de aplicar.
              </span>
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pré-visualização ({preview.length} atividades)</Label>
                {lastEnd && (
                  <Badge variant="outline" className="text-xs">
                    Término previsto: {new Date(lastEnd + "T00:00:00").toLocaleDateString("pt-BR")}
                  </Badge>
                )}
              </div>
              <div className="max-h-[40vh] overflow-y-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Atividade</th>
                      <th className="text-left p-2 font-medium w-20">Dias</th>
                      <th className="text-left p-2 font-medium w-28">Início</th>
                      <th className="text-left p-2 font-medium w-28">Término</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2">{s.name}</td>
                        <td className="p-2 text-muted-foreground">{s.duration_days}</td>
                        <td className="p-2 font-mono">{s.start_date}</td>
                        <td className="p-2 font-mono">{s.end_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply} disabled={preview.length === 0 || isApplying}>
            Aplicar a {preview.length} atividade(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
