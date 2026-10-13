/**
 * Buddy · Bug — Banco de Oportunidades da IAplicada.
 *
 * Portado do pacote padrão (Nexus LCR Core). O que mudou pra rodar aqui,
 * e só isso:
 *  - TanStack Router → React Router: virou página normal em /buddy/bug, com
 *    as abas/visões no querystring via useSearchParams.
 *  - @dnd-kit → drag-and-drop nativo do HTML5, que é como os outros kanbans
 *    deste sistema (LeadsPipeline, PartnersPipeline) já funcionam. Evita uma
 *    terceira biblioteca de DnD no bundle.
 *  - PageHeader/SubAbas do app-shell de origem → cabeçalho e Tabs do shadcn
 *    deste projeto.
 *  - ehAdmin vem de usePermissions() (user_roles), espelhando o is_admin()
 *    do banco. Mover card continua sendo garantido pelo trigger, não por
 *    este if.
 */
import { useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OportunidadesDashboard } from "@/components/oportunidades-dashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/usePermissions";
import {
  listarOportunidades,
  criarOportunidade,
  editarOportunidade,
  excluirOportunidade,
  mudarStatusOportunidade,
  mudarPrioridadeOportunidade,
  votarOportunidade,
  comentariosOportunidade,
  comentarOportunidade,
  podeVerComentario,
  concluirOportunidadeComSolucao,
  solucaoValida,
  SOLUCAO_MIN,
  COMENTARIO_TIPO_ORDEM,
  COMENTARIO_TIPO_LABEL,
  COMENTARIO_TIPO_BADGE,
  anexosOportunidade,
  anexarOportunidade,
  excluirAnexoOportunidade,
  urlAnexoOportunidade,
  anexoValido,
  ANEXO_MAX_POR_ENVIO,
  ANEXO_TIPOS_ACEITOS,
  historicoOportunidade,
  aprovarEntregaOportunidade,
  recusarEntregaOportunidade,
  definirDataPrevistaOportunidade,
  motivoRecusaValido,
  MOTIVO_RECUSA_MIN,
  aguardandoAprovacaoCliente,
  buscarSimilares,
  agruparPorStatus,
  ordenarColunaOportunidades,
  proximaOrdemColuna,
  STATUS_ORDEM,
  STATUS_LABEL,
  TIPO_LABEL,
  PRIORIDADE_ORDEM,
  PRIORIDADE_LABEL,
  PRIORIDADE_COR,
  IMPACTO_ORDEM,
  IMPACTO_LABEL,
  type Oportunidade,
  type OportStatus,
  type OportTipo,
  type OportImpacto,
  type OportPrioridade,
  type OportOrdemColuna,
  type OportComentarioTipo,
  type OportunidadeAnexo,
} from "@/lib/oportunidades.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  ThumbsUp,
  Kanban,
  List,
  User,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  LayoutDashboard,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ListOrdered,
  X,
  XCircle,
  CalendarClock,
  Search,
  FileDown,
  Paperclip,
  ImageOff,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cn, msgErro } from "@/lib/utils";
import { PageTitle } from "@/components/layout/PageTitle";

type AbaOport = "dashboard" | "kanban";
type ViewBoard = "kanban" | "lista";

/**
 * View fixa do Kanban (Bruno/Mari):
 * abertas — Backlog, Planejado, Em desenvolvimento, Entregue
 * ocultas — Em análise, Descartado
 * A pessoa ainda pode abrir/fechar manualmente; "Restaurar padrão" volta a isso.
 *
 * Backlog assumiu o lugar de Aberto (etapa removida em 17/08) — é onde o card
 * entra hoje. Quem tinha "aberto" salvo perde a coluna no load, que filtra por
 * STATUS_ORDEM.
 */
const KANBAN_EXPANDED_KEY = "quadra.oportunidades.kanban.expanded.v2";
const KANBAN_DEFAULT_EXPANDED: OportStatus[] = ["backlog", "planejado", "em_dev", "entregue"];

function defaultExpanded(): Set<OportStatus> {
  return new Set(KANBAN_DEFAULT_EXPANDED);
}

function loadExpanded(): Set<OportStatus> {
  try {
    const raw = localStorage.getItem(KANBAN_EXPANDED_KEY);
    if (!raw) return defaultExpanded();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr.filter((s): s is OportStatus => STATUS_ORDEM.includes(s as OportStatus)));
  } catch {
    return defaultExpanded();
  }
}

function saveExpanded(set: Set<OportStatus>) {
  try {
    localStorage.setItem(KANBAN_EXPANDED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota / private mode */
  }
}

const fmtStatus = (s: string | null) =>
  s && s in STATUS_LABEL ? STATUS_LABEL[s as OportStatus] : (s ?? "—");

function BadgeAprovacao({ opt }: { opt: Pick<Oportunidade, "status" | "aprovado_autor_em"> }) {
  if (opt.status !== "entregue") return null;
  if (aguardandoAprovacaoCliente(opt)) {
    return (
      <Badge
        variant="outline"
        className="mt-1.5 border-amber-300 bg-amber-50 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
      >
        Aguardando aprovação
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="mt-1.5 border-emerald-300 bg-emerald-50 text-[10px] font-semibold text-emerald-800"
    >
      Aprovado pelo criador
    </Badge>
  );
}

const TIPO_ICON = { bug: Bug, melhoria: Lightbulb, duvida: HelpCircle } as const;
const TIPO_COR = {
  bug: "text-rose-600 bg-rose-50 border-rose-200",
  melhoria: "text-amber-600 bg-amber-50 border-amber-200",
  duvida: "text-blue-600 bg-blue-50 border-blue-200",
} as const;

export default function BuddyBugPage() {
  const qc = useQueryClient();
  const { pathname } = useLocation();
  // Aba/visão no querystring como no original (link compartilhável, volta
  // no histórico). `replace` pra navegar entre abas não encher o back.
  const [searchParams, setSearchParams] = useSearchParams();
  const abaParam = searchParams.get("aba");
  const viewParam = searchParams.get("view");
  const aba: AbaOport = abaParam === "kanban" || abaParam === "dashboard" ? abaParam : "dashboard";
  const view: ViewBoard = viewParam === "lista" || viewParam === "kanban" ? viewParam : "kanban";
  const [sel, setSel] = useState<Oportunidade | null>(null);
  // DnD nativo (mesmo padrão dos outros kanbans do sistema)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OportStatus | null>(null);
  const [buscaTexto, setBuscaTexto] = useState("");
  const [autorFiltro, setAutorFiltro] = useState("all");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<"all" | OportPrioridade>("all");
  const [impactoFiltro, setImpactoFiltro] = useState<"all" | OportImpacto | "sem">("all");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Oportunidade | null>(null);
  const [excluindo, setExcluindo] = useState<Oportunidade | null>(null);

  function setAba(next: AbaOport) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("aba", next);
        return p;
      },
      { replace: true },
    );
  }
  function setView(next: ViewBoard) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("view", next);
        p.set("aba", "kanban");
        return p;
      },
      { replace: true },
    );
  }

  const { data: opts = [] } = useQuery({
    queryKey: ["oportunidades"],
    queryFn: () => listarOportunidades(),
  });

  const { data: meuId } = useQuery({
    queryKey: ["session-user-id"],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.user?.id ?? null,
    staleTime: 60_000,
  });
  // [ADAPTADO — Quadra] Papel vem do mesmo user_roles que alimenta o
  // is_admin() do banco; aqui só decide o que mostrar.
  const { isAdmin: ehAdmin } = usePermissions();
  const podeEditarCard = (o: Pick<Oportunidade, "autor_id">) =>
    ehAdmin || (!!meuId && o.autor_id === meuId);

  const autores = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of opts) {
      if (o.autor_id && o.autor_nome) map.set(o.autor_id, o.autor_nome);
    }
    return [...map.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [opts]);

  const filtrados = useMemo(() => {
    return opts.filter((o) => {
      if (autorFiltro !== "all" && o.autor_id !== autorFiltro) return false;
      if (prioridadeFiltro !== "all" && o.prioridade !== prioridadeFiltro) return false;
      if (impactoFiltro === "sem" && o.impacto != null) return false;
      if (impactoFiltro !== "all" && impactoFiltro !== "sem" && o.impacto !== impactoFiltro) {
        return false;
      }
      if (buscaTexto.trim()) {
        const q = buscaTexto.trim();
        const ql = q.toLowerCase();
        // Busca por número: "12", "0012", "opt-12", "opt-0012"
        const soNumero = /^\d+$/.test(q);
        const optNum = q.match(/^opt[-\s]?(\d+)$/i);
        if (soNumero) {
          if (!o.numero.includes(q.padStart(4, "0"))) return false;
        } else if (optNum) {
          if (!o.numero.includes(optNum[1].padStart(4, "0"))) return false;
        } else {
          // Texto livre: número completo ou título
          if (!o.numero.toLowerCase().includes(ql) && !o.titulo.toLowerCase().includes(ql))
            return false;
        }
      }
      return true;
    });
  }, [opts, autorFiltro, prioridadeFiltro, impactoFiltro, buscaTexto]);

  const filtrosAtivos =
    autorFiltro !== "all" ||
    prioridadeFiltro !== "all" ||
    impactoFiltro !== "all" ||
    buscaTexto.trim() !== "";

  function limparFiltros() {
    setAutorFiltro("all");
    setPrioridadeFiltro("all");
    setImpactoFiltro("all");
    setBuscaTexto("");
  }

  const votar = useMutation({
    mutationFn: (opt: Oportunidade) => votarOportunidade(opt.id, !opt.votei),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oportunidades"] });
      toast.success("Voto registrado.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível votar."),
  });

  const mudarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OportStatus }) =>
      mudarStatusOportunidade(id, status),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["oportunidades"] });
      setSel((atual) =>
        atual && atual.id === vars.id ? { ...atual, status: vars.status } : atual,
      );
      toast.success("Status atualizado.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível alterar o status."),
  });

  const mudarPrioridade = useMutation({
    mutationFn: ({ id, prioridade }: { id: string; prioridade: OportPrioridade }) =>
      mudarPrioridadeOportunidade(id, prioridade),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["oportunidades"] });
      setSel((atual) =>
        atual && atual.id === vars.id ? { ...atual, prioridade: vars.prioridade } : atual,
      );
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível alterar a prioridade."),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => excluirOportunidade(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["oportunidades"] });
      if (sel?.id === id) setSel(null);
      setExcluindo(null);
      toast.success("Card excluído.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir o card."),
  });

  const porStatus = useMemo(() => agruparPorStatus(filtrados), [filtrados]);

  /* DnD nativo (HTML5), como nos outros kanbans do sistema. Só admin arrasta:
     o trigger no banco recusa de qualquer jeito (42501), aqui é só pra não
     oferecer uma ação que vai falhar. */
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverStatus(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  async function handleDrop(e: React.DragEvent, novoStatus: OportStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverStatus(null);
    if (!ehAdmin || !id || !STATUS_ORDEM.includes(novoStatus)) return;
    const o = filtrados.find((x) => x.id === id);
    if (!o || o.status === novoStatus) return;
    try {
      await mudarStatusOportunidade(id, novoStatus);
      qc.invalidateQueries({ queryKey: ["oportunidades"] });
      setSel((atual) => (atual?.id === id ? { ...atual, status: novoStatus } : atual));
    } catch (err) {
      toast.error(msgErro(err, "Erro ao mover card."));
    }
  }

  function exportarExcel() {
    const rows = opts.map((o) => ({
      Número: o.numero,
      Tipo: TIPO_LABEL[o.tipo] ?? o.tipo,
      Título: o.titulo,
      Descrição: o.descricao ?? "",
      Status: STATUS_LABEL[o.status] ?? o.status,
      Prioridade: PRIORIDADE_LABEL[o.prioridade] ?? o.prioridade,
      Impacto: o.impacto ? (IMPACTO_LABEL[o.impacto] ?? o.impacto) : "",
      Autor: o.autor_nome ?? "",
      "Data prevista": o.data_prevista ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Oportunidades");
    XLSX.writeFile(wb, `oportunidades-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${rows.length} oportunidades exportadas.`);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          icon={<Bug />}
          title="Buddy · Bug"
          description="Reporte bug, melhoria ou dúvida. A equipe IAplicada prioriza e entrega — e quem reportou aprova a entrega."
        />
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={exportarExcel} disabled={opts.length === 0}>
            <FileDown className="mr-1 h-4 w-4" /> Exportar Excel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditando(null);
              setDialogAberto(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Reportar
          </Button>
        </div>
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as AbaOport)} className="space-y-5">
        {/* Padrão Visão Geral / Cliente: abas à esquerda, filtros em pill à direita */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5">
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-end justify-end gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar OPT ou descrição…"
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="h-9 w-52 rounded-full border-0 bg-card pl-8 pr-3 text-xs shadow-soft focus-visible:ring-1"
              />
            </div>

            {aba === "kanban" && (
              <div className="inline-flex items-center gap-1 rounded-full bg-card p-1 shadow-soft">
                <Button
                  variant={view === "kanban" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 rounded-full px-3"
                  onClick={() => setView("kanban")}
                >
                  <Kanban className="mr-1 h-3.5 w-3.5" /> Board
                </Button>
                <Button
                  variant={view === "lista" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 rounded-full px-3"
                  onClick={() => setView("lista")}
                >
                  <List className="mr-1 h-3.5 w-3.5" /> Lista
                </Button>
              </div>
            )}

            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Filtros · {filtrados.length} de {opts.length}
              </span>
              <div className="inline-flex flex-wrap items-center rounded-full bg-card p-1 shadow-soft">
                <Select
                  value={prioridadeFiltro}
                  onValueChange={(v) => setPrioridadeFiltro(v as "all" | OportPrioridade)}
                >
                  <SelectTrigger className="h-9 w-[138px] rounded-full border-0 shadow-none px-3 text-xs font-medium focus:ring-0">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas prioridades</SelectItem>
                    {PRIORIDADE_ORDEM.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORIDADE_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="mx-0.5 h-5 w-px bg-border" />
                <Select value={autorFiltro} onValueChange={setAutorFiltro}>
                  <SelectTrigger className="h-9 w-[160px] rounded-full border-0 shadow-none px-3 text-xs font-medium focus:ring-0">
                    <SelectValue placeholder="Quem abriu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as pessoas</SelectItem>
                    {autores.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="mx-0.5 h-5 w-px bg-border" />
                <Select
                  value={impactoFiltro}
                  onValueChange={(v) => setImpactoFiltro(v as "all" | OportImpacto | "sem")}
                >
                  <SelectTrigger className="h-9 w-[140px] rounded-full border-0 shadow-none px-3 text-xs font-medium focus:ring-0">
                    <SelectValue placeholder="Impacto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos impactos</SelectItem>
                    {IMPACTO_ORDEM.map((i) => (
                      <SelectItem key={i} value={i}>
                        {IMPACTO_LABEL[i]}
                      </SelectItem>
                    ))}
                    <SelectItem value="sem">Sem impacto</SelectItem>
                  </SelectContent>
                </Select>
                {filtrosAtivos && (
                  <>
                    <span className="mx-0.5 h-5 w-px bg-border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full px-3 text-xs text-muted-foreground"
                      onClick={limparFiltros}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Limpar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <TabsContent value="dashboard" className="mt-0">
          <OportunidadesDashboard opts={filtrados} onSelect={setSel} />
        </TabsContent>

        <TabsContent value="kanban" className="mt-0 space-y-4">
          {view === "kanban" ? (
            <KanbanGrid
              porStatus={porStatus}
              podeMover={ehAdmin}
              podeEditarCard={podeEditarCard}
              onSelect={setSel}
              onVotar={(o) => votar.mutate(o)}
              votarPending={votar.isPending}
              onPrioridade={(id, prioridade) => mudarPrioridade.mutate({ id, prioridade })}
              prioridadePending={mudarPrioridade.isPending}
              onEditar={(o) => {
                setEditando(o);
                setDialogAberto(true);
              }}
              onExcluir={setExcluindo}
              draggingId={draggingId}
              dragOverStatus={dragOverStatus}
              onDragStart={handleDragStart}
              onDragEndCard={handleDragEnd}
              onDragOver={handleDragOver}
              onDragEnterColuna={setDragOverStatus}
              onDrop={handleDrop}
            />
          ) : (
            <Card className="rounded-2xl border-0 shadow-soft">
              <div className="divide-y divide-border">
                {filtrados.map((o) => {
                  const Icon = TIPO_ICON[o.tipo];
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSel(o)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/20"
                    >
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          TIPO_COR[o.tipo],
                        )}
                      >
                        <Icon className="h-3 w-3" /> {TIPO_LABEL[o.tipo]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{o.numero}</span>
                      <span className="flex-1 truncate text-sm font-medium">{o.titulo}</span>
                      {o.autor_nome && (
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {o.autor_nome}
                        </span>
                      )}
                      <BadgeAprovacao opt={o} />
                      <Badge variant="secondary">{STATUS_LABEL[o.status]}</Badge>
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                          PRIORIDADE_COR[o.prioridade],
                        )}
                      >
                        {PRIORIDADE_LABEL[o.prioridade]}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" />
                        {o.votos ?? 0}
                      </span>
                    </button>
                  );
                })}
                {filtrados.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nada reportado ainda. Use o botão Reportar para abrir o primeiro card.
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <DialogFormOportunidade
        open={dialogAberto}
        onOpenChange={(open) => {
          setDialogAberto(open);
          if (!open) setEditando(null);
        }}
        telaOrigem={pathname}
        editando={editando}
        onSalvo={(opt) => {
          qc.invalidateQueries({ queryKey: ["oportunidades"] });
          if (opt) {
            setSel((atual) => (atual?.id === opt.id ? { ...atual, ...opt } : atual));
          }
        }}
      />

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluindo?.numero}?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove permanentemente “{excluindo?.titulo}” e os comentários/votos vinculados. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={excluir.isPending || !excluindo}
              onClick={(e) => {
                e.preventDefault();
                if (excluindo) excluir.mutate(excluindo.id);
              }}
            >
              {excluir.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sel && (
        <PainelDetalhe
          opt={sel}
          ehAdmin={ehAdmin}
          podeEditar={podeEditarCard(sel)}
          onClose={() => setSel(null)}
          onMudarStatus={(s) => mudarStatus.mutate({ id: sel.id, status: s })}
          onStatusSincronizado={(s) => {
            qc.invalidateQueries({ queryKey: ["oportunidades"] });
            setSel((atual) => (atual ? { ...atual, status: s } : null));
          }}
          onMudarPrioridade={(p) => mudarPrioridade.mutate({ id: sel.id, prioridade: p })}
          onVotar={() => votar.mutate(sel)}
          onEditar={() => {
            setEditando(sel);
            setDialogAberto(true);
          }}
          onExcluir={() => setExcluindo(sel)}
          onAprovado={(aprovado_em) => {
            qc.invalidateQueries({ queryKey: ["oportunidades"] });
            setSel((atual) => (atual ? { ...atual, aprovado_autor_em: aprovado_em } : null));
          }}
        />
      )}
    </div>
  );
}

/** Props do drag-and-drop nativo, repassadas do topo até o card. */
type DndProps = {
  draggingId: string | null;
  dragOverStatus: OportStatus | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEndCard: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnterColuna: (s: OportStatus | null) => void;
  onDrop: (e: React.DragEvent, s: OportStatus) => void;
};

function KanbanGrid({
  porStatus,
  podeMover,
  podeEditarCard,
  onSelect,
  onVotar,
  votarPending,
  onPrioridade,
  prioridadePending,
  onEditar,
  onExcluir,
  ...dnd
}: {
  porStatus: Record<OportStatus, Oportunidade[]>;
  podeMover: boolean;
  podeEditarCard: (o: Pick<Oportunidade, "autor_id">) => boolean;
  onSelect: (o: Oportunidade) => void;
  onVotar: (o: Oportunidade) => void;
  votarPending: boolean;
  onPrioridade: (id: string, prioridade: OportPrioridade) => void;
  prioridadePending: boolean;
  onEditar: (o: Oportunidade) => void;
  onExcluir: (o: Oportunidade) => void;
} & DndProps) {
  // View fixa: Aberto / Planejado / Em desenvolvimento / Entregue abertas;
  // Backlog / Em análise / Descartado ocultas. Clique no cabeçalho altera.
  const [expanded, setExpanded] = useState<Set<OportStatus>>(() => loadExpanded());
  /** Ordenação por etapa — padrão prioridade; botão cicla para ordem de registro. */
  const [ordemPorStatus, setOrdemPorStatus] = useState<
    Partial<Record<OportStatus, OportOrdemColuna>>
  >({});

  function toggle(st: OportStatus) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      saveExpanded(next);
      return next;
    });
  }

  function restaurarPadrao() {
    setExpanded(() => {
      const next = defaultExpanded();
      saveExpanded(next);
      return next;
    });
  }

  function ciclarOrdem(st: OportStatus) {
    setOrdemPorStatus((prev) => {
      const atual = prev[st] ?? "prioridade";
      return { ...prev, [st]: proximaOrdemColuna(atual) };
    });
  }

  const noPadrao =
    expanded.size === KANBAN_DEFAULT_EXPANDED.length &&
    KANBAN_DEFAULT_EXPANDED.every((s) => expanded.has(s));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={restaurarPadrao}
          disabled={noPadrao}
        >
          <PanelLeftClose className="mr-1 h-3.5 w-3.5" />
          Restaurar padrão
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Aberto, Planejado, Em desenvolvimento e Entregue abertas — demais ocultas. Em cada etapa,
          o botão de ordem prioriza por registro (FIFO) ou prioridade.
        </span>
      </div>

      {/* Scroll da página liberado; horizontal só no board; vertical em cada coluna */}
      <div className="w-full overflow-x-auto overscroll-x-contain pb-2">
        <div className="flex min-w-max items-start gap-4">
          {STATUS_ORDEM.map((st) => (
            <ColunaKanban
              key={st}
              status={st}
              itens={porStatus[st]}
              ordem={ordemPorStatus[st] ?? "prioridade"}
              onCiclarOrdem={() => ciclarOrdem(st)}
              collapsed={!expanded.has(st)}
              onToggle={() => toggle(st)}
              podeMover={podeMover}
              podeEditarCard={podeEditarCard}
              onSelect={onSelect}
              onVotar={onVotar}
              votarPending={votarPending}
              onPrioridade={onPrioridade}
              prioridadePending={prioridadePending}
              onEditar={onEditar}
              onExcluir={onExcluir}
              {...dnd}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const ORDEM_COLUNA_LABEL: Record<OportOrdemColuna, string> = {
  prioridade: "Ordenado por prioridade",
  registro_asc: "Ordem de registro (mais antigos primeiro)",
  registro_desc: "Ordem de registro (mais recentes primeiro)",
};

function ColunaKanban({
  status,
  itens,
  ordem,
  onCiclarOrdem,
  collapsed,
  onToggle,
  podeMover,
  podeEditarCard,
  onSelect,
  onVotar,
  votarPending,
  onPrioridade,
  prioridadePending,
  onEditar,
  onExcluir,
  draggingId,
  dragOverStatus,
  onDragStart,
  onDragEndCard,
  onDragOver,
  onDragEnterColuna,
  onDrop,
}: {
  status: OportStatus;
  itens: Oportunidade[];
  ordem: OportOrdemColuna;
  onCiclarOrdem: () => void;
  collapsed: boolean;
  onToggle: () => void;
  podeMover: boolean;
  podeEditarCard: (o: Pick<Oportunidade, "autor_id">) => boolean;
  onSelect: (o: Oportunidade) => void;
  onVotar: (o: Oportunidade) => void;
  votarPending: boolean;
  onPrioridade: (id: string, prioridade: OportPrioridade) => void;
  prioridadePending: boolean;
  onEditar: (o: Oportunidade) => void;
  onExcluir: (o: Oportunidade) => void;
} & DndProps) {
  const isOver = podeMover && dragOverStatus === status;
  const ordenados = useMemo(() => ordenarColunaOportunidades(itens, ordem), [itens, ordem]);
  /* A coluna inteira é a área de drop — inclusive quando está recolhida, pra
     dar pra jogar um card numa etapa escondida sem precisar abrir. */
  const dropProps = podeMover
    ? {
        onDragOver,
        onDragEnter: () => onDragEnterColuna(status),
        onDragLeave: () => onDragEnterColuna(dragOverStatus === status ? null : dragOverStatus),
        onDrop: (e: React.DragEvent) => onDrop(e, status),
      }
    : {};
  const OrdemIcon =
    ordem === "registro_asc"
      ? ArrowUpNarrowWide
      : ordem === "registro_desc"
        ? ArrowDownWideNarrow
        : ListOrdered;
  const ordemAtiva = ordem !== "prioridade";

  if (collapsed) {
    return (
      <Card
        {...dropProps}
        className={cn(
          "flex max-h-[calc(100dvh-14rem)] w-14 shrink-0 flex-col items-center gap-3 rounded-2xl border-0 bg-muted/30 py-4 shadow-soft transition-shadow",
          isOver && "ring-2 ring-primary/60 bg-accent/40",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          title={`Expandir ${STATUS_LABEL[status]}`}
          className="flex flex-col items-center gap-3 rounded-xl px-1 py-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
          <Badge variant="secondary" className="px-1.5 text-xs">
            {itens.length}
          </Badge>
          <span
            className="mt-1 text-xs font-semibold tracking-wide"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {STATUS_LABEL[status]}
          </span>
        </button>
      </Card>
    );
  }

  return (
    <Card
      {...dropProps}
      className={cn(
        "flex max-h-[calc(100dvh-14rem)] w-[300px] shrink-0 flex-col overflow-hidden rounded-2xl border-0 bg-muted/30 p-4 shadow-soft transition-shadow",
        isOver && "ring-2 ring-primary/60 bg-accent/40",
      )}
    >
      <div className="mb-3 flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          title={`Ocultar ${STATUS_LABEL[status]}`}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-card/70 px-2.5 py-2 text-left transition-colors hover:bg-card"
        >
          <div className="flex min-w-0 items-center gap-2">
            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="truncate text-sm font-semibold tracking-tight text-foreground">
              {STATUS_LABEL[status]}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {itens.length}
          </Badge>
        </button>
        <Button
          type="button"
          variant={ordemAtiva ? "default" : "outline"}
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl"
          title={`${ORDEM_COLUNA_LABEL[ordem]} — clique para alternar`}
          aria-label={`Ordenar ${STATUS_LABEL[status]}: ${ORDEM_COLUNA_LABEL[ordem]}`}
          onClick={(e) => {
            e.stopPropagation();
            onCiclarOrdem();
          }}
        >
          <OrdemIcon className="h-4 w-4" />
        </Button>
      </div>
      {ordemAtiva && (
        <div className="mb-2 px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {ordem === "registro_asc" ? "Registro ↑ antigos" : "Registro ↓ recentes"}
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overflow-x-hidden overscroll-contain pr-0.5">
        {ordenados.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-xs text-muted-foreground/70">
            sem itens
          </div>
        )}
        {ordenados.map((o) => (
          <CardOportunidade
            key={o.id}
            opt={o}
            podeMover={podeMover}
            podeEditar={podeEditarCard(o)}
            onSelect={onSelect}
            onVotar={onVotar}
            votarPending={votarPending}
            onPrioridade={onPrioridade}
            prioridadePending={prioridadePending}
            onEditar={onEditar}
            onExcluir={onExcluir}
            arrastando={draggingId === o.id}
            onDragStart={onDragStart}
            onDragEndCard={onDragEndCard}
          />
        ))}
      </div>
    </Card>
  );
}

function slaDias(criado_em: string): number {
  return Math.floor((Date.now() - new Date(criado_em).getTime()) / 86_400_000);
}

function SlaChip({ criado_em }: { criado_em: string }) {
  const d = slaDias(criado_em);
  const label = d === 0 ? "hoje" : d === 1 ? "1 dia" : `${d} dias`;
  const cor =
    d < 7
      ? "border-border text-muted-foreground"
      : d < 30
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-red-300 bg-red-50 text-red-700";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px]",
        cor,
      )}
    >
      <CalendarClock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function CardOportunidade({
  opt,
  podeMover,
  podeEditar,
  onSelect,
  onVotar,
  votarPending,
  onPrioridade,
  prioridadePending,
  onEditar,
  onExcluir,
  arrastando,
  onDragStart,
  onDragEndCard,
}: {
  opt: Oportunidade;
  podeMover: boolean;
  podeEditar: boolean;
  onSelect: (o: Oportunidade) => void;
  onVotar: (o: Oportunidade) => void;
  votarPending: boolean;
  onPrioridade: (id: string, prioridade: OportPrioridade) => void;
  prioridadePending: boolean;
  onEditar: (o: Oportunidade) => void;
  onExcluir: (o: Oportunidade) => void;
  arrastando: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEndCard: () => void;
}) {
  const Icon = TIPO_ICON[opt.tipo];
  const prioridade = opt.prioridade in PRIORIDADE_COR ? opt.prioridade : "media";

  return (
    <div
      draggable={podeMover}
      onDragStart={podeMover ? (e) => onDragStart(e, opt.id) : undefined}
      onDragEnd={podeMover ? onDragEndCard : undefined}
      className={cn(
        "w-full rounded-xl border border-border bg-card px-3.5 py-3 text-left shadow-sm transition-all",
        arrastando ? "opacity-50 shadow-float" : "hover:-translate-y-0.5 hover:shadow-elev",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(opt)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(opt);
        }}
        className={podeMover ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                TIPO_COR[opt.tipo],
              )}
            >
              <Icon className="h-3 w-3" />
              {TIPO_LABEL[opt.tipo]}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">{opt.numero}</span>
          </div>
          {podeEditar && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                title="Editar"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditar(opt);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Excluir"
                onClick={(e) => {
                  e.stopPropagation();
                  onExcluir(opt);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-snug text-muted-foreground">{opt.titulo}</p>
        <div className="mt-1.5">
          <SlaChip criado_em={opt.criado_em} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-2.5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Responsável
          </div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-sm font-medium text-foreground">
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{opt.autor_nome ?? "—"}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Prioridade
          </div>
          <div className="mt-0.5">
            {podeEditar ? (
              <Select
                value={prioridade}
                disabled={prioridadePending}
                onValueChange={(v) => onPrioridade(opt.id, v as OportPrioridade)}
              >
                <SelectTrigger
                  className={cn(
                    "h-7 w-full gap-1 border px-2 py-0 text-xs font-semibold",
                    PRIORIDADE_COR[prioridade],
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_ORDEM.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORIDADE_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold",
                  PRIORIDADE_COR[prioridade],
                )}
              >
                {PRIORIDADE_LABEL[prioridade]}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end">
        <button
          type="button"
          title={opt.votei ? "Remover voto" : "Votar"}
          disabled={votarPending}
          onClick={(e) => {
            e.stopPropagation();
            onVotar(opt);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-muted",
            opt.votei ? "font-medium text-primary" : "text-muted-foreground",
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> {opt.votos ?? 0}
        </button>
      </div>

      <BadgeAprovacao opt={opt} />
    </div>
  );
}

/**
 * Miniatura de um anexo (print). Bucket é privado — a URL assinada expira em
 * 60s, então é buscada só quando a miniatura entra em tela, não guardada.
 */
function AnexoThumb({ anexo, onExcluir }: { anexo: OportunidadeAnexo; onExcluir?: () => void }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["oport-anexo-url", anexo.storage_path],
    queryFn: () => urlAnexoOportunidade(anexo.storage_path),
    staleTime: 45_000,
  });
  return (
    <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted/40">
      {isLoading || !url ? (
        <div className="flex h-full w-full items-center justify-center">
          <ImageOff className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" title={anexo.nome_arquivo}>
          <img src={url} alt={anexo.nome_arquivo} className="h-full w-full object-cover" />
        </a>
      )}
      {onExcluir && (
        <button
          type="button"
          onClick={onExcluir}
          title="Remover anexo"
          className="absolute right-0.5 top-0.5 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Fila de arquivos escolhidos antes do card existir — upload só acontece
 *  depois que criarOportunidade devolve o id. */
function SeletorAnexosPendentes({
  arquivos,
  onChange,
}: {
  arquivos: File[];
  onChange: (files: File[]) => void;
}) {
  function adicionar(lista: FileList | null) {
    if (!lista) return;
    const escolhidos = Array.from(lista);
    for (const f of escolhidos) {
      const erro = anexoValido(f);
      if (erro) {
        toast.error(`${f.name}: ${erro}`);
        continue;
      }
      if (arquivos.length >= ANEXO_MAX_POR_ENVIO) {
        toast.error(`Máximo de ${ANEXO_MAX_POR_ENVIO} imagens por envio.`);
        break;
      }
      onChange([...arquivos, f]);
    }
  }
  return (
    <div className="space-y-1.5">
      <Label>Prints (opcional)</Label>
      <div className="flex flex-wrap items-center gap-2">
        {arquivos.map((f, i) => (
          <div key={`${f.name}-${i}`} className="group relative h-16 w-16 shrink-0">
            <img
              src={URL.createObjectURL(f)}
              alt={f.name}
              className="h-full w-full rounded-lg border object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(arquivos.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {arquivos.length < ANEXO_MAX_POR_ENVIO && (
          <label className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-muted/40">
            <Paperclip className="h-4 w-4" />
            <span className="text-[10px]">Anexar</span>
            <input
              type="file"
              accept={ANEXO_TIPOS_ACEITOS.join(",")}
              multiple
              className="hidden"
              onChange={(e) => {
                adicionar(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Até {ANEXO_MAX_POR_ENVIO} imagens, 8MB cada. Sobem junto ao criar o card.
      </p>
    </div>
  );
}

function DialogFormOportunidade({
  open,
  onOpenChange,
  telaOrigem,
  editando,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  telaOrigem: string;
  editando: Oportunidade | null;
  onSalvo: (opt?: Oportunidade) => void;
}) {
  const [tipo, setTipo] = useState<OportTipo>("bug");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [impacto, setImpacto] = useState<OportImpacto | "">("");
  const [prioridade, setPrioridade] = useState<OportPrioridade>("media");
  const [similares, setSimilares] = useState<Oportunidade[]>([]);
  const [buscandoSimilares, setBuscandoSimilares] = useState(false);
  // Só faz sentido ao criar — card em edição já tem o painel com anexos ao vivo.
  const [anexosPendentes, setAnexosPendentes] = useState<File[]>([]);
  const modoEdicao = !!editando;

  useEffect(() => {
    if (!open) {
      setTipo("bug");
      setTitulo("");
      setDescricao("");
      setImpacto("");
      setPrioridade("media");
      setSimilares([]);
      setAnexosPendentes([]);
      return;
    }
    if (editando) {
      setTipo(editando.tipo);
      setTitulo(editando.titulo);
      setDescricao(editando.descricao);
      setImpacto(editando.impacto ?? "");
      setPrioridade(editando.prioridade);
      setSimilares([]);
    }
  }, [open, editando]);

  useEffect(() => {
    if (modoEdicao || !titulo.trim() || titulo.trim().length < 5) {
      setSimilares([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoSimilares(true);
      try {
        const res = await buscarSimilares(titulo.trim());
        setSimilares(res);
      } catch {
        setSimilares([]);
      } finally {
        setBuscandoSimilares(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [titulo, modoEdicao]);

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        tipo,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        impacto: (impacto || null) as OportImpacto | null,
        prioridade,
      };
      if (editando) return editarOportunidade(editando.id, payload);
      const criado = await criarOportunidade({
        ...payload,
        tela_origem: telaOrigem,
      });
      // Best-effort: card já existe se algum print falhar — não desfaz a
      // criação, só avisa, porque o texto do relato é a parte que importa.
      for (const file of anexosPendentes) {
        try {
          await anexarOportunidade(criado.id, file);
        } catch (e) {
          toast.error(`Falha ao anexar ${file.name}: ${msgErro(e, "erro desconhecido")}`);
        }
      }
      return criado;
    },
    onSuccess: (opt) => {
      toast.success(modoEdicao ? `${opt.numero} atualizado.` : `Registrado como ${opt.numero}.`);
      onSalvo(opt);
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(
        e instanceof Error
          ? e.message
          : modoEdicao
            ? "Não foi possível salvar."
            : "Não foi possível criar.",
      ),
  });

  const podeEnviar = titulo.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? `Editar ${editando?.numero}` : "Reportar oportunidade"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as OportTipo)}>
              <SelectTrigger id="report-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABEL) as OportTipo[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-titulo">Título</Label>
            <Input
              id="report-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Descreva em poucas palavras"
            />
          </div>

          {similares.length > 0 && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertTitle className="text-amber-900">
                Possíveis duplicatas{buscandoSimilares ? "…" : ""}
              </AlertTitle>
              <AlertDescription className="text-amber-800">
                <p className="mb-1.5 text-xs">Verifique se não é duplicata antes de criar:</p>
                <ul className="space-y-1 text-xs">
                  {similares.map((s) => (
                    <li key={s.id}>
                      <span className="font-mono font-medium">{s.numero}</span> — {s.titulo}{" "}
                      <span className="text-amber-700">({STATUS_LABEL[s.status]})</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="report-descricao">Descrição (opcional)</Label>
            <Textarea
              id="report-descricao"
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhe o bug, melhoria ou dúvida"
            />
          </div>

          {!modoEdicao && (
            <SeletorAnexosPendentes arquivos={anexosPendentes} onChange={setAnexosPendentes} />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="report-impacto">Impacto (opcional)</Label>
            <Select
              value={impacto || "none"}
              onValueChange={(v) => setImpacto(v === "none" ? "" : (v as OportImpacto))}
            >
              <SelectTrigger id="report-impacto">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="bloqueia">Bloqueia</SelectItem>
                <SelectItem value="atrapalha">Atrapalha</SelectItem>
                <SelectItem value="cosmetico">Cosmético</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-prioridade">Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as OportPrioridade)}>
              <SelectTrigger id="report-prioridade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDADE_ORDEM.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORIDADE_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!podeEnviar || salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? "Salvando…" : modoEdicao ? "Salvar" : "Criar card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PainelDetalhe({
  opt,
  ehAdmin,
  podeEditar,
  onClose,
  onMudarStatus,
  onStatusSincronizado,
  onMudarPrioridade,
  onVotar,
  onEditar,
  onExcluir,
  onAprovado,
}: {
  opt: Oportunidade;
  ehAdmin: boolean;
  podeEditar: boolean;
  onClose: () => void;
  /** Pede a troca de status ao servidor (Select do painel). */
  onMudarStatus: (s: OportStatus) => void;
  /** Só reflete no painel um status que já mudou no servidor (concluir, recusar)
   *  — usar onMudarStatus aqui reescreveria o status e, para quem não é admin,
   *  levaria um erro de permissão depois de uma ação que deu certo. */
  onStatusSincronizado: (s: OportStatus) => void;
  onMudarPrioridade: (p: OportPrioridade) => void;
  onVotar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onAprovado: (aprovado_em: string) => void;
}) {
  const qc = useQueryClient();
  const [comentario, setComentario] = useState("");
  // Padrão é responder quem reportou — comentar aqui quase sempre é dar retorno
  // do card. Nota interna continua a um clique, e o seletor fica do lado do
  // Enviar para ninguém escrever público achando que é interno.
  const [tipoComentario, setTipoComentario] = useState<OportComentarioTipo>("publico");
  const { data: meuId } = useQuery({
    queryKey: ["session-user-id"],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.user?.id ?? null,
    staleTime: 60_000,
  });
  const { data: coms = [] } = useQuery({
    queryKey: ["oport-com", opt.id],
    queryFn: () => comentariosOportunidade(opt.id),
  });
  const { data: hist = [] } = useQuery({
    queryKey: ["oport-hist", opt.id],
    queryFn: () => historicoOportunidade(opt.id),
  });
  const { data: anexos = [] } = useQuery({
    queryKey: ["oport-anexos", opt.id],
    queryFn: () => anexosOportunidade(opt.id),
  });

  // "Não encontrei onde incluir os prints" (17/08) — o card não tinha upload
  // nem ao criar nem depois. Anexo aqui é sempre de card (comentario_id null):
  // some para quem só vê comentário interno de outra pessoa, mas isso não se
  // aplica a print — é evidência do card, mesma visibilidade da descrição.
  const anexar = useMutation({
    mutationFn: (file: File) => anexarOportunidade(opt.id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["oport-anexos", opt.id] }),
    onError: (e) => toast.error(msgErro(e, "Não foi possível anexar.")),
  });
  const excluirAnexo = useMutation({
    mutationFn: (a: OportunidadeAnexo) => excluirAnexoOportunidade(a),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["oport-anexos", opt.id] }),
    onError: (e) => toast.error(msgErro(e, "Não foi possível remover o anexo.")),
  });
  function escolherAnexos(lista: FileList | null) {
    if (!lista) return;
    for (const f of Array.from(lista)) {
      const erro = anexoValido(f);
      if (erro) {
        toast.error(`${f.name}: ${erro}`);
        continue;
      }
      anexar.mutate(f);
    }
  }

  const enviarCom = useMutation({
    mutationFn: () => comentarOportunidade(opt.id, comentario.trim(), tipoComentario),
    onSuccess: () => {
      setComentario("");
      qc.invalidateQueries({ queryKey: ["oport-com", opt.id] });
      toast.success(
        tipoComentario === "publico"
          ? `Resposta enviada — ${opt.autor_nome ?? "quem reportou"} vê no card.`
          : "Nota interna registrada.",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  // Concluir respondendo: o autor recebe "Entregue" + pedido de aprovação, então
  // precisa ler junto o que foi feito. Só admin move status (guarda no banco).
  const [concluirAberto, setConcluirAberto] = useState(false);
  const [solucao, setSolucao] = useState("");
  const concluir = useMutation({
    mutationFn: () => concluirOportunidadeComSolucao(opt.id, solucao),
    onSuccess: () => {
      setConcluirAberto(false);
      setSolucao("");
      onStatusSincronizado("entregue");
      qc.invalidateQueries({ queryKey: ["oport-com", opt.id] });
      qc.invalidateQueries({ queryKey: ["oport-hist", opt.id] });
      toast.success("Card entregue e resposta enviada para quem reportou.");
    },
    onError: (e) => toast.error(msgErro(e, "Não foi possível concluir.")),
  });

  const aprovar = useMutation({
    mutationFn: () => aprovarEntregaOportunidade(opt.id),
    onSuccess: () => {
      onAprovado(new Date().toISOString());
      toast.success("Entrega aprovada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível aprovar."),
  });

  // Tarefa 07 — recusar entrega. Antes só existia Entregue → Descartada, então
  // quem reprovava escrevia "reprovado" num comentário e o card seguia contando
  // como entregue.
  const [recusaAberta, setRecusaAberta] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const recusar = useMutation({
    mutationFn: () => recusarEntregaOportunidade(opt.id, motivoRecusa),
    onSuccess: () => {
      setRecusaAberta(false);
      setMotivoRecusa("");
      onStatusSincronizado("em_analise");
      qc.invalidateQueries({ queryKey: ["oport-hist", opt.id] });
      toast.success("Entrega recusada — o card voltou para Em análise.");
    },
    onError: (e) => toast.error(msgErro(e, "Não foi possível recusar.")),
  });

  // Tarefa 09 — data prevista de solução, editável só por admin.
  const [dataPrevista, setDataPrevista] = useState(opt.data_prevista ?? "");
  useEffect(() => setDataPrevista(opt.data_prevista ?? ""), [opt.id, opt.data_prevista]);
  const salvarPrevista = useMutation({
    mutationFn: () => definirDataPrevistaOportunidade(opt.id, dataPrevista || null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oportunidades"] });
      toast.success(dataPrevista ? "Data prevista salva." : "Data prevista removida.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const Icon = TIPO_ICON[opt.tipo];
  const pendenteAprovacao = aguardandoAprovacaoCliente(opt);
  const souCriador = !!meuId && opt.autor_id === meuId;
  const podeAprovarEntrega = souCriador || ehAdmin;
  // A policy já filtra, mas a lista é montada aqui — se um dia a query trouxer
  // nota interna de outra pessoa, ela não vaza no painel de quem reportou.
  const comsVisiveis = useMemo(
    () => coms.filter((c) => podeVerComentario(c, { ehAdmin, userId: meuId ?? null })),
    [coms, ehAdmin, meuId],
  );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="mb-1 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                TIPO_COR[opt.tipo],
              )}
            >
              <Icon className="h-3 w-3" /> {TIPO_LABEL[opt.tipo]}
            </span>
            <span className="text-xs text-muted-foreground">{opt.numero}</span>
          </div>
          <SheetTitle className="text-lg">{opt.titulo}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <p className="whitespace-pre-wrap text-sm text-foreground">{opt.descricao}</p>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" /> Anexos
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {anexos.map((a) => (
                <AnexoThumb
                  key={a.id}
                  anexo={a}
                  onExcluir={
                    ehAdmin || a.autor_id === meuId ? () => excluirAnexo.mutate(a) : undefined
                  }
                />
              ))}
              <label className="flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-muted/40">
                <Paperclip className="h-4 w-4" />
                <span className="text-[10px]">Anexar print</span>
                <input
                  type="file"
                  accept={ANEXO_TIPOS_ACEITOS.join(",")}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    escolherAnexos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
            {opt.autor_nome && (
              <div>
                <span className="text-muted-foreground">Criado por:</span>{" "}
                <span className="font-medium">{opt.autor_nome}</span>
              </div>
            )}
            {opt.impacto && (
              <div>
                <span className="text-muted-foreground">Impacto:</span>{" "}
                <span className="font-medium">{opt.impacto}</span>
              </div>
            )}
            {opt.tela_origem && (
              <div>
                <span className="text-muted-foreground">Tela:</span>{" "}
                <span className="font-medium">{opt.tela_origem}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Prioridade:</span>{" "}
              {podeEditar ? (
                <Select
                  value={opt.prioridade}
                  onValueChange={(v) => onMudarPrioridade(v as OportPrioridade)}
                >
                  <SelectTrigger className="mt-0.5 h-7 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADE_ORDEM.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORIDADE_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-medium">{PRIORIDADE_LABEL[opt.prioridade]}</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Criada:</span>{" "}
              <span className="font-medium">
                {new Date(opt.criado_em).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>

          {/* Tarefa 09 — data prevista de solução. Visível para todos (foi o que
              o cliente pediu, para conseguir se planejar); editável só por admin. */}
          <div className="rounded-xl border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Previsão de solução
            </div>
            {ehAdmin ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className="h-8 w-auto text-sm"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={salvarPrevista.isPending || dataPrevista === (opt.data_prevista ?? "")}
                  onClick={() => salvarPrevista.mutate()}
                >
                  Salvar
                </Button>
                {opt.data_prevista && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={salvarPrevista.isPending}
                    onClick={() => {
                      setDataPrevista("");
                      salvarPrevista.mutate();
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-1 text-sm font-medium">
                {opt.data_prevista ? (
                  new Date(`${opt.data_prevista}T12:00:00`).toLocaleDateString("pt-BR")
                ) : (
                  <span className="font-normal text-muted-foreground">Ainda não definida</span>
                )}
              </div>
            )}
          </div>

          {pendenteAprovacao && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold uppercase tracking-wide">Aguardando aprovação</div>
                <div className="mt-0.5 text-amber-800">
                  {souCriador
                    ? "Você reportou este item — valide se a entrega resolve o problema."
                    : ehAdmin
                      ? `Admin pode aprovar a entrega de ${opt.autor_nome ?? "quem criou o card"}.`
                      : `Aguardando validação de ${opt.autor_nome ?? "quem criou o card"}.`}
                </div>
                {podeAprovarEntrega && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={aprovar.isPending || recusar.isPending}
                      onClick={() => aprovar.mutate()}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Aprovar entrega
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                      disabled={aprovar.isPending || recusar.isPending}
                      onClick={() => setRecusaAberta(true)}
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Recusar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {opt.status === "entregue" && opt.aprovado_autor_em && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Aprovado em {new Date(opt.aprovado_autor_em).toLocaleString("pt-BR")}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {ehAdmin ? (
              <Select value={opt.status} onValueChange={(v) => onMudarStatus(v as OportStatus)}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDEM.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">{STATUS_LABEL[opt.status]}</Badge>
            )}
            {ehAdmin && opt.status !== "entregue" && (
              <Button size="sm" onClick={() => setConcluirAberto(true)}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Concluir e responder
              </Button>
            )}
            <Button variant={opt.votei ? "default" : "outline"} size="sm" onClick={onVotar}>
              <ThumbsUp className="mr-1 h-4 w-4" /> {opt.votos ?? 0}
            </Button>
            {podeEditar && (
              <>
                <Button variant="outline" size="sm" onClick={onEditar}>
                  <Pencil className="mr-1 h-4 w-4" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onExcluir}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Excluir
                </Button>
              </>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Comentários
            </div>
            <div className="mb-2 space-y-2">
              {comsVisiveis.length === 0 && (
                <div className="text-xs text-muted-foreground">Sem comentários.</div>
              )}
              {comsVisiveis.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs",
                    c.tipo === "publico"
                      ? "border border-emerald-200 bg-emerald-50/70"
                      : "bg-muted/40",
                  )}
                >
                  <div className="mb-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-medium text-foreground">{c.autor_nome ?? "Equipe"}</span>
                    <span>{new Date(c.criado_em).toLocaleString("pt-BR")}</span>
                    <span
                      className={cn(
                        "rounded border px-1 py-px font-semibold uppercase tracking-wide",
                        c.tipo === "publico"
                          ? "border-emerald-300 text-emerald-800"
                          : "border-border text-muted-foreground",
                      )}
                      title={COMENTARIO_TIPO_LABEL[c.tipo]}
                    >
                      {COMENTARIO_TIPO_BADGE[c.tipo]}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{c.conteudo}</div>
                </div>
              ))}
            </div>
            <Textarea
              rows={2}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={
                tipoComentario === "publico"
                  ? `Responder ${opt.autor_nome ?? "quem reportou"}…`
                  : "Nota interna da equipe…"
              }
            />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <Select
                value={tipoComentario}
                onValueChange={(v) => setTipoComentario(v as OportComentarioTipo)}
              >
                <SelectTrigger className="h-8 w-auto min-w-[13rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMENTARIO_TIPO_ORDEM.map((t) => (
                    <SelectItem key={t} value={t}>
                      {COMENTARIO_TIPO_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!comentario.trim() || enviarCom.isPending}
                onClick={() => enviarCom.mutate()}
              >
                Enviar
              </Button>
            </div>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {tipoComentario === "publico"
                ? "Quem reportou o card lê esta resposta."
                : "Só admins e você leem esta nota."}
            </p>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Histórico de atividades
            </div>
            <div className="space-y-1">
              {hist.length === 0 && (
                <div className="text-xs text-muted-foreground">Sem mudanças de status.</div>
              )}
              {hist.map((h) => (
                <div key={h.id} className="text-xs">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">
                      {new Date(h.mudado_em).toLocaleString("pt-BR")}
                    </span>
                    <span className="font-medium">{h.mudado_por_nome ?? "Sistema"}</span>
                    <span>
                      {fmtStatus(h.status_anterior)} →{" "}
                      <span className="font-medium">{fmtStatus(h.status_novo)}</span>
                    </span>
                  </div>
                  {/* Motivo da recusa (tarefa 07) — sem isto o card volta para
                      Em análise e ninguém sabe por quê. */}
                  {h.comentario && (
                    <div className="mt-0.5 border-l-2 border-amber-300 bg-amber-50/60 px-2 py-1 text-amber-900">
                      {h.comentario}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>

      <Dialog
        open={recusaAberta}
        onOpenChange={(o) => {
          if (!o && !recusar.isPending) {
            setRecusaAberta(false);
            setMotivoRecusa("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar entrega — {opt.numero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              O card volta para <span className="font-medium">Em análise</span> e o motivo fica
              registrado no histórico, com seu nome e a data.
            </p>
            <Label htmlFor="motivo-recusa">O que continua errado?</Label>
            <Textarea
              id="motivo-recusa"
              rows={4}
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              placeholder="Ex.: continua sem trazer a conta do banco no mês 2, e não há como preencher manualmente."
            />
            <p className="text-xs text-muted-foreground">
              {!motivoRecusaValido(motivoRecusa)
                ? `Faltam ${MOTIVO_RECUSA_MIN - motivoRecusa.trim().length} caractere(s).`
                : "Quanto mais específico, menos ida e volta."}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={recusar.isPending}
              onClick={() => {
                setRecusaAberta(false);
                setMotivoRecusa("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={recusar.isPending || !motivoRecusaValido(motivoRecusa)}
              onClick={() => recusar.mutate()}
            >
              {recusar.isPending ? "Recusando…" : "Confirmar recusa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Concluir respondendo — a resposta vai como comentário público, que é o
          que quem reportou lê antes de aprovar a entrega. */}
      <Dialog
        open={concluirAberto}
        onOpenChange={(o) => {
          if (!o && !concluir.isPending) {
            setConcluirAberto(false);
            setSolucao("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir — {opt.numero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              O card vai para <span className="font-medium">Entregue</span> e a resposta aparece no
              card para <span className="font-medium">{opt.autor_nome ?? "quem reportou"}</span>,
              que ainda precisa aprovar a entrega.
            </p>
            <Label htmlFor="solucao-conclusao">Como ficou resolvido?</Label>
            <Textarea
              id="solucao-conclusao"
              rows={4}
              value={solucao}
              onChange={(e) => setSolucao(e.target.value)}
              placeholder="Ex.: ao trocar o complemento para uma data (06/2026) o lançamento não é mais excluído — corrigido na tela de lançamentos."
            />
            <p className="text-xs text-muted-foreground">
              {!solucaoValida(solucao)
                ? `Faltam ${SOLUCAO_MIN - solucao.trim().length} caractere(s).`
                : "Esse texto fica visível para quem abriu o card."}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={concluir.isPending}
              onClick={() => {
                setConcluirAberto(false);
                setSolucao("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={concluir.isPending || !solucaoValida(solucao)}
              onClick={() => concluir.mutate()}
            >
              {concluir.isPending ? "Concluindo…" : "Concluir e responder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
