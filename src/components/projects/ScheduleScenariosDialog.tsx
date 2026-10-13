// Sprint 6 — Cenários "what-if" de cronograma. Permite criar
// snapshots editáveis do cronograma, mexer em durações/dependências/
// datas e comparar com o baseline antes de promover.
import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Pencil, Trash2, FlaskConical, CalendarCheck, CheckCircle2, BarChart3,
} from "lucide-react";
import {
  useScheduleScenarios, type ScheduleScenarioActivity, type ScenarioWithActivities,
} from "@/hooks/useScheduleScenarios";
import { ProjectActivity } from "@/hooks/useProjectActivities";

interface ScheduleScenariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectStartDate: string | null;
  activities: ProjectActivity[];
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function findLastEnd(items: { end_date: string | null }[]): string | null {
  let last: string | null = null;
  for (const it of items) {
    if (!it.end_date) continue;
    if (!last || it.end_date > last) last = it.end_date;
  }
  return last;
}

export function ScheduleScenariosDialog({
  open, onOpenChange, projectId, projectStartDate, activities,
}: ScheduleScenariosDialogProps) {
  const {
    scenarios, isLoading,
    createFromCurrent, updateScenario, removeScenario, updateActivity,
    recalcCenarioTimeline, promoteToProject,
  } = useScheduleScenarios(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<ScheduleScenarioActivity | null>(null);
  const [editDuration, setEditDuration] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(projectStartDate ?? today);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? null;

  // Comparativo: baseline (atual em project_activities) vs cenário ativo.
  const baselineEnd = useMemo(() => findLastEnd(activities), [activities]);
  const scenarioEnd = useMemo(
    () => (activeScenario ? findLastEnd(activeScenario.activities) : null),
    [activeScenario],
  );
  const baselineDurationDays = useMemo(
    () => activities.reduce((s, a) => s + (a.duration_days ?? 0), 0),
    [activities],
  );
  const scenarioDurationDays = useMemo(
    () => (activeScenario ? activeScenario.activities.reduce((s, a) => s + (a.duration_days ?? 0), 0) : 0),
    [activeScenario],
  );

  const handleCreate = () => {
    if (!draft.name.trim()) return;
    createFromCurrent.mutate(
      { name: draft.name.trim(), description: draft.description.trim() || undefined },
      {
        onSuccess: (scenario) => {
          setCreateOpen(false);
          setDraft({ name: "", description: "" });
          setActiveScenarioId(scenario.id);
        },
      },
    );
  };

  const openEditActivity = (a: ScheduleScenarioActivity) => {
    setEditingActivity(a);
    setEditDuration(a.duration_days?.toString() ?? "");
  };

  const saveActivityEdit = () => {
    if (!editingActivity || !activeScenario) return;
    const dur = editDuration ? parseInt(editDuration) : null;
    updateActivity.mutate(
      { id: editingActivity.id, scenarioId: activeScenario.id, duration_days: dur },
      {
        onSuccess: () => {
          setEditingActivity(null);
          setEditDuration("");
        },
      },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-accent-ink" />
              Cenários de Cronograma
            </DialogTitle>
            <DialogDescription>
              Crie snapshots editáveis do cronograma para testar mudanças sem afetar o vigente. Quando estiver satisfeita, promova a cenário definitivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {scenarios.length} cenário(s) cadastrado(s)
              </p>
              <Button size="sm" onClick={() => setCreateOpen(true)} disabled={activities.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Novo Cenário
              </Button>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
            ) : scenarios.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum cenário criado. Use "Novo Cenário" para fotografar o cronograma atual e começar a testar mudanças.
                </CardContent>
              </Card>
            ) : (
              <Tabs
                value={activeScenarioId ?? scenarios[0]?.id ?? ""}
                onValueChange={setActiveScenarioId}
              >
                <TabsList className="flex flex-wrap h-auto">
                  {scenarios.map((s) => (
                    <TabsTrigger key={s.id} value={s.id} className="gap-1">
                      {s.is_baseline && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                      {s.name}
                      <Badge variant="secondary" className="text-[10px] ml-1">
                        {s.activities.length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {scenarios.map((s) => (
                  <TabsContent key={s.id} value={s.id} className="space-y-4 mt-4">
                    <ScenarioSummary
                      scenario={s}
                      baselineDurationDays={baselineDurationDays}
                      scenarioDurationDays={
                        s.id === (activeScenarioId ?? scenarios[0]?.id)
                          ? scenarioDurationDays
                          : s.activities.reduce((acc, a) => acc + (a.duration_days ?? 0), 0)
                      }
                      baselineEnd={baselineEnd}
                      scenarioEnd={s.id === (activeScenarioId ?? scenarios[0]?.id) ? scenarioEnd : findLastEnd(s.activities)}
                    />

                    <div className="flex flex-wrap items-end gap-3 p-3 rounded-md border bg-muted/20">
                      <div>
                        <Label className="text-xs">Data de início para recalcular</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-48"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => recalcCenarioTimeline.mutate({ scenarioId: s.id, projectStart: startDate })}
                        disabled={recalcCenarioTimeline.isPending}
                      >
                        <CalendarCheck className="h-4 w-4 mr-1" /> Recalcular calendário BR
                      </Button>
                      <div className="flex-1" />
                      <Button
                        size="sm"
                        variant={s.is_baseline ? "outline" : "default"}
                        onClick={() => promoteToProject.mutate(s.id)}
                        disabled={promoteToProject.isPending || s.is_baseline}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {s.is_baseline ? "Já é o vigente" : "Promover a vigente"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeScenario.mutate(s.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Excluir cenário
                      </Button>
                    </div>

                    <div className="rounded-md border max-h-[40vh] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Atividade</TableHead>
                            <TableHead>Disciplina</TableHead>
                            <TableHead className="text-right">Duração</TableHead>
                            <TableHead>Início</TableHead>
                            <TableHead>Fim</TableHead>
                            <TableHead className="w-16" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {s.activities
                            .slice()
                            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                            .map((a, idx) => (
                              <TableRow key={a.id}>
                                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="text-xs font-medium">{a.name}</TableCell>
                                <TableCell className="text-xs">{a.discipline ?? "—"}</TableCell>
                                <TableCell className="text-xs text-right">
                                  {a.duration_days ?? "—"}d
                                </TableCell>
                                <TableCell className="text-xs">{fmtDate(a.start_date)}</TableCell>
                                <TableCell className="text-xs">{fmtDate(a.end_date)}</TableCell>
                                <TableCell>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => openEditActivity(a)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: criar cenário */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cenário</DialogTitle>
            <DialogDescription>
              Copia as atividades atuais do projeto para um cenário editável.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Acelerado (com obra noturna)"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!draft.name.trim() || createFromCurrent.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar duração da atividade no cenário */}
      <Dialog open={!!editingActivity} onOpenChange={(v) => !v && setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar atividade no cenário</DialogTitle>
            <DialogDescription>
              Mudar a duração só afeta o cenário. As datas serão recalculadas se você rodar "Recalcular calendário BR".
            </DialogDescription>
          </DialogHeader>
          {editingActivity && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{editingActivity.name}</p>
              <div>
                <Label>Duração (dias úteis)</Label>
                <Input
                  type="number"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingActivity(null)}>Cancelar</Button>
            <Button onClick={saveActivityEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScenarioSummary({
  scenario, baselineDurationDays, scenarioDurationDays, baselineEnd, scenarioEnd,
}: {
  scenario: ScenarioWithActivities;
  baselineDurationDays: number;
  scenarioDurationDays: number;
  baselineEnd: string | null;
  scenarioEnd: string | null;
}) {
  const durationDelta = scenarioDurationDays - baselineDurationDays;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Cenário</p>
          <p className="font-display text-lg font-medium leading-tight">{scenario.name}</p>
          {scenario.description && (
            <p className="text-xs text-muted-foreground mt-1">{scenario.description}</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Duração total (soma dias úteis)
          </div>
          <p className="font-display text-2xl">{scenarioDurationDays}d</p>
          {baselineDurationDays > 0 && (
            <p className="text-xs text-muted-foreground">
              Vigente: {baselineDurationDays}d
              {durationDelta !== 0 && (
                <span className={durationDelta > 0 ? "text-destructive ml-1" : "text-success ml-1"}>
                  ({durationDelta > 0 ? "+" : ""}{durationDelta}d)
                </span>
              )}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Término previsto</p>
          <p className="font-display text-lg">{fmtDate(scenarioEnd)}</p>
          {baselineEnd && (
            <p className="text-xs text-muted-foreground">Vigente: {fmtDate(baselineEnd)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
