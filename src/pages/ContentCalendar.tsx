import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useContentCalendar } from "@/hooks/useContentCalendar";
import { useContentPosts, TYPE_COLORS, STATUS_LABELS } from "@/hooks/useContentPosts";
import { useContentSeries } from "@/hooks/useContentSeries";
import ContentPostSheet from "@/components/content/ContentPostSheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageTitle } from "@/components/layout/PageTitle";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function ContentCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const { data: calendarPosts = [], isLoading } = useContentCalendar(month, year);
  const { posts: allPosts, create, update } = useContentPosts();
  const { series } = useContentSeries();
  const isMobile = useIsMobile();

  const [platformFilter, setPlatformFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  const filteredPosts = useMemo(() => {
    if (platformFilter === "all") return calendarPosts;
    return calendarPosts.filter((p) => p.platform === platformFilter);
  }, [calendarPosts, platformFilter]);

  const postsByDate = useMemo(() => {
    const map: Record<string, typeof filteredPosts> = {};
    filteredPosts.forEach((p) => {
      if (p.scheduled_date) {
        const key = p.scheduled_date;
        if (!map[key]) map[key] = [];
        map[key].push(p);
      }
    });
    return map;
  }, [filteredPosts]);

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // KPIs
  const daysInMonth = monthEnd.getDate();
  const daysWithContent = new Set(filteredPosts.map((p) => p.scheduled_date)).size;
  const fillPercent = Math.round((daysWithContent / daysInMonth) * 100);

  // Upcoming posts
  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = allPosts
    .filter((p) => p.scheduled_date && p.scheduled_date >= today && p.status !== "publicado")
    .sort((a, b) => (a.scheduled_date! > b.scheduled_date! ? 1 : -1))
    .slice(0, 7);

  const handleDayClick = (d: Date) => {
    setSelectedPost(null);
    setDefaultDate(format(d, "yyyy-MM-dd"));
    setSheetOpen(true);
  };

  const handlePillClick = (post: any) => {
    setSelectedPost(post);
    setDefaultDate(undefined);
    setSheetOpen(true);
  };

  const handleSave = (values: any) => {
    if (values.id) {
      update.mutate(values);
    } else {
      create.mutate(values);
    }
  };

  const handleSuggestIdeas = async () => {
    setGeneratingIdeas(true);
    setIdeasOpen(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Não autenticado");
      const history = allPosts.slice(0, 10).map((p) => ({ title: p.title, type: p.type }));
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-ai-assistant`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest_ideas", posts_history: history, monthly_objective: "aumentar engajamento" }),
      });
      if (!res.ok) throw new Error("Erro");
      const result = await res.json();
      setIdeas(Array.isArray(result) ? result : []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingIdeas(false);
    }
  };

  return (
    <div className="space-y-6 p-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle title="Calendário" description="Planeje seu conteúdo mês a mês" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSuggestIdeas}>
            <Sparkles className="h-4 w-4 mr-1" /> Ideias
          </Button>
          <Button size="sm" onClick={() => { setSelectedPost(null); setDefaultDate(undefined); setSheetOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Post
          </Button>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-medium min-w-[160px] text-center capitalize">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calendar Grid - full width */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden min-w-[420px]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{w}</div>
          ))}
          {weeks.flat().map((d, i) => {
            const key = format(d, "yyyy-MM-dd");
            const dayPosts = postsByDate[key] || [];
            const isCurrentMonth = isSameMonth(d, currentDate);
            const isToday = isSameDay(d, new Date());
            return (
              <div
                key={i}
                className={`bg-card min-h-[80px] p-1 cursor-pointer hover:bg-accent/30 transition-colors ${!isCurrentMonth ? "opacity-40" : ""} ${isToday ? "ring-1 ring-primary ring-inset" : ""}`}
                onClick={() => { if (dayPosts.length === 0) handleDayClick(d); }}
              >
                <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {format(d, "d")}
                </span>
                <div className="space-y-0.5 mt-0.5">
                  {dayPosts.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="text-[10px] px-1 py-0.5 rounded truncate text-white cursor-pointer"
                      style={{ background: TYPE_COLORS[p.type] || "#666" }}
                      onClick={(e) => { e.stopPropagation(); handlePillClick(p); }}
                      title={p.title}
                    >
                      {p.title.slice(0, 20)}
                    </div>
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{dayPosts.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{daysWithContent}/{daysInMonth} dias com conteúdo</span>
            <span>{fillPercent}%</span>
          </div>
          <Progress value={fillPercent} className="h-2" />
        </div>
      </div>

      {/* Upcoming posts - below calendar */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Próximos 7 posts</h3>
        {upcoming.length === 0 && <p className="text-xs text-muted-foreground">Nenhum post agendado</p>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {upcoming.map((p) => (
            <div key={p.id} className="border rounded-lg p-2 space-y-1 cursor-pointer hover:bg-accent/30" onClick={() => handlePillClick(p)}>
              <div className="flex items-center gap-1">
                <Badge className="text-[10px] px-1 py-0 text-white" style={{ background: TYPE_COLORS[p.type] || "#666" }}>
                  {p.type}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1 py-0">{STATUS_LABELS[p.status]}</Badge>
              </div>
              <p className="text-xs font-medium">{p.title}</p>
              {p.scheduled_date && (
                <p className="text-[10px] text-muted-foreground">{format(new Date(p.scheduled_date + "T12:00:00"), "dd/MM")}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <ContentPostSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        post={selectedPost}
        series={series}
        onSave={handleSave}
        defaultDate={defaultDate}
      />

      {/* Ideas Dialog */}
      <Dialog open={ideasOpen} onOpenChange={setIdeasOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sugestões de Conteúdo</DialogTitle>
          </DialogHeader>
          {generatingIdeas ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {ideas.map((idea, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] text-white" style={{ background: TYPE_COLORS[idea.type] || "#666" }}>
                      {idea.type}
                    </Badge>
                    <span className="text-sm font-medium">{idea.title}</span>
                  </div>
                  {idea.hook_suggestion && <p className="text-xs italic text-muted-foreground">"{idea.hook_suggestion}"</p>}
                  {idea.why_it_works && <p className="text-xs text-muted-foreground">{idea.why_it_works}</p>}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => {
                      setSelectedPost(null);
                      setDefaultDate(undefined);
                      setSheetOpen(true);
                      setIdeasOpen(false);
                    }}
                  >
                    Criar post
                  </Button>
                </div>
              ))}
              {ideas.length === 0 && !generatingIdeas && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sugestão gerada ainda.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
