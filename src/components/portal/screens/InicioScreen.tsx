import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { computeProgress, currentPhase, daysUntil, describeCountdown, clientOpenCount, extractPendings, formatCurrencyBRL, formatDateLong, formatDateShort } from "@/lib/portal";
import { buildPortalTrail, trailActivities, type BlockState, type ConstructionBlock, type HealthLevel, type JourneyPosition } from "@/lib/portalTrail";
import { QuadraWatermark } from "../TrilhaBrand";
import { EtapaScreen } from "./EtapaScreen";
import { Eyebrow, PendingActions, TrailCard, type ScreenProps } from "./shared";

const HEALTH_STYLE: Record<HealthLevel, { dot: string; badge: string }> = {
  ok: { dot: "bg-[var(--trilha-salvia)]", badge: "bg-[var(--trilha-salvia)]/15 text-[var(--trilha-navy)] border-[var(--trilha-salvia)]" },
  atencao: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-900 border-amber-300" },
  risco: { dot: "bg-[var(--trilha-terracota)]", badge: "bg-[var(--trilha-terracota)]/15 text-[var(--trilha-navy)] border-[var(--trilha-terracota)]" },
};

const BLOCK_STATE_LABEL: Record<BlockState, string> = {
  concluido: "Concluído",
  em_andamento: "Em andamento",
  a_iniciar: "A iniciar",
};

function blockRange(b: ConstructionBlock): string {
  if (!b.start) return "";
  return `${formatDateShort(b.start)}${b.end && b.end !== b.start ? ` a ${formatDateShort(b.end)}` : ""}`;
}


type DotKind = "done" | "current" | "next";

function TimelineDot({ kind, size = "md" }: { kind: DotKind; size?: "md" | "sm" }) {
  const dim = size === "md" ? "h-6 w-6" : "h-4 w-4";
  if (kind === "done") {
    return (
      <span className={`relative z-[1] flex ${dim} shrink-0 items-center justify-center rounded-full bg-[var(--trilha-terracota)] text-white`}>
        <Check className={size === "md" ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} strokeWidth={3} />
      </span>
    );
  }
  if (kind === "current") {
    return (
      <span
        className={`relative z-[1] flex ${dim} shrink-0 items-center justify-center rounded-full border-2 border-[var(--trilha-terracota)] bg-white`}
        style={{ boxShadow: "0 0 0 4px rgba(196, 133, 106, 0.22)" }}
      >
        <span className={`${size === "md" ? "h-2.5 w-2.5" : "h-1.5 w-1.5"} rounded-full bg-[var(--trilha-terracota)]`} />
      </span>
    );
  }
  return <span className={`relative z-[1] block ${dim} shrink-0 rounded-full border-2 border-[var(--trilha-areia)] bg-[var(--trilha-creme)]`} />;
}

function dotKind(i: number, b: ConstructionBlock, journey: JourneyPosition): DotKind {
  if (b.state === "concluido") return "done";
  if (i === journey.currentIndex && !journey.finished) return "current";
  return "next";
}

/**
 * Linha do tempo horizontal da jornada (mockup, Tela 1): cada etapa da
 * obra é um ponto; o trecho percorrido fica em terracota e a mudança
 * fecha a linha. Com muitas etapas, rola na horizontal.
 */
function JourneyTimeline({ blocks, journey, moveIn }: { blocks: ConstructionBlock[]; journey: JourneyPosition; moveIn: string | null | undefined }) {
  const steps = blocks.length + (moveIn ? 1 : 0);
  const edge = 50 / steps; // centro do primeiro e do último ponto, em %
  const reached = journey.finished ? blocks.length - 1 : journey.currentIndex;
  const fill = steps > 1 ? (reached / (steps - 1)) * (100 - 2 * edge) : 0;

  const scroller = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  // Abre com a etapa atual no centro, só na horizontal (não rola a página).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const idx = journey.finished ? blocks.length - 1 : Math.max(0, journey.currentIndex);
    const item = el.querySelectorAll("li")[idx] as HTMLElement | undefined;
    if (item && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = Math.max(0, item.offsetLeft + item.offsetWidth / 2 - el.clientWidth / 2);
    }
    updateEdges();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(updateEdges);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [blocks.length, journey.currentIndex, journey.finished, updateEdges]);

  if (blocks.length === 0) return null;

  const scrollBy = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = el.scrollLeft + dir * el.clientWidth * 0.7;
    if (typeof el.scrollTo === "function") el.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    else el.scrollLeft = left;
  };

  return (
    <div className="relative">
      {edges.left && <span aria-hidden data-testid="trail-fade-left" className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-8 bg-gradient-to-r from-[var(--trilha-creme)] to-transparent" />}
      {edges.right && <span aria-hidden data-testid="trail-fade-right" className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-8 bg-gradient-to-l from-[var(--trilha-creme)] to-transparent" />}
      {edges.left && (
        <button type="button" onClick={() => scrollBy(-1)} aria-label="Etapas anteriores" className="absolute left-0 top-0 z-[3] hidden h-7 w-7 items-center justify-center rounded-full border border-[var(--trilha-areia)] bg-white shadow-sm sm:flex">
          <ChevronLeft className="h-4 w-4 text-[var(--trilha-navy)]" />
        </button>
      )}
      {edges.right && (
        <button type="button" onClick={() => scrollBy(1)} aria-label="Próximas etapas" className="absolute right-0 top-0 z-[3] hidden h-7 w-7 items-center justify-center rounded-full border border-[var(--trilha-areia)] bg-white shadow-sm sm:flex">
          <ChevronRight className="h-4 w-4 text-[var(--trilha-navy)]" />
        </button>
      )}
    <section
      ref={scroller}
      onScroll={updateEdges}
      tabIndex={0}
      aria-label="Linha do tempo da obra"
      data-testid="trail-journey"
      className="-mx-4 snap-x snap-proximity overflow-x-auto px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--trilha-terracota)] sm:mx-0 sm:px-0"
    >
      <ol className="relative flex pb-1 pt-1" style={{ minWidth: `${steps * 112}px` }}>
        <span className="absolute top-[13px] h-0.5 bg-[var(--trilha-areia)]" style={{ left: `${edge}%`, right: `${edge}%` }} aria-hidden />
        <span className="absolute top-[13px] h-0.5 bg-[var(--trilha-terracota)] transition-all" style={{ left: `${edge}%`, width: `${fill}%` }} aria-hidden />
        {blocks.map((b, i) => {
          const kind = dotKind(i, b, journey);
          return (
            <li key={b.name} className="relative flex flex-1 snap-center flex-col items-center px-1 text-center" aria-current={kind === "current" ? "step" : undefined}>
              <TimelineDot kind={kind} />
              <span className={`mt-2 text-xs leading-tight ${kind === "current" ? "font-semibold text-[var(--trilha-navy)]" : kind === "done" ? "text-[var(--trilha-navy)]/80" : "text-[var(--trilha-navy)]/55"}`}>{b.name}</span>
              {b.start && <span className="mt-0.5 text-[10px] text-[var(--trilha-navy)]/50">{formatDateShort(b.start)}</span>}
            </li>
          );
        })}
        {moveIn && (
          <li className="relative flex flex-1 snap-center flex-col items-center px-1 text-center">
            <span className="relative z-[1] flex h-6 w-6 rotate-45 items-center justify-center rounded-[4px] bg-[var(--trilha-navy)]">
              <Home className="h-3 w-3 -rotate-45 text-[var(--trilha-areia)]" />
            </span>
            <span className="mt-2 text-xs font-medium leading-tight text-[var(--trilha-navy)]">Mudança</span>
            <span className="mt-0.5 text-[10px] text-[var(--trilha-navy)]/50">{formatDateShort(moveIn)}</span>
          </li>
        )}
      </ol>
    </section>
    </div>
  );
}

/** Etapas da obra em linha do tempo vertical (mockup 1b), a atual em destaque. */
const VISIBLE_AHEAD = 4; // a atual + as próximas 3

function StageTimeline({ blocks, journey, onSelect }: { blocks: ConstructionBlock[]; journey: JourneyPosition; onSelect?: (index: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const firstOpen = blocks.findIndex((b, i) => dotKind(i, b, journey) !== "done");
  // Obra concluída ou sem etapa em aberto: mostra tudo, não há o que recolher.
  const start = firstOpen < 0 ? 0 : firstOpen;
  const end = firstOpen < 0 ? blocks.length : Math.min(blocks.length, start + VISIBLE_AHEAD);
  const hiddenBefore = expanded ? 0 : start;
  const hiddenAfter = expanded ? 0 : blocks.length - end;
  const from = expanded ? 0 : start;
  const to = expanded ? blocks.length : end;
  return (
    <div>
      {hiddenBefore > 0 && (
        <button type="button" onClick={() => setExpanded(true)} data-testid="trail-expand-done" className="mb-3 text-xs font-medium text-[var(--trilha-navy)]/70 underline underline-offset-4">
          {hiddenBefore} {hiddenBefore === 1 ? "concluída" : "concluídas"} · mostrar
        </button>
      )}
    <ol className="relative">
      <span className="absolute bottom-3 left-[7px] top-3 w-0.5 bg-[var(--trilha-areia)]" aria-hidden />
      {blocks.map((b, i) => {
        if (i < from || i >= to) return null;
        const kind = dotKind(i, b, journey);
        const status = b.late ? "Além do prazo" : BLOCK_STATE_LABEL[b.state];
        return (
          <li key={b.name} className="relative flex gap-4 pb-5 last:pb-0" data-testid={`trail-block-${b.name}`}>
            <span className="mt-0.5 block">
              <TimelineDot kind={kind} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    data-testid={`trail-block-open-${b.name}`}
                    aria-label={`Ver detalhes da etapa ${b.name}`}
                    className={`text-left text-sm underline-offset-4 hover:underline ${kind === "next" ? "text-[var(--trilha-navy)]/60" : "font-medium text-[var(--trilha-navy)]"}`}
                  >
                    {b.name}
                  </button>
                ) : (
                  <p className={`text-sm ${kind === "next" ? "text-[var(--trilha-navy)]/60" : "font-medium text-[var(--trilha-navy)]"}`}>{b.name}</p>
                )}
                <p className={`text-xs ${b.late ? "text-amber-700" : "text-[var(--trilha-navy)]/60"}`}>
                  {status}
                  {blockRange(b) && ` · ${blockRange(b)}`}
                </p>
              </div>
              {kind === "current" ? (
                <div className="mt-2 rounded-md border-l-2 border-[var(--trilha-terracota)] bg-[var(--trilha-creme)] px-3 py-2">
                  <p className="text-xs text-[var(--trilha-navy)]">
                    <span className="font-medium">Em execução agora</span> · {b.progress}% concluído
                  </p>
                  <Progress value={b.progress} aria-label={`Progresso de ${b.name}`} className="mt-2 h-1.5 bg-[var(--trilha-areia)] [&>div]:bg-[var(--trilha-terracota)]" />
                </div>
              ) : b.state === "em_andamento" ? (
                <Progress
                  value={b.progress}
                  aria-label={`Progresso de ${b.name}`}
                  className={`mt-2 h-1 bg-[var(--trilha-areia)] ${b.late ? "[&>div]:bg-amber-500" : "[&>div]:bg-[var(--trilha-terracota)]"}`}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
      {hiddenAfter > 0 && (
        <button type="button" onClick={() => setExpanded(true)} data-testid="trail-expand-all" className="mt-3 text-xs font-medium text-[var(--trilha-navy)]/70 underline underline-offset-4">
          Ver todas as etapas ({blocks.length})
        </button>
      )}
      {expanded && blocks.length > VISIBLE_AHEAD && (
        <button type="button" onClick={() => setExpanded(false)} className="mt-3 block text-xs font-medium text-[var(--trilha-navy)]/70 underline underline-offset-4">
          Recolher
        </button>
      )}
    </div>
  );
}

function ProgressRing({ value }: { value: number | null }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--trilha-areia)" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--trilha-terracota)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} />
    </svg>
  );
}

export function InicioScreen({ data, onApprove, onRespond, onGoTab, submitting }: ScreenProps) {
  const { project, tasks, weekly_reports, pending_responses, payments } = data;
  const trail = buildPortalTrail(data);
  const { blocks, journey } = trail;
  const [etapaIdx, setEtapaIdx] = useState<number | null>(null);
  const progress = computeProgress(
    weekly_reports,
    tasks.length
      ? tasks
      : trailActivities(data).map((a) => ({
          id: a.id, task_name: a.name, start_date: a.start_date, end_date: a.end_date, status: a.status,
          discipline: a.discipline, color: null, progress_percentage: a.progress_percent,
        })),
  );
  const phase = currentPhase(tasks);
  const current = journey.currentIndex >= 0 ? blocks[journey.currentIndex] : null;
  const moveDays = daysUntil(project.client_move_in_date);
  const open = extractPendings(weekly_reports, pending_responses).filter((p) => p.isOpen);
  const openCount = clientOpenCount(data);
  const nextPayment = [...(payments ?? [])]
    .filter((p) => p.status !== "pago")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))[0];
  const recentReports = [...weekly_reports].sort((a, b) => b.week_start.localeCompare(a.week_start)).slice(0, 3);

  const title = current?.name ?? phase?.label ?? project.name;
  const stateText = current
    ? journey.finished
      ? "obra concluída"
      : `etapa ${journey.currentIndex + 1} de ${journey.total}`
    : phase
      ? phase.state === "em_execucao" ? "em execução" : phase.state === "a_iniciar" ? "a iniciar" : "concluído"
      : null;
  const currentStatus = current
    ? `${current.late ? "Além do prazo" : BLOCK_STATE_LABEL[current.state]}${blockRange(current) ? ` · ${blockRange(current)}` : ""}`
    : null;

  if (etapaIdx != null && blocks[etapaIdx]) {
    return (
      <EtapaScreen
        block={blocks[etapaIdx]}
        index={etapaIdx}
        total={blocks.length}
        activities={trailActivities(data)}
        data={data}
        onBack={() => setEtapaIdx(null)}
        onApprove={onApprove}
        onRespond={onRespond}
        submitting={submitting}
      />
    );
  }

  return (
    <div className="space-y-8" data-testid="screen-inicio">
      {/* Onde estamos */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <Eyebrow>Seu projeto está em</Eyebrow>
          <h1 className="mt-1 font-display text-3xl leading-tight text-[var(--trilha-navy)] sm:text-4xl">
            {title}
            {stateText && <span className="font-normal italic text-[var(--trilha-terracota)]"> — {stateText}</span>}
          </h1>
          {currentStatus && <p className="mt-2 text-sm text-[var(--trilha-navy)]/70">{currentStatus}</p>}
        </div>
        {journey.total > 0 && (
          <p className="text-sm text-[var(--trilha-navy)]/70">
            <span className="font-display text-2xl text-[var(--trilha-navy)]">{journey.percent}%</span> da jornada concluída
          </p>
        )}
      </div>

      <JourneyTimeline blocks={blocks} journey={journey} moveIn={project.client_move_in_date} />

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-[var(--trilha-navy)] text-[var(--trilha-areia)]">
          <QuadraWatermark tone="light" className="-bottom-10 -right-10 w-32" opacity={0.06} />
          <CardContent className="relative p-5">
            <p className="trilha-eyebrow">Mudança prevista</p>
            <p className="mt-2 font-display text-2xl">{project.client_move_in_date ? formatDateLong(project.client_move_in_date) : "A definir"}</p>
            <p className="text-xs opacity-80" data-testid="move-in-countdown">{describeCountdown(moveDays)}</p>
          </CardContent>
        </Card>
        <Card className="border-[var(--trilha-areia)] bg-white/95">
          <CardContent className="flex items-center gap-4 p-5">
            <ProgressRing value={progress} />
            <div>
              <p className="trilha-eyebrow">Progresso físico</p>
              <p className="mt-1 font-display text-2xl text-[var(--trilha-navy)]" data-testid="progress-value">{progress == null ? "—" : `${progress}%`}</p>
            </div>
          </CardContent>
        </Card>
        <button type="button" onClick={() => onGoTab("pendencias")} className="text-left">
          <Card className={`h-full border-[var(--trilha-terracota)]/40 ${openCount ? "bg-[var(--trilha-terracota)]/10" : "bg-white/95"}`}>
            <CardContent className="p-5">
              <p className="trilha-eyebrow">Depende de você</p>
              <p className="mt-2 font-display text-2xl text-[var(--trilha-navy)]" data-testid="open-pendings">
                {openCount} {openCount === 1 ? "decisão" : "decisões"}
              </p>
              <p className="text-xs text-[var(--trilha-navy)]/70">{openCount ? "toque para ver" : "nada pendente agora"}</p>
            </CardContent>
          </Card>
        </button>
        <button type="button" onClick={() => onGoTab("prestacao")} className="text-left">
          <Card className="h-full border-[var(--trilha-areia)] bg-white/95">
            <CardContent className="p-5" data-testid="next-payment">
              <p className="trilha-eyebrow">Próximo pagamento</p>
              {nextPayment ? (
                <>
                  <p className="mt-2 font-display text-2xl text-[var(--trilha-navy)]">{formatCurrencyBRL(nextPayment.value)}</p>
                  <p className="text-xs text-[var(--trilha-navy)]/70">{nextPayment.due_date ? `vence ${formatDateShort(nextPayment.due_date)}` : "data a definir"}</p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-display text-2xl text-[var(--trilha-navy)]">Em dia</p>
                  <p className="text-xs text-[var(--trilha-navy)]/70">nenhuma parcela em aberto</p>
                </>
              )}
            </CardContent>
          </Card>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Coluna principal */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {open.slice(0, 1).map((p) => (
            <Card key={`${p.reportId}-${p.item}`} className="border-[var(--trilha-terracota)]/50 bg-[var(--trilha-creme)]">
              <CardContent className="space-y-3 p-5 sm:p-6">
                <p className="text-xs">
                  <span className="trilha-eyebrow">Pendente ·</span> <span className="font-display text-base text-[var(--trilha-navy)]">Sua aprovação</span>
                </p>
                <p className="whitespace-pre-line text-sm text-[var(--trilha-navy)]">{p.item}</p>
                <PendingActions p={p} onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
              </CardContent>
            </Card>
          ))}

          <TrailCard eyebrow="Linha do tempo" title="Etapas da obra" testId="trail-blocks">
            {blocks.length === 0 ? (
              <p className="text-sm text-[var(--trilha-navy)]/60">O cronograma da obra está sendo montado pela equipe.</p>
            ) : (
              <StageTimeline blocks={blocks} journey={journey} onSelect={setEtapaIdx} />
            )}
          </TrailCard>

          {recentReports.length > 0 && (
            <TrailCard eyebrow="Resumo semanal" title="Últimas atualizações" testId="trail-updates">
              <ul className="divide-y divide-[var(--trilha-areia)]">
                {recentReports.map((r) => (
                  <li key={r.id} className="flex gap-4 py-3 text-sm text-[var(--trilha-navy)] first:pt-0">
                    <span className="w-14 shrink-0 font-display text-xs italic text-[var(--trilha-terracota)]">{formatDateShort(r.week_start)}</span>
                    <span className="line-clamp-2 flex-1">{r.summary}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => onGoTab("resumos")} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--trilha-terracota)] hover:underline">
                Ver todos os resumos <ArrowRight className="h-3 w-3" />
              </button>
            </TrailCard>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          <TrailCard eyebrow="Saúde do projeto" title={trail.health.label} testId="trail-health">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-xs font-medium ${HEALTH_STYLE[trail.health.level].badge}`} data-testid="trail-health-level">
              <span className={`h-2 w-2 rounded-full ${HEALTH_STYLE[trail.health.level].dot}`} /> {trail.health.label}
            </span>
            <ul className="space-y-2">
              {trail.health.signals.map((sig) => (
                <li key={sig.key} className="flex items-start gap-2 text-sm text-[var(--trilha-navy)]">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${HEALTH_STYLE[sig.level].dot}`} aria-hidden />
                  <span>
                    <span className="font-medium">{sig.label}:</span> {sig.detail}
                  </span>
                </li>
              ))}
            </ul>
          </TrailCard>

          <TrailCard eyebrow="Próximas entregas" title="Próximos 60 dias e a mudança" testId="trail-upcoming">
            {trail.upcoming.length === 0 ? (
              <p className="text-sm text-[var(--trilha-navy)]/60">Nada agendado para os próximos 60 dias.</p>
            ) : (
              <ul className="divide-y divide-[var(--trilha-areia)]">
                {trail.upcoming.map((u, i) => (
                  <li key={`${u.date}-${i}`} className="flex gap-4 py-2 text-sm text-[var(--trilha-navy)]">
                    <span className="w-14 shrink-0 font-display text-xs italic text-[var(--trilha-terracota)]">{formatDateShort(u.date)}</span>
                    <span className="flex-1">
                      {u.title}
                      {u.clientAction && <Badge className="ml-2 bg-[var(--trilha-terracota)] text-[10px] text-white">Depende de vocês</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TrailCard>

          <TrailCard eyebrow="Escopos entregues" title={blocks.length ? `${trail.delivered.length} de ${blocks.length} entregues` : "Ainda sem escopos"} testId="trail-delivered">
            {trail.delivered.length === 0 ? (
              <p className="text-sm text-[var(--trilha-navy)]/60">Assim que a primeira etapa for concluída, ela aparece aqui.</p>
            ) : (
              <ul className="space-y-2">
                {trail.delivered.map((b) => (
                  <li key={b.name} className="flex items-center justify-between gap-3 text-sm text-[var(--trilha-navy)]">
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[var(--trilha-salvia)]" /> {b.name}
                    </span>
                    {b.end && <span className="text-xs text-[var(--trilha-navy)]/60">{formatDateShort(b.end)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </TrailCard>

          <TrailCard eyebrow="Adoção" title={trail.adoption.score == null ? "Sua participação" : `${trail.adoption.score}% em dia`} testId="trail-adoption">
            {trail.adoption.metrics.every((m) => m.total === 0) ? (
              <p className="text-sm text-[var(--trilha-navy)]/60">Quando a equipe pedir uma decisão ou um fechamento, o andamento aparece aqui.</p>
            ) : (
              <ul className="space-y-3">
                {trail.adoption.metrics.filter((m) => m.total > 0).map((m) => (
                  <li key={m.key} className="space-y-1 text-sm text-[var(--trilha-navy)]">
                    <div className="flex justify-between gap-2">
                      <span>{m.label}</span>
                      <span className="font-medium tabular-nums">{m.done} de {m.total}</span>
                    </div>
                    <Progress value={(m.done / m.total) * 100} className="h-1.5 bg-[var(--trilha-areia)] [&>div]:bg-[var(--trilha-navy)]" />
                  </li>
                ))}
              </ul>
            )}
            {trail.adoption.avgResponseDays != null && (
              <p className="text-xs text-[var(--trilha-navy)]/70">
                Vocês respondem em média em {trail.adoption.avgResponseDays.toLocaleString("pt-BR")} {trail.adoption.avgResponseDays === 1 ? "dia" : "dias"}.
              </p>
            )}
          </TrailCard>
        </div>
      </div>
    </div>
  );
}

