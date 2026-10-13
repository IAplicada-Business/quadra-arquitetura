import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Eye, Pencil, Trash2, TrendingUp, Video, Calendar, BarChart3, Search, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, getDaysInMonth } from "date-fns";
import { useContentPosts, TYPE_COLORS, STATUS_LABELS } from "@/hooks/useContentPosts";
import { useContentSeries } from "@/hooks/useContentSeries";
import ContentPostSheet from "@/components/content/ContentPostSheet";
import type { ContentPost } from "@/hooks/useContentPosts";
import { PageTitle } from "@/components/layout/PageTitle";

export default function ContentPosts() {
  const { posts, create, update, remove } = useContentPosts();
  const { series } = useContentSeries();
  const seriesMap = Object.fromEntries(series.map((s) => [s.id, s]));

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
  const today = format(now, "yyyy-MM-dd");
  const daysInMonth = getDaysInMonth(now);

  // KPIs
  const publishedThisMonth = posts.filter((p) => p.status === "publicado" && p.scheduled_date && p.scheduled_date >= monthStart && p.scheduled_date <= monthEnd).length;
  const inProduction = posts.filter((p) => ["roteiro", "gravando", "editando"].includes(p.status)).length;
  const nextToPublish = posts.find((p) => p.status === "agendado" && p.scheduled_date && p.scheduled_date >= today);
  const daysWithContent = new Set(posts.filter((p) => p.scheduled_date && p.scheduled_date >= monthStart && p.scheduled_date <= monthEnd).map((p) => p.scheduled_date)).size;
  const fillPercent = Math.round((daysWithContent / daysInMonth) * 100);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      return true;
    });
  }, [posts, search, statusFilter, typeFilter, platformFilter]);

  const handleEdit = (post: ContentPost) => {
    setSelectedPost(post);
    setReadOnly(false);
    setSheetOpen(true);
  };

  const handleView = (post: ContentPost) => {
    setSelectedPost(post);
    setReadOnly(true);
    setSheetOpen(true);
  };

  const handleDuplicate = (post: ContentPost) => {
    create.mutate({ ...post, id: undefined as any, status: "ideia", scheduled_date: null, title: `${post.title} (cópia)` });
  };

  const handleSave = (values: any) => {
    if (values.id) {
      update.mutate(values);
    } else {
      create.mutate(values);
    }
  };

  // Vídeo 15a (Mariana): "isso aqui continua sem funcionar a parte de
  // post". A tela só permitia editar posts existentes — não tinha
  // botão para criar um novo direto aqui. O usuário tinha que ir no
  // calendário ou nos roteiros. Botão "Novo Post" adicionado abaixo.
  const handleNew = () => {
    setSelectedPost(null);
    setReadOnly(false);
    setSheetOpen(true);
  };

  const isOverdue = (p: ContentPost) => p.scheduled_date && p.scheduled_date < today && p.status !== "publicado";

  return (
    <div className="space-y-6 p-0">
      <div className="flex items-center justify-between">
        <PageTitle title="Publicações" description="Visão geral de todos os conteúdos" />
        <Button size="sm" onClick={handleNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Post
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{publishedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Publicados este mês</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProduction}</p>
              <p className="text-xs text-muted-foreground">Em produção</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium truncate">{nextToPublish?.title || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {nextToPublish?.scheduled_date ? format(new Date(nextToPublish.scheduled_date + "T12:00:00"), "dd/MM") : "Nenhum agendado"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{fillPercent}%</p>
              <p className="text-xs text-muted-foreground">Calendário preenchido</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="reels">Reels</SelectItem>
            <SelectItem value="carrossel">Carrossel</SelectItem>
            <SelectItem value="story">Story</SelectItem>
            <SelectItem value="feed">Feed</SelectItem>
            <SelectItem value="live">Live</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Plataforma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Plataforma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead className="hidden lg:table-cell">Série</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum post encontrado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((post) => (
              <TableRow key={post.id} className={isOverdue(post) ? "bg-destructive/5" : ""}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell>
                  <Badge className="text-[10px] text-white" style={{ background: TYPE_COLORS[post.type] || "#666" }}>
                    {post.type}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell capitalize">{post.platform}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{STATUS_LABELS[post.status] || post.status}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {post.scheduled_date ? format(new Date(post.scheduled_date + "T12:00:00"), "dd/MM/yy") : "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {post.series_id && seriesMap[post.series_id] ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: seriesMap[post.series_id].color }} />
                      {seriesMap[post.series_id].name}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(post)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDuplicate(post)} title="Duplicar">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleView(post)} title="Ver roteiro">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(post.id)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ContentPostSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        post={selectedPost}
        series={series}
        onSave={handleSave}
        readOnly={readOnly}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { remove.mutate(deleteId); setDeleteId(null); } }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
