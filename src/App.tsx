import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardEscritorio from "./pages/DashboardEscritorio";
import DashboardFinanceiro from "./pages/DashboardFinanceiro";
import DashboardObras from "./pages/DashboardObras";
import Clients from "./pages/Clients";
import Projects from "./pages/Projects";
import ProjectsKanban from "./pages/ProjectsKanban";
import ProjectDetail from "./pages/ProjectDetail";
import LeadsPipeline from "./pages/LeadsPipeline";
import LeadDetail from "./pages/LeadDetail";
import PartnersPipeline from "./pages/PartnersPipeline";
import PartnerDetail from "./pages/PartnerDetail";
import LeadsProposals from "./pages/LeadsProposals";
import LeadsContracts from "./pages/LeadsContracts";
import SiteTracking from "./pages/SiteTracking";
import Suppliers from "./pages/Suppliers";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/SettingsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import VoiceTasksPage from "./pages/VoiceTasksPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";
import ClientPortal from "./pages/ClientPortal";
import InvoicesPage from "./pages/InvoicesPage";
import Lancamentos from "./pages/Lancamentos";
import ContentCalendar from "./pages/ContentCalendar";
import ContentScripts from "./pages/ContentScripts";
import ContentPosts from "./pages/ContentPosts";
import ContentInstagram from "./pages/ContentInstagram";
import TasksHub from "./pages/TasksHub";
import BuddyBug from "./pages/BuddyBug";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      // Mesmo fundo --deep do login: não pisca claro antes de entrar.
      <div className="flex items-center justify-center min-h-screen bg-deep" aria-busy="true">
        <div className="animate-spin h-8 w-8 border-2 border-deep-foreground/30 border-t-deep-foreground rounded-full" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Navigate to="/dashboard/escritorio" replace />} />
              <Route path="/dashboard/escritorio" element={<DashboardEscritorio />} />
              <Route path="/dashboard/financeiro" element={<DashboardFinanceiro />} />
              <Route path="/dashboard/obras" element={<DashboardObras />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/kanban" element={<ProjectsKanban />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              {/* Leads */}
              <Route path="/leads/pipeline" element={<LeadsPipeline />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/leads/proposals" element={<LeadsProposals />} />
              <Route path="/leads/contracts" element={<LeadsContracts />} />
              {/* Parceiros — pipeline independente do funil comercial */}
              <Route path="/partners/pipeline" element={<PartnersPipeline />} />
              <Route path="/partners/:id" element={<PartnerDetail />} />
              {/* Obra */}
              <Route path="/construction/tracking" element={<SiteTracking />} />
              {/* Sprint 7 — "Tarefas por Obra" removida.
                  Redundante com Kanban Quadra/Projetos (`/tasks`) e o
                  cronograma da obra. Redireciona pra Kanban Projetos. */}
              <Route path="/construction/tasks" element={<Navigate to="/tasks/projetos" replace />} />
              <Route path="/construction/suppliers" element={<Suppliers />} />
              <Route path="/construction/voice-tasks" element={<VoiceTasksPage />} />
              {/* Sprint 6/7 — Kanbans: visão central (todas) + submenus
                  Projetos / Quadra com filtro pré-aplicado. */}
              <Route path="/tasks" element={<Navigate to="/tasks/projetos" replace />} />
              <Route path="/tasks/projetos" element={<TasksHub mode="projects" />} />
              <Route path="/tasks/quadra" element={<TasksHub mode="quadra" />} />
              {/* Mariana, vídeo 16: "agenda não faz sentido na minha
                  agenda, isso é cronograma — vira Trello". A agenda foi
                  removida; o módulo de tarefas Quadra (kanban) passa a
                  ser a vista única. */}
              <Route path="/construction/agenda" element={<Navigate to="/construction/voice-tasks" replace />} />
              <Route path="/construction/documents" element={<Documents />} />
              <Route path="/construction/reports" element={<Reports />} />
              {/* Administrativo */}
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/invoices" element={<InvoicesPage />} />
              <Route path="/financeiro/lancamentos" element={<Lancamentos />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Buddy (plataforma base IAplicada) — liberado a todo usuário
                  autenticado; mover card no Kanban é admin-only pelo trigger
                  no banco. Vive só no menu superior, não na sidebar. */}
              <Route path="/buddy/bug" element={<BuddyBug />} />
              {/* Gestão de Conteúdo */}
              <Route path="/content/calendar" element={<ContentCalendar />} />
              <Route path="/content/scripts" element={<ContentScripts />} />
              <Route path="/content/posts" element={<ContentPosts />} />
              <Route path="/content/instagram" element={<ContentInstagram />} />
              {/* Redirects de compatibilidade */}
              <Route path="/site-tracking" element={<Navigate to="/construction/tracking" replace />} />
              <Route path="/suppliers" element={<Navigate to="/construction/suppliers" replace />} />
              <Route path="/documents" element={<Navigate to="/construction/documents" replace />} />
              <Route path="/reports" element={<Navigate to="/construction/reports" replace />} />
              <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
              <Route path="/budgets" element={<Navigate to="/projects" replace />} />
              <Route path="/purchases" element={<Navigate to="/projects" replace />} />
              <Route path="/financial" element={<Navigate to="/projects" replace />} />
            </Route>
            <Route path="/client/:token" element={<ClientPortal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
