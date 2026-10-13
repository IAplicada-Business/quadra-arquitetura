import { useState } from "react";
import { Download, Printer, Filter, BarChart3, PieChart, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import WeeklyReportView from "@/components/reports/WeeklyReportView";
import { AccountingReport } from "@/components/reports/AccountingReport";
import { PageTitle } from "@/components/layout/PageTitle";

const REPORT_TYPES = [
  { id: "semanal", name: "Relatório Semanal de Obra", icon: Calendar, desc: "Resumo de atividades, fotos e pendências" },
  { id: "financeiro", name: "Relatório Fiscal (Contabilidade)", icon: TrendingUp, desc: "NFs emitidas e recebidas do mês, para anexar ao extrato bancário" },
  { id: "fornecedor", name: "Relatório de Fornecedores", icon: BarChart3, desc: "Desempenho, pagamentos e contratos" },
  { id: "cliente", name: "Prestação de Contas (Cliente)", icon: PieChart, desc: "Relatório formatado para apresentação ao cliente" },
];

/** `embedded`: dentro de outra tela (aba Relatórios do Dashboard Comercial), sem título próprio. */
export default function Reports({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_simple_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name, address").order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const handlePrint = () => {
    window.print();
  };

  const renderReportContent = () => {
    if (selectedType === "semanal") {
      if (selectedProject === "all") {
        return (
          <div className="flex items-center justify-center h-64 text-muted-foreground italic border-2 border-dashed rounded-lg">
            Selecione uma obra específica para gerar o relatório semanal.
          </div>
        );
      }
      return (
        <WeeklyReportView
          projectId={selectedProject}
          projectName={selectedProjectData?.name || ""}
          projectAddress={selectedProjectData?.address || undefined}
        />
      );
    }

    if (selectedType === "financeiro") {
      return <AccountingReport />;
    }

    // Placeholder for other report types
    return (
      <div className="border rounded-lg bg-card min-h-[600px] p-8 shadow-sm print:shadow-none print:border-none">
        <div className="text-center mb-8 border-b pb-4">
          <h2 className="text-2xl font-bold uppercase tracking-wide">
            {REPORT_TYPES.find(t => t.id === selectedType)?.name}
          </h2>
          <p className="text-muted-foreground mt-1">
            {selectedProject === "all" ? "Relatório Geral" : selectedProjectData?.name}
          </p>
          <p className="text-xs text-muted-foreground mt-2">Gerado em {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex items-center justify-center h-64 text-muted-foreground italic border-2 border-dashed rounded-lg">
          Preview do relatório com dados reais será exibido aqui.
          <br />
          (Implementação dos dados em breve)
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-0 animate-fade-in print:p-0">
      <div className="flex items-center justify-between print:hidden">
        {!embedded && <PageTitle title="Relatórios" description="Geração e exportação de relatórios gerenciais" />}
      </div>

      {/* Filters - Hidden on Print */}
      <div className="flex gap-4 p-4 bg-muted/30 rounded-lg border print:hidden">
        <div className="w-[300px]">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Projetos</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handlePrint} disabled={!selectedType}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
        </Button>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {REPORT_TYPES.map((type) => (
          <Card 
            key={type.id} 
            className={`cursor-pointer hover:border-primary/50 transition-all ${selectedType === type.id ? "border-primary bg-primary/5" : ""}`}
            onClick={() => setSelectedType(type.id)}
          >
            <CardHeader className="pb-2">
              <div className={`p-2 w-fit rounded-lg mb-2 ${selectedType === type.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <type.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-base">{type.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">{type.desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Area */}
      {selectedType ? (
        renderReportContent()
      ) : (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg print:hidden">
          Selecione um tipo de relatório acima para visualizar.
        </div>
      )}
    </div>
  );
}