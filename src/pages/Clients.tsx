import { useState, useEffect } from "react";
import { ShowMoreButton, useShowMore } from "@/components/visual/ShowMore";
import { subMonths, startOfMonth, startOfYear } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ClientProject {
  id: string;
  project_number: string | null;
  name: string;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phone_secondary: string | null;
  cpf_cnpj: string | null;
  client_type: string;
  origin: string;
  observations: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  created_at: string;
  source_lead_id: string | null;
  converted_at: string | null;
  projects?: ClientProject[];
}

const clientTypes = [
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "saude", label: "Saúde" },
  { value: "outro", label: "Outro" },
];

const clientOrigins = [
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  phone_secondary: "",
  cpf_cnpj: "",
  client_type: "residencial",
  origin: "outro",
  observations: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_neighborhood: "",
  address_city: "",
  address_state: "",
  address_zip: "",
};

const CLIENTS_LIMIT = 5;

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    // Fetch clients
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (clientsError) {
      toast.error("Erro ao carregar clientes");
      return;
    }

    // Fetch projects linked to clients
    const clientIds = (clientsData || []).map((c: any) => c.id);
    let projectsByClient: Record<string, ClientProject[]> = {};
    if (clientIds.length > 0) {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, project_number, name, client_id")
        .in("client_id", clientIds);
      if (projectsData) {
        for (const p of projectsData) {
          const cid = (p as any).client_id;
          if (!projectsByClient[cid]) projectsByClient[cid] = [];
          projectsByClient[cid].push({ id: p.id, project_number: p.project_number, name: p.name });
        }
      }
    }

    setClients(
      (clientsData || []).map((c: any) => ({
        ...c,
        projects: projectsByClient[c.id] || [],
      }))
    );
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!user?.id) return;
    setLoading(true);

    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      phone_secondary: form.phone_secondary || null,
      cpf_cnpj: form.cpf_cnpj || null,
      client_type: form.client_type as "residencial" | "comercial" | "saude" | "outro",
      origin: form.origin as "indicacao" | "instagram" | "google" | "site" | "outro",
      observations: form.observations || null,
      address_street: form.address_street || null,
      address_number: form.address_number || null,
      address_complement: form.address_complement || null,
      address_neighborhood: form.address_neighborhood || null,
      address_city: form.address_city || null,
      address_state: form.address_state || null,
      address_zip: form.address_zip || null,
      user_id: user.id,
    };

    if (editingId) {
      const { error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", editingId);
      if (error) toast.error("Erro ao atualizar cliente");
      else toast.success("Cliente atualizado!");
    } else {
      const { error } = await supabase.from("clients").insert([payload]);
      if (error) toast.error("Erro ao criar cliente");
      else toast.success("Cliente criado!");
    }

    setLoading(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchClients();
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      phone_secondary: client.phone_secondary || "",
      cpf_cnpj: client.cpf_cnpj || "",
      client_type: client.client_type,
      origin: client.origin,
      observations: client.observations || "",
      address_street: client.address_street || "",
      address_number: client.address_number || "",
      address_complement: client.address_complement || "",
      address_neighborhood: client.address_neighborhood || "",
      address_city: client.address_city || "",
      address_state: client.address_state || "",
      address_zip: client.address_zip || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir cliente");
    else {
      toast.success("Cliente excluído");
      fetchClients();
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === "all" || c.client_type === filterType;
    let matchesPeriod = true;
    if (filterPeriod !== "all") {
      const d = new Date(c.created_at);
      const now = new Date();
      if (filterPeriod === "este_mes") matchesPeriod = d >= startOfMonth(now);
      else if (filterPeriod === "ultimo_mes") matchesPeriod = d >= startOfMonth(subMonths(now, 1)) && d < startOfMonth(now);
      else if (filterPeriod === "3_meses") matchesPeriod = d >= subMonths(now, 3);
      else if (filterPeriod === "este_ano") matchesPeriod = d >= startOfYear(now);
    }
    return matchesSearch && matchesType && matchesPeriod;
  });

  // No máximo 5 na tela; "Ver todos" abre o resto. Volta ao curto ao filtrar.
  const more = useShowMore(filtered, CLIENTS_LIMIT, `${search}|${filterType}|${filterPeriod}`);

  const typeLabel = (val: string) =>
    clientTypes.find((t) => t.value === val)?.label ?? val;
  const originLabel = (val: string) =>
    clientOrigins.find((o) => o.value === val)?.label ?? val;

  return (
    <div className="space-y-6 p-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-playfair">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie a carteira de clientes do escritório</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingId ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={form.cpf_cnpj}
                    onChange={(e) =>
                      setForm({ ...form, cpf_cnpj: e.target.value })
                    }
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone Secundário</Label>
                  <Input
                    value={form.phone_secondary}
                    onChange={(e) =>
                      setForm({ ...form, phone_secondary: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.client_type}
                    onValueChange={(v) => setForm({ ...form, client_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clientTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select
                    value={form.origin}
                    onValueChange={(v) => setForm({ ...form, origin: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clientOrigins.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-md border p-3 space-y-2 bg-muted/20">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Endereço</Label>
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <Input placeholder="Logradouro" value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
                  <Input placeholder="Número" value={form.address_number} onChange={(e) => setForm({ ...form, address_number: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Complemento" value={form.address_complement} onChange={(e) => setForm({ ...form, address_complement: e.target.value })} />
                  <Input placeholder="Bairro" value={form.address_neighborhood} onChange={(e) => setForm({ ...form, address_neighborhood: e.target.value })} />
                </div>
                <div className="grid grid-cols-[1fr_80px_140px] gap-2">
                  <Input placeholder="Cidade" value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
                  <Input placeholder="UF" maxLength={2} value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value.toUpperCase() })} />
                  <Input placeholder="CEP" value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.observations}
                  onChange={(e) =>
                    setForm({ ...form, observations: e.target.value })
                  }
                  placeholder="Informações adicionais sobre o cliente"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading
                    ? "Salvando..."
                    : editingId
                    ? "Atualizar"
                    : "Criar Cliente"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {clientTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="este_mes">Este mês</SelectItem>
                <SelectItem value="ultimo_mes">Mês passado</SelectItem>
                <SelectItem value="3_meses">Últimos 3 meses</SelectItem>
                <SelectItem value="este_ano">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-muted/30">
          <div className="p-4 rounded-full bg-secondary mb-4">
            <Users className="h-8 w-8 text-accent-ink" />
          </div>
          <h3 className="text-lg font-display font-semibold mb-1">
            Nenhum cliente encontrado
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {clients.length === 0
              ? "Comece cadastrando seu primeiro cliente"
              : "Nenhum resultado para os filtros aplicados"}
          </p>
          {clients.length === 0 && (
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                  <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                  <TableHead className="hidden lg:table-cell">Origem</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {more.visible.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        {client.name}
                        {client.projects && client.projects.length > 0 &&
                          client.projects.map((p) =>
                            p.project_number ? (
                              <Badge
                                key={p.id}
                                className="cursor-pointer text-xs"
                                onClick={() => navigate(`/projects/${p.id}`)}
                              >
                                {p.project_number}
                              </Badge>
                            ) : null
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {client.email || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {client.phone || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                        {typeLabel(client.client_type)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {originLabel(client.origin)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(client)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(client.id)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ShowMoreButton
            expanded={more.expanded}
            hasMore={more.hasMore}
            total={filtered.length}
            onToggle={more.toggle}
            noun="clientes"
          />
        </Card>
      )}
    </div>
  );
}