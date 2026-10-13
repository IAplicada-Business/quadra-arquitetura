import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  HardHat,
  Clock,
  Truck,
  CreditCard,
  BarChart3,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShowMoreButton, useShowMore } from "@/components/visual/ShowMore";
import { MultiObrasView } from "@/components/dashboard/MultiObrasView";
import { buildMultiObras } from "@/lib/multiObras";
import { PageTitle } from "@/components/layout/PageTitle";
import { InfoHint } from "@/components/visual/InfoHint";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { C } from "@/lib/chartColors";

/* ── paleta obras — alinhada ao brand navy/terra ── */
const AZUL = {
  destaque:      C.navy,
  fundoSuave:    C.navyBg,
  textoDestaque: C.navyMid,
  fill1:         C.navy,
  fill2:         C.terra,
  fill3:         C.navyMid,
  fill4:         C.navyFaint,
};

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

const ACTIVE_PROJECTS_LIMIT = 4;

interface BudgetRow {
  id: string;
  number: string;
  name: string;
  orcado: number;
  gasto: number;
}

/**
 * Orçado x gasto como barras horizontais sobrepostas: a trilha clara é o
 * comprometido, o preenchimento escuro é o que já foi pago. Antes eram
 * barras verticais agrupadas com o nome do projeto no eixo X — os nomes
 * eram cortados em 12 letras e a base do gráfico ficava cortada. Aqui o
 * nome inteiro fica à esquerda, o valor à direita e a altura cresce com o
 * número de obras.
 */
function BudgetBars({ data }: { data: BudgetRow[] }) {
  const max = Math.max(...data.map((d) => Math.max(d.orcado, d.gasto)), 1);
  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground" aria-hidden>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: AZUL.fill4 }} /> Orçado (comprometido)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: AZUL.fill1 }} /> Gasto (pago)
          </span>
        </div>
        <ul className="space-y-3">
          {data.map((d) => {
            const pct = d.orcado > 0 ? Math.round((d.gasto / d.orcado) * 100) : 0;
            return (
              <li key={d.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={`/projects/${d.id}`}
                      className="grid grid-cols-1 sm:grid-cols-[minmax(0,200px)_1fr_auto] items-center gap-x-4 gap-y-1 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0 text-sm">
                        {d.number && <span className="font-mono text-xs text-muted-foreground shrink-0">{d.number}</span>}
                        <span className="truncate font-medium">{d.name}</span>
                      </span>
                      <span className="relative h-3 w-full">
                        <span
                          className="absolute inset-y-0 left-0 rounded-[4px]"
                          style={{ width: `${(d.orcado / max) * 100}%`, backgroundColor: AZUL.fill4 }}
                        />
                        <span
                          className="absolute inset-y-0 left-0 rounded-[4px]"
                          style={{ width: `${(d.gasto / max) * 100}%`, backgroundColor: AZUL.fill1, minWidth: d.gasto > 0 ? 3 : 0 }}
                        />
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground sm:text-right whitespace-nowrap">
                        <span className="font-semibold text-foreground">{fmt(d.gasto)}</span> de {fmt(d.orcado)} · {pct}%
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-medium">{d.number ? `${d.number} · ` : ""}{d.name}</p>
                    <p className="text-xs">Orçado: {fmt(d.orcado)}</p>
                    <p className="text-xs">Gasto: {fmt(d.gasto)} ({pct}%)</p>
                    <p className="text-xs">Saldo: {fmt(Math.max(d.orcado - d.gasto, 0))}</p>
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </div>
    </TooltipProvider>
  );
}

/* ── componente ────────────────────────────────── */
export default function DashboardObras() {
  const { user } = useAuth();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const [activeTab, setActiveTab] = useState<"geral" | "multiobras">("geral");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");

  // ── Queries — dados ao vivo, refetch ao focar a aba ──
  const liveOpts = { enabled: !!user, staleTime: 30 * 1000, refetchOnWindowFocus: true, refetchOnMount: true };

  const { data: projects = [] } = useQuery({
    queryKey: ["dash-obras-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, status, estimated_budget, project_number");
      return data ?? [];
    },
    ...liveOpts,
  });

  const { data: scheduleTasks = [] } = useQuery({
    queryKey: ["dash-obras-schedule"],
    queryFn: async () => {
      const { data } = await supabase.from("schedule_tasks").select("id, task_name, start_date, end_date, status, discipline, project_id, supplier_name, projects(name)");
      return data ?? [];
    },
    ...liveOpts,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["dash-obras-materials"],
    queryFn: async () => {
      const { data } = await supabase.from("material_tracking").select("id, material_name, quantity_purchased, delivery_date, purchase_date, project_id, projects(name)");
      return data ?? [];
    },
    ...liveOpts,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["dash-obras-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("id, value, due_date, status, supplier_name, description, project_id, source, projects(name)");
      return (data ?? []).filter((p: any) => p.source !== "escritorio");
    },
    ...liveOpts,
  });

  // ── BLOCO 1 — Visão Geral de Projetos ──
  const projectCards = useMemo(() => {
    const active = projects.filter((p) =>
      (["execucao", "mobilizacao", "planejamento"].includes(p.status ?? "") || !p.status) &&
      (filterStatus === "all" || p.status === filterStatus) &&
      (!filterSearch || p.name?.toLowerCase().includes(filterSearch.toLowerCase()))
    );
    return active.map((proj) => {
      const tasks = scheduleTasks.filter((t) => t.project_id === proj.id);
      const total = tasks.length;
      const done = tasks.filter((t) => t.status === "executado" || t.status === "concluido").length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      const nextTask = tasks
        .filter((t) => t.start_date && t.start_date >= todayStr && t.status !== "executado" && t.status !== "concluido")
        .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""))[0];

      const statusLabel: Record<string, string> = { execucao: "Em execução", mobilizacao: "Mobilização", planejamento: "Planejamento" };
      const statusColor: Record<string, string> = { execucao: C.success, mobilizacao: C.warning, planejamento: C.navyMid };

      return {
        id: proj.id,
        name: proj.name,
        number: proj.project_number ?? "",
        progress,
        status: statusLabel[proj.status ?? ""] ?? proj.status ?? "",
        statusColor: statusColor[proj.status ?? ""] ?? AZUL.fill2,
        nextTask: nextTask?.task_name ?? null,
      };
    });
  }, [projects, scheduleTasks, todayStr, filterStatus, filterSearch]);

  // No máximo 4 projetos na tela; "Ver todos" abre o resto.
  const moreProjects = useShowMore(projectCards, ACTIVE_PROJECTS_LIMIT, `${filterStatus}|${filterSearch}`);

  // ── BLOCO 2 — Alertas ──
  const alerts = useMemo(() => {
    const overdueTasks = scheduleTasks
      .filter((t) => t.end_date && t.end_date < todayStr && t.status !== "executado" && t.status !== "concluido")
      .map((t) => ({
        taskName: t.task_name,
        projectId: t.project_id,
        projectName: (t as any).projects?.name ?? "",
        daysOverdue: differenceInDays(today, parseISO(t.end_date!)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 10);

    const sevenDaysAgo = format(addDays(today, -7), "yyyy-MM-dd");
    const delayedMaterials = materials
      .filter((m) => (m as any).purchase_date && !(m as any).delivery_date && (m as any).purchase_date <= sevenDaysAgo)
      .map((m) => ({
        materialName: m.material_name,
        projectId: m.project_id,
        projectName: (m as any).projects?.name ?? "",
        daysSincePurchase: differenceInDays(today, parseISO((m as any).purchase_date)),
      }))
      .sort((a, b) => b.daysSincePurchase - a.daysSincePurchase);

    const overduePayments = payments
      .filter((p) => p.due_date && p.due_date < todayStr && (p.status === "pendente" || p.status === "atrasado"))
      .map((p) => ({
        description: p.supplier_name ?? p.description ?? "Pagamento",
        projectId: p.project_id ?? "",
        projectName: (p as any).projects?.name ?? "",
        value: p.value,
        daysOverdue: differenceInDays(today, parseISO(p.due_date!)),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    return { overdueTasks, delayedMaterials, overduePayments };
  }, [scheduleTasks, materials, payments, todayStr, today]);

  // ── BLOCO 3 — Financeiro ──
  // "orcado" = total comprometido em compras/pagamentos da obra (não o
  // valor do contrato com o cliente). Se não houver pagamentos
  // registrados ainda, cai de volta para estimated_budget.
  const finChartData = useMemo(() => {
    const active = projects.filter((p) => p.status !== "concluido");
    return active.map((proj) => {
      const projPayments = payments.filter((p) => p.project_id === proj.id);
      const pago = projPayments.filter((p) => p.status === "pago").reduce((s, p) => s + p.value, 0);
      const comprometido = projPayments.reduce((s, p) => s + p.value, 0);
      return {
        id: proj.id,
        number: proj.project_number ?? "",
        name: proj.name ?? "",
        orcado: comprometido > 0 ? comprometido : (proj.estimated_budget ?? 0),
        gasto: pago,
      };
    })
      .filter((d) => d.orcado > 0 || d.gasto > 0)
      .sort((a, b) => b.orcado - a.orcado);
  }, [projects, payments]);

  // ── Multi-Obras ──
  const multiObras = useMemo(() => {
    const visible = projects.filter((p) =>
      (filterStatus === "all" || p.status === filterStatus) &&
      (!filterSearch || p.name?.toLowerCase().includes(filterSearch.toLowerCase()))
    );
    return buildMultiObras(visible, scheduleTasks, new Date(`${todayStr}T12:00:00`));
  }, [projects, scheduleTasks, todayStr, filterStatus, filterSearch]);

  return (
    <div className="space-y-5">
      <PageTitle
        title="Dashboard Obras"
        description="Andamento das obras ativas, alertas e financeiro de obra. Em “Multi-obras”: ritmo de cada obra, linha do tempo e agenda dos fornecedores."
      />
      {/* Uma tela só: "Visão" é um filtro, ao lado de busca e status
          (antes eram duas abas separadas com a mesma barra de filtros). */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={activeTab} onValueChange={(v) => setActiveTab(v as "geral" | "multiobras")}>
          <SelectTrigger className="w-full sm:w-[170px] h-9" aria-label="Visão"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="geral">Visão geral</SelectItem>
            <SelectItem value="multiobras">Multi-obras</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar obra..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} className="pl-8 w-full sm:w-48 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="execucao">Em Execução</SelectItem>
            <SelectItem value="mobilizacao">Mobilização</SelectItem>
            <SelectItem value="planejamento">Planejamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activeTab === "geral" && (<>

      {/* ═══ BLOCO 1 — VISÃO GERAL DOS PROJETOS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            Projetos Ativos
            {projectCards.length > 0 && <Badge variant="secondary" className="text-xs">{projectCards.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projectCards.length > 0 ? (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {moreProjects.visible.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.number && <Badge variant="outline" className="text-xs font-mono shrink-0">{p.number}</Badge>}
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs" style={{ borderColor: p.statusColor, color: p.statusColor }}>{p.status}</Badge>
                      <span className="text-sm font-semibold" style={{ color: AZUL.destaque }}>{p.progress}%</span>
                    </div>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: AZUL.fundoSuave }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, backgroundColor: AZUL.destaque }} />
                  </div>
                  {p.nextTask && <p className="text-xs text-muted-foreground mt-1.5 truncate">Próx: {p.nextTask}</p>}
                </Link>
              ))}
            </div>
            <ShowMoreButton
              expanded={moreProjects.expanded}
              hasMore={moreProjects.hasMore}
              total={projectCards.length}
              onToggle={moreProjects.toggle}
              noun="projetos"
            />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HardHat className="h-12 w-12 text-primary/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Nenhuma obra ativa</p>
              <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Criar obra <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ BLOCO 2 — ALERTAS CONSOLIDADOS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Atividades atrasadas */}
        <Card className="border-l-4" style={{ borderLeftColor: alerts.overdueTasks.length > 0 ? C.danger : C.success }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: C.danger }} />
              Atividades Atrasadas
              {alerts.overdueTasks.length > 0 && <Badge variant="destructive" className="text-xs">{alerts.overdueTasks.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.overdueTasks.length > 0 ? (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {alerts.overdueTasks.map((t, i) => (
                  <Link key={i} to={`/projects/${t.projectId}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-sm">
                    <div>
                      <p className="font-medium text-xs">{t.taskName}</p>
                      <p className="text-xs text-muted-foreground">{t.projectName}</p>
                    </div>
                    <Badge variant="outline" className="text-xs" style={{ borderColor: C.danger, color: C.danger }}>{t.daysOverdue}d</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">Nenhuma tarefa atrasada</p>
            )}
          </CardContent>
        </Card>

        {/* Materiais não entregues */}
        <Card className="border-l-4" style={{ borderLeftColor: alerts.delayedMaterials.length > 0 ? C.warning : C.success }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4" style={{ color: C.warning }} />
              Materiais Aguardando
              {alerts.delayedMaterials.length > 0 && <Badge className="text-xs" style={{ backgroundColor: C.warning, color: "white" }}>{alerts.delayedMaterials.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.delayedMaterials.length > 0 ? (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {alerts.delayedMaterials.map((m, i) => (
                  <Link key={i} to={`/projects/${m.projectId}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-sm">
                    <div>
                      <p className="font-medium text-xs">{m.materialName}</p>
                      <p className="text-xs text-muted-foreground">{m.projectName}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{m.daysSincePurchase}d</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">Nenhum material atrasado</p>
            )}
          </CardContent>
        </Card>

        {/* Pagamentos de obra vencidos */}
        <Card className="border-l-4" style={{ borderLeftColor: alerts.overduePayments.length > 0 ? C.danger : C.success }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" style={{ color: C.danger }} />
              Pagamentos Vencidos
              {alerts.overduePayments.length > 0 && <Badge variant="destructive" className="text-xs">{alerts.overduePayments.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.overduePayments.length > 0 ? (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {alerts.overduePayments.map((p, i) => (
                  <Link key={i} to={`/projects/${p.projectId}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-sm">
                    <div>
                      <p className="font-medium text-xs">{p.description}</p>
                      <p className="text-xs text-muted-foreground">{p.projectName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{fmt(p.value)}</p>
                      <p className="text-xs" style={{ color: C.danger }}>{p.daysOverdue}d</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">Nenhum pagamento vencido</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ BLOCO 3 — FINANCEIRO DE OBRAS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-1.5">
            Orçado (comprometido) vs Gasto por Projeto
            <InfoHint>Quanto do comprometido em compras e pagamentos de cada obra já foi pago.</InfoHint>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finChartData.length > 0 ? (
            <BudgetBars data={finChartData} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-primary/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum dado financeiro disponível</p>
            </div>
          )}
        </CardContent>
      </Card>

      </>)}

      {/* ═══ MULTI-OBRAS ═══ */}
      {activeTab === "multiobras" && <MultiObrasView data={multiObras} />}
    </div>
  );
}
