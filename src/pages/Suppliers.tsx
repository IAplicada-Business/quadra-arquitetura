import { useState } from "react";
import { Plus, Pencil, Trash2, Users, Phone, Truck, FileText, Mail, Search, List, LayoutGrid } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageSkeleton } from "@/components/visual/PageSkeleton";
import { ShowMoreButton, useShowMore } from "@/components/visual/ShowMore";
import { SupplierDetailSheet } from "@/components/construction/SupplierDetailSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { handleDeleteError } from "@/lib/handleDeleteError";

const CATEGORIES = [
  "Pedreiro", "Eletricista", "Encanador", "Marcenaria", "Pintura", "Vidraceiro", "Serralheria", "Marmoraria", "Gesso", "Outros"
];

const SUPPLIERS_LIMIT = 6;

type SupplierView = "tabela" | "cards";
const VIEW_KEY = "suppliers_view";

function readSavedView(): SupplierView {
  try {
    return localStorage.getItem(VIEW_KEY) === "cards" ? "cards" : "tabela";
  } catch {
    return "tabela";
  }
}

function Stars({ rating }: { rating?: number | null }) {
  if (!rating) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-sm leading-none ${i < rating ? "text-yellow-400" : "text-muted-foreground/25"}`}>★</span>
      ))}
    </span>
  );
}

function SupplierActions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Suppliers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchTerm, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [view, setView] = useState<SupplierView>(readSavedView);
  const changeView = (v: SupplierView) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* sem storage: só não lembra */ }
  };

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("suppliers").insert({ ...data, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setFormOpen(false);
      toast({ title: "Fornecedor criado" });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from("suppliers").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setFormOpen(false);
      toast({ title: "Fornecedor atualizado" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Fornecedor removido" });
    },
    onError: (error: any) => handleDeleteError(error, "suppliers"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData);
    
    if (editing) {
      update.mutate({ id: editing.id, ...data });
    } else {
      create.mutate(data);
    }
  };

  const filtered = suppliers.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.contact?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // No máximo SUPPLIERS_LIMIT na tela; "Ver todos" abre o resto.
  const more = useShowMore(filtered, SUPPLIERS_LIMIT, `${searchTerm}|${categoryFilter}`);

  return (
    <div className="space-y-6 p-0 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-playfair">Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestão de parceiros e prestadores de serviço</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Fornecedor
        </Button>
      </div>

      {/* Filtros no padrão das outras abas + alternância de visualização. */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor ou contato..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && changeView(v as SupplierView)}
              variant="outline"
              className="justify-start"
              aria-label="Visualização"
            >
              <ToggleGroupItem value="tabela" aria-label="Tabela" title="Tabela"><List className="h-4 w-4" /></ToggleGroupItem>
              <ToggleGroupItem value="cards" aria-label="Cards" title="Cards"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <PageSkeleton variant={view === "tabela" ? "table" : "cards"} rows={SUPPLIERS_LIMIT} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          {suppliers.length === 0 ? "Nenhum fornecedor cadastrado." : "Nenhum fornecedor para os filtros aplicados."}
        </div>
      ) : view === "tabela" ? (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                  <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
                  <TableHead className="hidden md:table-cell">Avaliação</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {more.visible.map(s => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setSelectedSupplier(s)}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell><Badge variant="secondary">{s.category || "—"}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{s.contact || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground whitespace-nowrap">{s.phone || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{s.payment_conditions || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell"><Stars rating={s.rating} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <SupplierActions onEdit={() => { setEditing(s); setFormOpen(true); }} onRemove={() => remove.mutate(s.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ShowMoreButton expanded={more.expanded} hasMore={more.hasMore} total={filtered.length} onToggle={more.toggle} noun="fornecedores" />
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {more.visible.map(s => (
              <Card
                key={s.id}
                className="card-interactive cursor-pointer"
                onClick={() => setSelectedSupplier(s)}
              >
                {/* Card horizontal: identidade à esquerda, contato no meio, ações à direita. */}
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                  <div className="flex items-center gap-3 min-w-0 sm:w-[34%]">
                    <div className="icon-chip h-10 w-10 shrink-0"><Truck className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.name}</p>
                      <Badge variant="secondary" className="mt-0.5">{s.category || "—"}</Badge>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {s.contact && <span className="flex items-center gap-1.5 truncate"><Users className="h-3.5 w-3.5 shrink-0" /> {s.contact}</span>}
                    {s.phone && <span className="flex items-center gap-1.5 truncate"><Phone className="h-3.5 w-3.5 shrink-0" /> {s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1.5 truncate"><Mail className="h-3.5 w-3.5 shrink-0" /> {s.email}</span>}
                    {s.payment_conditions && <span className="flex items-center gap-1.5 truncate"><FileText className="h-3.5 w-3.5 shrink-0" /> Pgto: {s.payment_conditions}</span>}
                    {s.rating ? <Stars rating={s.rating} /> : null}
                  </div>
                  <div className="shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                    <SupplierActions onEdit={() => { setEditing(s); setFormOpen(true); }} onRemove={() => remove.mutate(s.id)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ShowMoreButton expanded={more.expanded} hasMore={more.hasMore} total={filtered.length} onToggle={more.toggle} noun="fornecedores" />
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label>Nome da Empresa/Profissional</Label>
              <Input name="name" defaultValue={editing?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select name="category" defaultValue={editing?.category || "Outros"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Contato Principal</Label>
                <Input name="contact" defaultValue={editing?.contact} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input name="phone" defaultValue={editing?.phone} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input name="email" defaultValue={editing?.email} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Chave Pix / Dados Bancários</Label>
              <Input name="pix_key" defaultValue={editing?.pix_key} />
            </div>
            <div className="grid gap-2">
              <Label>Condições de Pagamento Padrão</Label>
              <Input name="payment_conditions" defaultValue={editing?.payment_conditions} placeholder="Ex: 50% entrada + 50% entrega" />
            </div>
            <div className="grid gap-2">
              <Label>Avaliação (1-5)</Label>
              <Input type="number" min="1" max="5" name="rating" defaultValue={editing?.rating} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SupplierDetailSheet
        supplier={selectedSupplier}
        open={!!selectedSupplier}
        onOpenChange={(v) => { if (!v) setSelectedSupplier(null); }}
      />
    </div>
  );
}
