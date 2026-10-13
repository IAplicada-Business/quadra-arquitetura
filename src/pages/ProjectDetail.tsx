import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { statusLabels } from "@/lib/projectConstants";
import { ProjectSummaryTab } from "@/components/projects/ProjectSummaryTab";
import { ProjectScopeTab } from "@/components/projects/ProjectScopeTab";
import { ProjectBudgetsTab } from "@/components/projects/ProjectBudgetsTab";
import { ProjectMaterialsTab } from "@/components/projects/ProjectMaterialsTab";
import { ProjectScheduleTab } from "@/components/projects/ProjectScheduleTab";
import { ProjectFinancialTab } from "@/components/projects/ProjectFinancialTab";
import { ProjectDocumentsTab } from "@/components/projects/ProjectDocumentsTab";
import { ProjectTrackingTab } from "@/components/projects/ProjectTrackingTab";
import { ProjectOnboardingTab } from "@/components/projects/ProjectOnboardingTab";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { project, isLoading } = useProjectDetail(id);
  const [activeTab, setActiveTab] = useState("resumo");
  const isMobile = useIsMobile();

  const tabs = [
    { value: "resumo", label: "Resumo" },
    { value: "escopo", label: "Escopo" },
    { value: "orcamentos", label: "Orçamentos" },
    { value: "materiais", label: "Materiais" },
    { value: "cronograma", label: "Cronograma" },
    { value: "financeiro", label: "Prestação de Contas" },
    { value: "documentos", label: "Documentos" },
    { value: "acompanhamento", label: "Acompanhamento" },
    { value: "onboarding", label: "Onboarding" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-display font-bold mb-2">Projeto não encontrado</h2>
        <Button variant="outline" onClick={() => navigate("/projects")}>Voltar para Projetos</Button>
      </div>
    );
  }

  const clientName = (project.clients as { name: string } | null)?.name;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs text-muted-foreground [&>li>svg]:size-3">
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/projects">Gestão de Obras</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/projects">Obras</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-primary font-medium">{project.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-1" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            {(project as any).project_number && (
              <Badge variant="outline" className="text-xs font-mono">
                {(project as any).project_number}
              </Badge>
            )}
            <h1 className="text-2xl font-bold text-display">{project.name}</h1>
            <Badge variant="secondary">
              {statusLabels[project.status || ""] || project.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            {clientName && <span>Cliente: {clientName}</span>}
            {project.address && <span> {project.address}{project.city ? `, ${project.city}` : ""}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isMobile ? (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Ir para aba...">
                {tabs.find(t => t.value === activeTab)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabs.map(tab => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        <div className="mt-4">
          <TabsContent value="resumo">
            <ProjectSummaryTab project={project as Record<string, unknown>} onTabChange={setActiveTab} />
          </TabsContent>
          <TabsContent value="escopo">
            <ProjectScopeTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="orcamentos">
            <ProjectBudgetsTab projectId={project.id} projectName={project.name} />
          </TabsContent>
          <TabsContent value="materiais">
            <ProjectMaterialsTab projectId={project.id} projectName={project.name} />
          </TabsContent>
          <TabsContent value="cronograma">
            <ProjectScheduleTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="financeiro">
            <ProjectFinancialTab projectId={project.id} projectName={project.name} />
          </TabsContent>
          <TabsContent value="documentos">
            <ProjectDocumentsTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="acompanhamento">
            <ProjectTrackingTab projectId={project.id} />
          </TabsContent>
          <TabsContent value="onboarding">
            <ProjectOnboardingTab
              projectId={project.id}
              projectName={project.name}
              clientName={clientName}
              address={project.address}
              city={project.city}
              startDate={project.start_date}
              expectedEndDate={project.expected_end_date}
              moveInDate={project.client_move_in_date}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
