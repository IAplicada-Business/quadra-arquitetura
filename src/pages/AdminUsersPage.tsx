import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Shield, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PAGE_GROUPS } from "@/lib/pagePermissions";
import { Switch } from "@/components/ui/switch";
import { PageTitle } from "@/components/layout/PageTitle";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

type PermMap = Record<string, { can_view: boolean; can_edit: boolean }>;

const roleLabels: Record<string, string> = { admin: "Administrador", moderator: "Moderador", user: "Usuário" };

export default function AdminUsersPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Criar usuário
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "user" });
  // Acesso por tela definido já na criação (pedido da Mariana: "ao criar
  // um usuário, dar acesso aos menus e telas que esse usuário vai ter")
  const [restrictAccess, setRestrictAccess] = useState(false);
  const [createPerms, setCreatePerms] = useState<PermMap>({});

  // Permissões
  const [permUser, setPermUser] = useState<UserRow | null>(null);
  const [permissions, setPermissions] = useState<PermMap>({});
  const [permLoading, setPermLoading] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  // Editar nome/função
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "user" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Excluir
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, created_at");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    if (!profiles) { setLoading(false); return; }
    const roleMap: Record<string, string> = {};
    roles?.forEach((r: any) => { roleMap[r.user_id] = r.role; });
    setUsers(profiles.map((p: any) => ({
      id: p.user_id, email: "",
      full_name: p.full_name || "",
      role: roleMap[p.user_id] || "user",
      created_at: p.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchPermissions = async (userId: string) => {
    setPermLoading(true);
    const { data } = await supabase.from("user_permissions").select("page_key, can_view, can_edit").eq("user_id", userId);
    const map: PermMap = {};
    data?.forEach((p: any) => { map[p.page_key] = { can_view: p.can_view, can_edit: p.can_edit }; });
    setPermissions(map);
    setPermLoading(false);
  };

  const openPermissions = (u: UserRow) => {
    setPermUser(u);
    fetchPermissions(u.id);
  };

  const togglePerm = (pageKey: string, field: "can_view" | "can_edit") => {
    setPermissions((prev) => {
      const current = prev[pageKey] || { can_view: false, can_edit: false };
      const updated = { ...current, [field]: !current[field] };
      if (field === "can_edit" && updated.can_edit) updated.can_view = true;
      if (field === "can_view" && !updated.can_view) updated.can_edit = false;
      return { ...prev, [pageKey]: updated };
    });
  };

  const savePermissions = async () => {
    if (!permUser) return;
    setSavingPerms(true);
    await supabase.from("user_permissions").delete().eq("user_id", permUser.id);
    const rows = Object.entries(permissions)
      .filter(([, v]) => v.can_view || v.can_edit)
      .map(([key, v]) => ({ user_id: permUser.id, page_key: key, can_view: v.can_view, can_edit: v.can_edit }));
    if (rows.length > 0) {
      const { error } = await supabase.from("user_permissions").insert(rows);
      if (error) { toast.error("Erro ao salvar permissões"); setSavingPerms(false); return; }
    }
    toast.success("Permissões salvas");
    setSavingPerms(false);
    setPermUser(null);
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({ full_name: u.full_name, role: u.role });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    await supabase.from("profiles").update({ full_name: editForm.full_name }).eq("user_id", editUser.id);
    await supabase.from("user_roles").update({ role: editForm.role as any }).eq("user_id", editUser.id);
    toast.success("Usuário atualizado");
    setSavingEdit(false);
    setEditUser(null);
    fetchUsers();
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: deleteUser.id },
    });
    let errorMessage: string | null = null;
    if (error) {
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        try { const body = await ctx.json(); errorMessage = body?.error || null; } catch {}
      }
      errorMessage = errorMessage || error.message || "Erro ao remover usuário";
    } else if (data?.error) {
      errorMessage = data.error;
    }
    if (errorMessage) {
      toast.error(errorMessage);
      setDeleting(false);
      return;
    }
    toast.success("Usuário removido");
    setDeleting(false);
    setDeleteUser(null);
    fetchUsers();
  };

  const toggleCreatePerm = (pageKey: string, field: "can_view" | "can_edit") => {
    setCreatePerms((prev) => {
      const current = prev[pageKey] || { can_view: false, can_edit: false };
      const updated = { ...current, [field]: !current[field] };
      if (field === "can_edit" && updated.can_edit) updated.can_view = true;
      if (field === "can_view" && !updated.can_view) updated.can_edit = false;
      return { ...prev, [pageKey]: updated };
    });
  };

  const createUser = async () => {
    if (!form.email || !form.password || !form.full_name) { toast.error("Preencha todos os campos"); return; }
    if (restrictAccess && form.role !== "admin") {
      const anyView = Object.values(createPerms).some(v => v.can_view || v.can_edit);
      if (!anyView) { toast.error("Selecione ao menos uma tela ou desative o acesso restrito"); return; }
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-user", { body: form });
    let errorMessage: string | null = null;
    if (error) {
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        try { const body = await ctx.json(); errorMessage = body?.error || null; } catch {}
      }
      errorMessage = errorMessage || error.message || "Erro ao criar usuário";
    } else if (data?.error) {
      errorMessage = data.error;
    }
    if (errorMessage) {
      if (/already been registered|email_exists|already registered/i.test(errorMessage))
        errorMessage = "Já existe um usuário cadastrado com este e-mail";
      toast.error(errorMessage);
      setCreating(false);
      return;
    }
    // Grava as permissões por tela escolhidas na criação
    const newUserId: string | undefined = data?.user?.id;
    if (newUserId && restrictAccess && form.role !== "admin") {
      await supabase.from("user_permissions").delete().eq("user_id", newUserId);
      const rows = Object.entries(createPerms)
        .filter(([, v]) => v.can_view || v.can_edit)
        .map(([key, v]) => ({ user_id: newUserId, page_key: key, can_view: v.can_view, can_edit: v.can_edit }));
      if (rows.length > 0) {
        const { error: permError } = await supabase.from("user_permissions").insert(rows);
        if (permError) {
          toast.error("Usuário criado, mas houve erro ao salvar as permissões: " + permError.message);
        }
      }
    }
    if (data?.repaired) {
      toast.success("Usuário já existia — acesso reparado (função e equipe configuradas)");
    } else {
      toast.success(restrictAccess && form.role !== "admin" ? "Usuário criado com acesso restrito às telas selecionadas" : "Usuário criado");
    }
    setCreateOpen(false);
    setForm({ email: "", password: "", full_name: "", role: "user" });
    setRestrictAccess(false);
    setCreatePerms({});
    setCreating(false);
    fetchUsers();
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      moderator: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      user: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    return <Badge className={`text-xs ${colors[role] || ""}`}>{roleLabels[role] || role}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageTitle title="Gestão de Usuários" description="Edite dados, função e permissões de acesso por tela" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Criar Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openPermissions(u)}>
                          <Shield className="h-3.5 w-3.5 mr-1" /> Permissões
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteUser(u)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Criar Usuário */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setRestrictAccess(false); setCreatePerms({}); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Criar Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome Completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Senha</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <Label>Função</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role !== "admin" && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="restrict-access" className="cursor-pointer">Restringir acesso por tela</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {restrictAccess
                        ? "O usuário verá apenas os menus e telas marcados abaixo."
                        : "Desligado: o usuário terá acesso a todas as telas."}
                    </p>
                  </div>
                  <Switch id="restrict-access" checked={restrictAccess} onCheckedChange={setRestrictAccess} />
                </div>

                {restrictAccess && (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {PAGE_GROUPS.map((group) => (
                      <div key={group.group}>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{group.group}</h4>
                        <div className="border rounded-md overflow-hidden">
                          {group.pages.map((page, idx) => {
                            const perm = createPerms[page.key] || { can_view: false, can_edit: false };
                            return (
                              <div key={page.key} className={`flex items-center justify-between py-1.5 px-2.5 ${idx % 2 === 0 ? "bg-muted/30" : ""}`}>
                                <span className="text-xs">{page.label}</span>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                                    <Checkbox checked={perm.can_view} onCheckedChange={() => toggleCreatePerm(page.key, "can_view")} />
                                    Ver
                                  </label>
                                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                                    <Checkbox checked={perm.can_edit} onCheckedChange={() => toggleCreatePerm(page.key, "can_edit")} />
                                    Editar
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createUser} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Usuário */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome Completo</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
            <div>
              <Label>Função</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Permissões */}
      <Dialog open={!!permUser} onOpenChange={(o) => { if (!o) setPermUser(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permissões — {permUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          {permUser?.role === "admin" ? (
            <p className="text-muted-foreground text-sm py-4">Administradores possuem acesso total ao sistema.</p>
          ) : permLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {PAGE_GROUPS.map((group) => (
                <div key={group.group}>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group.group}</h4>
                  <div className="space-y-1 border rounded-md overflow-hidden">
                    {group.pages.map((page, idx) => {
                      const perm = permissions[page.key] || { can_view: false, can_edit: false };
                      return (
                        <div key={page.key} className={`flex items-center justify-between py-2 px-3 ${idx % 2 === 0 ? "bg-muted/30" : ""}`}>
                          <span className="text-sm">{page.label}</span>
                          <div className="flex items-center gap-5">
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <Checkbox checked={perm.can_view} onCheckedChange={() => togglePerm(page.key, "can_view")} />
                              Ver
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <Checkbox checked={perm.can_edit} onCheckedChange={() => togglePerm(page.key, "can_edit")} />
                              Editar
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermUser(null)}>Fechar</Button>
            {permUser?.role !== "admin" && (
              <Button onClick={savePermissions} disabled={savingPerms}>
                {savingPerms && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar Permissões
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Excluir */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá <strong>{deleteUser?.full_name}</strong> do sistema. A conta de autenticação permanece, mas o acesso à plataforma será revogado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
