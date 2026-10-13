import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { format, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSkeleton } from "@/components/visual/PageSkeleton";

const FIN_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: format(new Date(2024, i, 1), "MMM", { locale: ptBR }),
}));
const FIN_YEARS = [
  String(new Date().getFullYear()),
  String(new Date().getFullYear() - 1),
  String(new Date().getFullYear() - 2),
];

const CATEGORIES_RECEITA = [
  "Honorários",
  "Consultoria",
  "Assessoria",
  "Reembolso",
  "Outro",
];

const CATEGORIES_DESPESA = [
  "Aluguel",
  "Salários",
  "Software",
  "Marketing",
  "Material de escritório",
  "Contador",
  "Impostos",
  "Serviços terceiros",
  "Outro",
];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

interface Project {
  id: string;
  name: string;
}

interface Lancamento {
  id: string;
  description: string | null;
  value: number;
  payment_type: string;
  status: string | null;
  due_date: string | null;
  paid_date: string | null;
  supplier_name: string | null;
  project_id: string | null;
  projects: { name: string } | null;
}

interface LancamentoForm {
  description: string;
  value: string;
  payment_type: "receita" | "despesa";
  category: string;
  due_date: string;
  paid_date: string;
  status: string;
  project_id: string;
  repeat: string;
}

const emptyForm = (): LancamentoForm => ({
  description: "",
  value: "",
  payment_type: "receita",
  category: "",
  due_date: "",
  paid_date: "",
  status: "pendente",
  project_id: "",
  repeat: "1",
});

function shiftMonths(dateStr: string, months: number): string {
  return format(addMonths(parseISO(dateStr), months), "yyyy-MM-dd");
}

export default function Lancamentos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LancamentoForm>(emptyForm());

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-lancamentos"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      return (data ?? []) as Project[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const datePrefix = filterYear === "all" ? null : filterMonth === "all" ? filterYear : `${filterYear}-${filterMonth}`;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["lancamentos-escritorio", filterType, filterStatus, filterYear, filterMonth],
    queryFn: async () => {
      let q = supabase
        .from("payments")
        .select("id, description, value, payment_type, status, due_date, paid_date, supplier_name, project_id, projects(name)")
        .eq("source", "escritorio")
        .order("due_date", { ascending: false });

      if (filterType !== "all") q = q.eq("payment_type", filterType);
      if (filterStatus !== "all") q = q.eq("status", filterStatus as any);
      // Considera o mês do vencimento OU do pagamento: lançamento pago sem
      // vencimento preenchido sumia da lista mas aparecia no gráfico do
      // dashboard (que agrega por paid_date).
      if (datePrefix) q = q.or(`due_date.like.${datePrefix}%,paid_date.like.${datePrefix}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Lancamento[];
    },
    enabled: !!user,
  });

  const totalReceitas = items.filter(i => i.payment_type === "receita" && i.status === "pago").reduce((s, i) => s + i.value, 0);
  const totalDespesas = items.filter(i => i.payment_type === "despesa" && i.status === "pago").reduce((s, i) => s + i.value, 0);
  const totalPendReceita = items.filter(i => i.payment_type === "receita" && i.status !== "pago" && i.status !== "cancelado").reduce((s, i) => s + i.value, 0);
  const totalPendDespesa = items.filter(i => i.payment_type === "despesa" && i.status !== "pago" && i.status !== "cancelado").reduce((s, i) => s + i.value, 0);

  const create = useMutation({
    mutationFn: async (data: Omit<LancamentoForm, "value"> & { value: number }) => {
      const repeatCount = Math.min(Math.max(parseInt(data.repeat) || 1, 1), 60);
      // Sem vencimento informado, herda a data de pagamento — evita o
      // lançamento sumir da listagem mensal (que filtra por data).
      const baseDue = data.due_date || data.paid_date || null;
      const description = `${data.category ? `[${data.category}] ` : ""}${data.description}`.trim() || null;
      const supplierName = data.payment_type === "despesa" ? (data.description || data.category || "Despesa") : "Receita Escritório";

      const rows = Array.from({ length: repeatCount }, (_, i) => ({
        user_id: user!.id,
        project_id: data.project_id || null,
        source: "escritorio",
        payment_type: data.payment_type,
        description: repeatCount > 1 && description ? `${description} (${i + 1}/${repeatCount})` : description,
        supplier_name: supplierName,
        value: data.value,
        due_date: baseDue ? shiftMonths(baseDue, i) : null,
        // Só a 1ª ocorrência carrega pagamento/status informado;
        // as futuras entram como pendentes.
        paid_date: i === 0 ? data.paid_date || null : null,
        status: i === 0 ? data.status : "pendente",
        installment_number: repeatCount > 1 ? i + 1 : null,
        total_installments: repeatCount > 1 ? repeatCount : null,
      }));

      const { error } = await supabase.from("payments").insert(rows as never);
      if (error) throw error;
      return repeatCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos-escritorio"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-metrics"] });
      toast({ title: count > 1 ? `${count} lançamentos criados (repetição mensal)` : "Lançamento adicionado" });
      setFormOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<LancamentoForm, "value"> & { value: number } }) => {
      const { error } = await supabase.from("payments").update({
        project_id: data.project_id || null,
        payment_type: data.payment_type,
        description: `${data.category ? `[${data.category}] ` : ""}${data.description}`.trim() || null,
        supplier_name: data.payment_type === "despesa" ? (data.description || data.category || "Despesa") : "Receita Escritório",
        value: data.value,
        due_date: data.due_date || data.paid_date || null,
        paid_date: data.paid_date || null,
        status: data.status,
      } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos-escritorio"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-metrics"] });
      toast({ title: "Lançamento atualizado" });
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos-escritorio"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-metrics"] });
      toast({ title: "Lançamento removido" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(form.value);
    if (!v || v <= 0) return;
    const payload = { ...form, value: v };
    if (editingId) {
      update.mutate({ id: editingId, data: payload });
    } else {
      create.mutate(payload);
    }
  };

  const openEdit = (item: Lancamento) => {
    const desc = item.description?.replace(/^\[.*?\]\s*/, "") ?? "";
    const categoryMatch = item.description?.match(/^\[(.*?)\]/);
    setForm({
      description: desc,
      value: String(item.value),
      payment_type: (item.payment_type as "receita" | "despesa") || "receita",
      category: categoryMatch?.[1] ?? "",
      due_date: item.due_date ?? "",
      paid_date: item.paid_date ?? "",
      status: item.status ?? "pendente",
      project_id: item.project_id ?? "",
      repeat: "1",
    });
    setEditingId(item.id);
    setFormOpen(true);
  };

  const categories = form.payment_type === "receita" ? CATEGORIES_RECEITA : CATEGORIES_DESPESA;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Lançamentos do Escritório</h1>
          <p className="text-sm text-muted-foreground">Receitas e despesas do escritório, com ou sem projeto vinculado</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditingId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Lançamento
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Receitas recebidas</p>
          <p className="text-xl font-bold text-success">{fmt(totalReceitas)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Despesas pagas</p>
          <p className="text-xl font-bold text-destructive">{fmt(totalDespesas)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">A receber</p>
          <p className="text-xl font-bold">{fmt(totalPendReceita)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">A pagar</p>
          <p className="text-xl font-bold">{fmt(totalPendDespesa)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); if (v === "all") setFilterMonth("all"); }}>
          <SelectTrigger className="h-9 w-[100px]"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos anos</SelectItem>
            {FIN_YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMonth} onValueChange={setFilterMonth} disabled={filterYear === "all"}>
          <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos meses</SelectItem>
            {FIN_MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago/Recebido</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="overflow-auto rounded-lg border min-h-[calc(100vh-26rem)]">
        {isLoading ? (
          <PageSkeleton variant="table" rows={8} className="p-0 [&>div]:shadow-none [&>div]:rounded-none" />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <p>Nenhum lançamento encontrado.</p>
            <Button variant="link" onClick={() => { setForm(emptyForm()); setEditingId(null); setFormOpen(true); }}>
              Adicionar primeiro lançamento →
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Recebido/Pago</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.description || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.projects?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {item.payment_type === "receita" ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                        <TrendingUp className="h-3 w-3" /> Receita
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                        <TrendingDown className="h-3 w-3" /> Despesa
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fmt(item.value)}</TableCell>
                  <TableCell>{formatDate(item.due_date)}</TableCell>
                  <TableCell>{formatDate(item.paid_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      item.status === "pago" ? "bg-success/10 text-success border-success/30" :
                      item.status === "atrasado" ? "bg-destructive/10 text-destructive border-destructive/30" :
                      item.status === "cancelado" ? "bg-muted text-muted-foreground" :
                      "bg-warning/10 text-warning-ink border-warning/30"
                    }>
                      {item.status === "pago" ? "Pago/Recebido" :
                       item.status === "atrasado" ? "Atrasado" :
                       item.status === "cancelado" ? "Cancelado" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) { setEditingId(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.payment_type} onValueChange={(v) => setForm(f => ({ ...f, payment_type: v as "receita" | "despesa", category: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita (entrada)</SelectItem>
                    <SelectItem value="despesa">Despesa (saída)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Aluguel sala — Julho" />
            </div>
            <div>
              <Label>Projeto (opcional)</Label>
              <Select value={form.project_id || "none"} onValueChange={(v) => setForm(f => ({ ...f, project_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">{form.payment_type === "receita" ? "Recebido" : "Pago"}</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <Label>{form.payment_type === "receita" ? "Data recebimento" : "Data pagamento"}</Label>
                <Input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
              </div>
            </div>
            {!editingId && (
              <div>
                <Label>
                  Repetir (nº de meses)
                  <span className="ml-1 text-[11px] text-muted-foreground font-normal">
                    — gera um lançamento por mês; os futuros ficam pendentes
                  </span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={form.repeat}
                  onChange={e => setForm(f => ({ ...f, repeat: e.target.value }))}
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {editingId ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
