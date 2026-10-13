import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, Instagram, TrendingUp, TrendingDown, Minus,
  Users, Heart, MessageCircle, Eye, Bookmark, Star, Copy, Check,
  Link,
} from "lucide-react";
import { useInstagramAnalysis } from "@/hooks/useInstagramAnalysis";
import { useInstagramInspirations, type InstagramInspiration } from "@/hooks/useInstagramInspirations";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InstagramMetric } from "@/hooks/useInstagramAnalysis";

function fmtN(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toFixed(2)}%`;
}

const METRIC_FIELDS = [
  { key: "followers" as const, label: "Seguidores", icon: Users },
  { key: "post_count" as const, label: "Posts", icon: Instagram },
  { key: "reel_count" as const, label: "Reels", icon: TrendingUp },
  { key: "avg_likes" as const, label: "Likes médios", icon: Heart },
  { key: "avg_comments" as const, label: "Coment. médios", icon: MessageCircle },
  { key: "avg_reach" as const, label: "Alcance médio", icon: Eye },
  { key: "avg_saves" as const, label: "Saves médios", icon: Bookmark },
  { key: "engagement_rate" as const, label: "Engajamento %", icon: Star },
];

const INSPIRATION_CATEGORIES = [
  { value: "geral", label: "Geral" },
  { value: "layout", label: "Layout" },
  { value: "copy", label: "Copy" },
  { value: "reels", label: "Reels" },
  { value: "carrossel", label: "Carrossel" },
  { value: "story", label: "Story" },
  { value: "branding", label: "Branding" },
];

const CLAUDE_PROMPT = `Você é um especialista em marketing digital para arquitetura e design de interiores. Você tem acesso ao navegador com o Instagram já aberto.

Navegue até o Instagram Insights da conta que está logada no navegador e colete as métricas da última semana completa. Faça isso:

1. Acesse o perfil → toque em "Ver Insights" (ou acesse instagram.com → perfil → Insights)
2. Defina o período: últimos 7 dias
3. Colete da aba "Visão Geral": seguidores totais, alcance, impressões
4. Colete da aba "Conteúdo": desempenho de posts, reels e stories (likes, comentários, alcance, salvamentos)
5. Calcule as médias

Depois de navegar e coletar tudo, retorne EXATAMENTE neste formato JSON (sem nenhum texto antes do JSON):

{
  "followers": [número total de seguidores],
  "post_count": [número de posts no período],
  "reel_count": [número de reels no período],
  "story_count": [número de stories no período],
  "avg_likes": [média de likes por post],
  "avg_comments": [média de comentários por post],
  "avg_reach": [alcance médio por post],
  "avg_saves": [média de salvamentos por post],
  "engagement_rate": [taxa de engajamento em porcentagem, ex: 3.45],
  "notes": "Observações sobre a semana: destaques, posts que mais engajaram, tendências"
}

Após o JSON, adicione uma análise curta com 2-3 recomendações práticas para a próxima semana.`;

export default function ContentInstagram() {
  const {
    profiles, metrics, isLoading,
    createProfile, updateProfile, removeProfile,
    createMetric, updateMetric, removeMetric,
  } = useInstagramAnalysis();
  const { inspirations, isLoading: inspsLoading, create: createInsp, update: updateInsp, remove: removeInsp } = useInstagramInspirations();

  // Own profile (kind = 'self')
  const ownProfile = useMemo(() => profiles.find(p => p.kind === "self" && p.is_active), [profiles]);

  // Metrics history filter
  const [metricPeriodFilter, setMetricPeriodFilter] = useState<string>("all");
  const [metricYear, setMetricYear] = useState<string>(String(new Date().getFullYear()));

  // AI parse state
  const [aiResponseText, setAiResponseText] = useState("");
  const [aiParsed, setAiParsed] = useState<Partial<InstagramMetric> | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  // Profile setup dialog
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ handle: "", label: "" });

  // Metric dialog
  const [metricDialogOpen, setMetricDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<InstagramMetric | null>(null);
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const [metricDraft, setMetricDraft] = useState<Partial<InstagramMetric>>({
    profile_id: ownProfile?.id ?? "",
    period_start: format(weekStart, "yyyy-MM-dd"),
    period_end: format(weekEnd, "yyyy-MM-dd"),
  });

  // Inspiration dialog
  const [inspDialogOpen, setInspDialogOpen] = useState(false);
  const [editingInsp, setEditingInsp] = useState<InstagramInspiration | null>(null);
  const [inspDraft, setInspDraft] = useState<Partial<InstagramInspiration>>({ category: "geral", is_favorite: false });
  const [inspCatFilter, setInspCatFilter] = useState("all");
  const [inspFavOnly, setInspFavOnly] = useState(false);

  // Filtered metrics
  const ownMetrics = useMemo(() => {
    if (!ownProfile) return [];
    return metrics.filter(m => m.profile_id === ownProfile.id)
      .sort((a, b) => b.period_start.localeCompare(a.period_start));
  }, [metrics, ownProfile]);

  const filteredMetrics = useMemo(() => {
    if (metricPeriodFilter === "all") return ownMetrics;
    return ownMetrics.filter(m => m.period_start.startsWith(
      metricPeriodFilter === "year" ? metricYear : `${metricYear}-`
    ));
  }, [ownMetrics, metricPeriodFilter, metricYear]);

  const latestMetric = ownMetrics[0];
  const prevMetric = ownMetrics[1];

  function trend(curr: number | null | undefined, prev: number | null | undefined) {
    if (!curr || !prev) return null;
    const pct = ((curr - prev) / prev) * 100;
    return pct;
  }

  // Inspiration helpers
  const filteredInspirations = useMemo(() => {
    return inspirations.filter(i => {
      if (inspFavOnly && !i.is_favorite) return false;
      if (inspCatFilter !== "all" && i.category !== inspCatFilter) return false;
      return true;
    });
  }, [inspirations, inspCatFilter, inspFavOnly]);

  // AI parse
  function handleParseAI() {
    try {
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Não encontrei JSON na resposta");
      const parsed = JSON.parse(jsonMatch[0]);
      setAiParsed(parsed);
      // Pre-fill metric draft
      setMetricDraft(d => ({
        ...d,
        followers: parsed.followers ?? d.followers,
        post_count: parsed.post_count ?? d.post_count,
        reel_count: parsed.reel_count ?? d.reel_count,
        story_count: parsed.story_count ?? d.story_count,
        avg_likes: parsed.avg_likes ?? d.avg_likes,
        avg_comments: parsed.avg_comments ?? d.avg_comments,
        avg_reach: parsed.avg_reach ?? d.avg_reach,
        avg_saves: parsed.avg_saves ?? d.avg_saves,
        engagement_rate: parsed.engagement_rate ?? d.engagement_rate,
        notes: parsed.notes ?? d.notes,
      }));
      setMetricDialogOpen(true);
    } catch (e: any) {
      alert("Erro ao interpretar resposta: " + e.message);
    }
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(CLAUDE_PROMPT);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  function openNewMetric() {
    setEditingMetric(null);
    setMetricDraft({
      profile_id: ownProfile?.id ?? "",
      period_start: format(weekStart, "yyyy-MM-dd"),
      period_end: format(weekEnd, "yyyy-MM-dd"),
    });
    setMetricDialogOpen(true);
  }

  function openEditMetric(m: InstagramMetric) {
    setEditingMetric(m);
    setMetricDraft({ ...m });
    setMetricDialogOpen(true);
  }

  function saveMetric() {
    const d = metricDraft;
    if (!d.profile_id || !d.period_start || !d.period_end) return;
    const payload = {
      profile_id: d.profile_id!,
      period_start: d.period_start!,
      period_end: d.period_end!,
      followers: d.followers ?? null,
      post_count: d.post_count ?? null,
      reel_count: d.reel_count ?? null,
      story_count: d.story_count ?? null,
      avg_likes: d.avg_likes ?? null,
      avg_comments: d.avg_comments ?? null,
      avg_reach: d.avg_reach ?? null,
      avg_saves: d.avg_saves ?? null,
      engagement_rate: d.engagement_rate ?? null,
      notes: d.notes ?? null,
      palette_dominant: null,
      palette_secondary: null,
      palette_tertiary: null,
      palette_quaternary: null,
    };
    if (editingMetric) {
      updateMetric.mutate({ id: editingMetric.id, ...payload }, { onSuccess: () => { setMetricDialogOpen(false); setAiParsed(null); setAiResponseText(""); } });
    } else {
      createMetric.mutate(payload, { onSuccess: () => { setMetricDialogOpen(false); setAiParsed(null); setAiResponseText(""); } });
    }
  }

  function saveInspiration() {
    const d = inspDraft;
    if (!d.title?.trim()) return;
    const payload = {
      title: d.title,
      source_url: d.source_url ?? null,
      image_url: d.image_url ?? null,
      category: d.category ?? "geral",
      tags: d.tags ?? null,
      notes: d.notes ?? null,
      is_favorite: d.is_favorite ?? false,
    };
    if (editingInsp) {
      updateInsp.mutate({ id: editingInsp.id, ...payload }, { onSuccess: () => setInspDialogOpen(false) });
    } else {
      createInsp.mutate(payload, { onSuccess: () => setInspDialogOpen(false) });
    }
  }

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display">Instagram</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas semanais e inspirações de conteúdo
          </p>
        </div>
        {ownProfile && (
          <Badge variant="secondary" className="text-sm gap-1.5 px-3 py-1.5">
            <Instagram className="h-3.5 w-3.5" />
            @{ownProfile.handle}
          </Badge>
        )}
      </div>

      {!ownProfile && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <Instagram className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-medium">Configure seu perfil do Instagram</p>
              <p className="text-sm text-muted-foreground mt-1">Cadastre o @ da Quadra para começar a registrar métricas</p>
            </div>
            <Button onClick={() => { setProfileDraft({ handle: "", label: "" }); setProfileDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Configurar Perfil
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="metricas">
        <TabsList>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="inspiracoes">Inspirações ({inspirations.length})</TabsTrigger>
          <TabsTrigger value="prompt">Prompt IA</TabsTrigger>
        </TabsList>

        {/* ── Métricas ── */}
        <TabsContent value="metricas" className="mt-4 space-y-4">
          {/* Latest metrics KPI bar */}
          {latestMetric && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {METRIC_FIELDS.slice(0, 4).map(f => {
                const curr = latestMetric[f.key] as number | null;
                const prev = prevMetric ? prevMetric[f.key] as number | null : null;
                const t = trend(curr, prev);
                const Icon = f.icon;
                return (
                  <Card key={f.key}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{f.label}</p>
                      </div>
                      <p className="text-xl font-semibold">{f.key === "engagement_rate" ? fmtPct(curr) : fmtN(curr)}</p>
                      {t != null && (
                        <p className={`text-xs mt-0.5 flex items-center gap-0.5 ${t > 0 ? "text-success" : t < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {t > 0 ? <TrendingUp className="h-3 w-3" /> : t < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {t > 0 ? "+" : ""}{t.toFixed(1)}% vs semana ant.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 items-center">
              <Select value={metricPeriodFilter} onValueChange={setMetricPeriodFilter}>
                <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                </SelectContent>
              </Select>
              {metricPeriodFilter === "year" && (
                <Select value={metricYear} onValueChange={setMetricYear}>
                  <SelectTrigger className="h-9 w-[90px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            {ownProfile && (
              <Button size="sm" onClick={openNewMetric}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Métricas
              </Button>
            )}
          </div>

          {/* Metrics history */}
          {filteredMetrics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {ownProfile ? "Nenhuma métrica registrada ainda. Use o botão acima ou o Prompt IA para adicionar." : "Configure seu perfil primeiro."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMetrics.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          {format(parseISO(m.period_start), "dd/MM/yyyy", { locale: ptBR })} → {format(parseISO(m.period_end), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
                          {METRIC_FIELDS.map(f => (
                            <div key={f.key}>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                              <p className="text-sm font-semibold">{f.key === "engagement_rate" ? fmtPct(m[f.key] as number) : fmtN(m[f.key] as number)}</p>
                            </div>
                          ))}
                        </div>
                        {m.notes && <p className="text-xs text-muted-foreground mt-3 border-t pt-2">{m.notes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditMetric(m)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMetric.mutate(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Inspirações ── */}
        <TabsContent value="inspiracoes" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={inspCatFilter} onValueChange={setInspCatFilter}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {INSPIRATION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant={inspFavOnly ? "default" : "outline"} onClick={() => setInspFavOnly(v => !v)} className="h-9">
                <Star className="h-3.5 w-3.5 mr-1" /> Favoritas
              </Button>
            </div>
            <Button size="sm" onClick={() => { setEditingInsp(null); setInspDraft({ category: "geral", is_favorite: false }); setInspDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Inspiração
            </Button>
          </div>

          {filteredInspirations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma inspiração encontrada. Salve posts de referência aqui!
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInspirations.map(insp => (
                <Card key={insp.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {insp.is_favorite && <Star className="h-3.5 w-3.5 text-warning-ink fill-warning" />}
                          <p className="font-medium text-sm truncate">{insp.title}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{INSPIRATION_CATEGORIES.find(c => c.value === insp.category)?.label || insp.category}</Badge>
                          {(insp.tags ?? []).slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px]">#{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingInsp(insp); setInspDraft({ ...insp }); setInspDialogOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeInsp.mutate(insp.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {insp.notes && <p className="text-xs text-muted-foreground">{insp.notes}</p>}
                    {insp.source_url && (
                      <a href={insp.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Link className="h-3 w-3" /> Ver original
                      </a>
                    )}
                    {insp.image_url && (
                      <img src={insp.image_url} alt={insp.title} className="w-full h-32 object-cover rounded-md border" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Prompt IA ── */}
        <TabsContent value="prompt" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Como usar o Prompt IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                  <p>Copie o prompt abaixo e cole no Claude (claude.ai) no seu navegador</p>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                  <p>Cole os dados do Instagram Insights onde indicado e envie para o Claude</p>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                  <p>Cole a resposta do Claude abaixo — as métricas serão preenchidas automaticamente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Prompt Template</CardTitle>
              <Button size="sm" variant="outline" onClick={handleCopyPrompt} className="h-8">
                {promptCopied ? <><Check className="h-3.5 w-3.5 mr-1 text-success" />Copiado!</> : <><Copy className="h-3.5 w-3.5 mr-1" />Copiar Prompt</>}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-4 whitespace-pre-wrap font-mono overflow-x-auto">
                {CLAUDE_PROMPT}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cole a Resposta do Claude</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Cole aqui a resposta completa do Claude com o JSON de métricas..."
                rows={8}
                value={aiResponseText}
                onChange={(e) => setAiResponseText(e.target.value)}
                className="font-mono text-xs"
              />
              <Button onClick={handleParseAI} disabled={!aiResponseText.trim() || !ownProfile} className="w-full">
                Interpretar e Preencher Métricas
              </Button>
              {!ownProfile && <p className="text-xs text-muted-foreground text-center">Configure seu perfil primeiro na aba Métricas.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Setup profile */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Perfil do Instagram</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Handle (sem @) *</Label>
              <Input placeholder="ex: quadrarq" value={profileDraft.handle} onChange={(e) => setProfileDraft(d => ({ ...d, handle: e.target.value }))} />
            </div>
            <div>
              <Label>Rótulo (opcional)</Label>
              <Input placeholder="ex: Quadra Arquitetura" value={profileDraft.label} onChange={(e) => setProfileDraft(d => ({ ...d, label: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!profileDraft.handle.trim()) return;
              const handle = profileDraft.handle.startsWith("@") ? profileDraft.handle.slice(1) : profileDraft.handle;
              createProfile.mutate({ handle, label: profileDraft.label || null, kind: "self", notes: null, is_active: true }, {
                onSuccess: () => setProfileDialogOpen(false),
              });
            }} disabled={!profileDraft.handle.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add/edit metric */}
      <Dialog open={metricDialogOpen} onOpenChange={(o) => { setMetricDialogOpen(o); if (!o) { setAiParsed(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMetric ? "Editar Métricas" : "Adicionar Métricas"}</DialogTitle>
          </DialogHeader>
          {aiParsed && (
            <div className="bg-success/10 text-success text-xs rounded-lg p-3 border border-success/20">
              Métricas pré-preenchidas pelo Claude — revise e salve.
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Início do período *</Label>
                <Input type="date" value={metricDraft.period_start as string ?? ""} onChange={(e) => setMetricDraft(d => ({ ...d, period_start: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Fim do período *</Label>
                <Input type="date" value={metricDraft.period_end as string ?? ""} onChange={(e) => setMetricDraft(d => ({ ...d, period_end: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {METRIC_FIELDS.map(f => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}{f.key === "engagement_rate" ? " (%)" : ""}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(metricDraft[f.key] as number | null) ?? ""}
                    onChange={(e) => setMetricDraft(d => ({ ...d, [f.key]: e.target.value === "" ? null : parseFloat(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={(metricDraft.notes as string | null) ?? ""} onChange={(e) => setMetricDraft(d => ({ ...d, notes: e.target.value || null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMetricDialogOpen(false); setAiParsed(null); }}>Cancelar</Button>
            <Button onClick={saveMetric} disabled={!metricDraft.period_start || !metricDraft.period_end}>
              {editingMetric ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add/edit inspiration */}
      <Dialog open={inspDialogOpen} onOpenChange={setInspDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingInsp ? "Editar Inspiração" : "Nova Inspiração"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input placeholder="Descreva o post..." value={inspDraft.title ?? ""} onChange={(e) => setInspDraft(d => ({ ...d, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={inspDraft.category ?? "geral"} onValueChange={(v) => setInspDraft(d => ({ ...d, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSPIRATION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={inspDraft.is_favorite ?? false} onChange={(e) => setInspDraft(d => ({ ...d, is_favorite: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">Favorita</span>
                </label>
              </div>
            </div>
            <div>
              <Label>URL do post original</Label>
              <Input placeholder="https://instagram.com/p/..." value={inspDraft.source_url ?? ""} onChange={(e) => setInspDraft(d => ({ ...d, source_url: e.target.value || null }))} />
            </div>
            <div>
              <Label>URL da imagem (para preview)</Label>
              <Input placeholder="https://..." value={inspDraft.image_url ?? ""} onChange={(e) => setInspDraft(d => ({ ...d, image_url: e.target.value || null }))} />
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                placeholder="ex: minimalismo, branco, arquitetura"
                value={(inspDraft.tags ?? []).join(", ")}
                onChange={(e) => setInspDraft(d => ({ ...d, tags: e.target.value ? e.target.value.split(",").map(t => t.trim()).filter(Boolean) : null }))}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={inspDraft.notes ?? ""} onChange={(e) => setInspDraft(d => ({ ...d, notes: e.target.value || null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInspDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveInspiration} disabled={!inspDraft.title?.trim()}>
              {editingInsp ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
