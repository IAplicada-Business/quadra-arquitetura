import { useState } from "react";
import { Bell, Check, Trash2, Clock, AlertTriangle, XCircle, Package, UserPlus, FileQuestion, Info, Filter } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageTitle } from "@/components/layout/PageTitle";

const typeConfig: Record<string, { icon: typeof Info; label: string; color: string }> = {
  task_overdue: { icon: Clock, label: "Tarefa atrasada", color: "text-orange-500" },
  payment_due_soon: { icon: AlertTriangle, label: "Pagamento próximo", color: "text-yellow-500" },
  payment_overdue: { icon: XCircle, label: "Pagamento vencido", color: "text-destructive" },
  material_pending_delivery: { icon: Package, label: "Material pendente", color: "text-blue-500" },
  new_lead: { icon: UserPlus, label: "Novo lead", color: "text-green-500" },
  quote_no_response: { icon: FileQuestion, label: "Cotação s/ resposta", color: "text-purple-500" },
  info: { icon: Info, label: "Informação", color: "text-blue-500" },
  warning: { icon: AlertTriangle, label: "Aviso", color: "text-yellow-500" },
  success: { icon: Check, label: "Sucesso", color: "text-green-500" },
  error: { icon: XCircle, label: "Erro", color: "text-destructive" },
};

function getNavRoute(n: Notification): string | null {
  if (!n.related_entity_type) return null;
  switch (n.related_entity_type) {
    case "task": return n.related_project_id ? `/projects/${n.related_project_id}` : null;
    case "payment": return n.related_project_id ? `/projects/${n.related_project_id}` : null;
    case "material": return n.related_project_id ? `/projects/${n.related_project_id}` : null;
    case "lead": return "/leads/pipeline";
    case "budget_quote": return n.related_project_id ? `/projects/${n.related_project_id}` : null;
    default: return null;
  }
}

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, remove, unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = notifications.filter((n) => {
    if (filterType !== "all" && n.type !== filterType) return false;
    if (filterStatus === "unread" && n.is_read) return false;
    if (filterStatus === "read" && !n.is_read) return false;
    return true;
  });

  const uniqueTypes = [...new Set(notifications.map((n) => n.type))];

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    const route = getNavRoute(n);
    if (route) navigate(route);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle
          icon={<Bell />}
          title="Notificações"
          meta={unreadCount > 0 ? <Badge variant="default" className="bg-accent text-accent-foreground">{unreadCount} não lidas</Badge> : undefined}
        />
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {uniqueTypes.map((t) => (
              <SelectItem key={t} value={t}>{typeConfig[t]?.label || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <SelectItem value="read">Lidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Mensagem</TableHead>
              <TableHead className="w-32">Data</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma notificação</TableCell>
              </TableRow>
            ) : (
              filtered.map((n) => {
                const cfg = typeConfig[n.type] || typeConfig.info;
                const Icon = cfg.icon;
                return (
                  <TableRow
                    key={n.id}
                    className={`cursor-pointer ${!n.is_read ? "bg-muted/30 font-medium" : "opacity-70"}`}
                    onClick={() => handleClick(n)}
                  >
                    <TableCell><Icon className={`h-4 w-4 ${cfg.color}`} /></TableCell>
                    <TableCell>{n.title}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs max-w-xs truncate">{n.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {!n.is_read && (
                          <button onClick={() => markAsRead.mutate(n.id)} className="p-1 rounded hover:bg-muted" title="Marcar como lida">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => remove.mutate(n.id)} className="p-1 rounded hover:bg-muted text-destructive" title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
