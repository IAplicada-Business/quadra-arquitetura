import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format, subDays, isAfter } from "date-fns";
import { ProjectOnboardingGuide } from "./ProjectOnboardingGuide";
import { MoveInCountdown } from "./MoveInCountdown";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { ptBR } from "date-fns/locale";
import { statusLabels } from "@/lib/projectConstants";
import { Button } from "@/components/ui/button";
import { Wallet, Hammer, FileText, HardHat, Link2 } from "lucide-react";
import { useScheduleTasks } from "@/hooks/useScheduleTasks";
import { useProjectPayments } from "@/hooks/useProjectPayments";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { PortalLinkDialog } from "./PortalLinkDialog";
import { BudgetEstimator } from "./BudgetEstimator";
function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

interface ProjectSummaryTabProps {
  project: Record<string, unknown>;
  onTabChange?: (tab: string) => void;
}

export function ProjectSummaryTab({ project, onTabChange }: ProjectSummaryTabProps) {
  const clientName = (project.clients as { name: string } | null)?.name;
  const projectId = project.id as string;

  const { updateProject } = useProjectDetail(projectId);
  const { items: tasks } = useScheduleTasks(projectId);
  const { items: payments } = useProjectPayments(projectId);
  const { activities } = useProjectActivities(projectId);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);

  // Onboarding guide criteria
  const isNewProject =
    project.onboarding_dismissed !== true &&
    activities.length === 0 &&
    project.cotacao_aprovada !== true &&
    isAfter(new Date(project.created_at as string), subDays(new Date(), 7));
  const showOnboarding = project.onboarding_dismissed !== true && isNewProject;

  const idealBudget = (project.ideal_budget as number) || 0;
  const contractedBudget = (project.estimated_budget as number) || 0;

  // Real budget from paid payments
  const realBudget = payments
    .filter((p: any) => p.status === "pago")
    .reduce((sum: number, p: any) => sum + (p.value || 0), 0);

  // Progress from schedule tasks
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === "executado").length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const contractedPercent = idealBudget > 0 ? Math.min((contractedBudget / idealBudget) * 100, 100) : 0;
  const realPercent = contractedBudget > 0 ? Math.min((realBudget / contractedBudget) * 100, 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Onboarding Guide */}
      {showOnboarding && (
        <ProjectOnboardingGuide
          project={project}
          onTabChange={onTabChange}
          onDismiss={() => updateProject.mutate({ onboarding_dismissed: true })}
        />
      )}

      {/* Sprint 7d — countdown da mudança do cliente (pedido na call). */}
      <MoveInCountdown moveInDate={(project as any).client_move_in_date ?? null} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Orçamento Ideal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-display">{formatCurrency(idealBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Contratado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(contractedBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(realBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold">{progress}%</span>
              <Badge variant="outline">{statusLabels[project.status as string] || String(project.status ?? "")}</Badge>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">{completedTasks}/{totalTasks} etapas concluídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Bars Comparison */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-display">Comparativo Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Idealizado</span>
              <span className="font-medium">{formatCurrency(idealBudget)}</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-400" style={{ width: "100%" }} />
            </div>

            <div className="flex justify-between text-sm mt-2">
              <span>Contratado</span>
              <span className="font-medium">{formatCurrency(contractedBudget)}</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${contractedPercent}%` }} />
            </div>

            <div className="flex justify-between text-sm mt-2">
              <span>Pago / Realizado</span>
              <span className="font-medium">{formatCurrency(realBudget)}</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${realPercent}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: Wallet, label: "Financeiro", tab: "financeiro" },
          { icon: Hammer, label: "Cronograma", tab: "cronograma" },
          { icon: FileText, label: "Documentos", tab: "documentos" },
          { icon: HardHat, label: "Diário de Obra", tab: "acompanhamento" },
        ].map((link, i) => (
          <Button
            key={i}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
            onClick={() => onTabChange?.(link.tab)}
          >
            <link.icon className="h-6 w-6 text-primary" />
            <span>{link.label}</span>
          </Button>
        ))}
        <Button
          variant="outline"
          className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/30 transition-all"
          onClick={() => setPortalDialogOpen(true)}
        >
          <Link2 className="h-6 w-6 text-primary" />
          <span>Portal Cliente</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-display">Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{clientName || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Endereço</span>
              <span className="font-medium">{(project.address as string) || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Cidade</span>
              <span className="font-medium">{(project.city as string) || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Data Início</span>
              <span className="font-medium">{formatDate(project.start_date as string)}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">Previsão Término</span>
              <span className="font-medium">{formatDate(project.expected_end_date as string)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Estimator */}
      <BudgetEstimator project={project} updateProject={updateProject} onTabChange={onTabChange} />

      {/* Portal do Cliente Dialog */}
      <PortalLinkDialog projectId={projectId} open={portalDialogOpen} onOpenChange={setPortalDialogOpen} />
    </div>
  );
}
