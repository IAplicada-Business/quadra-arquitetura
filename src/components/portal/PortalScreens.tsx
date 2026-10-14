import { ArrowRight, Check, Home, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  computeProgress,
  currentPhase,
  daysUntil,
  describeCountdown,
  extractPendings,
  formatCurrencyBRL,
  formatDateBR,
  formatDateLong,
  formatDateShort,
  formatWeekLabel,
  groupPhotosByDate,
  type PortalData,
  type PortalPending,
  type PortalTab,
} from "@/lib/portal";
import {
  buildPortalTrail,
  trailActivities,
  type BlockState,
  type ConstructionBlock,
  type HealthLevel,
  type JourneyPosition,
} from "@/lib/portalTrail";
import { QuadraWatermark } from "./TrilhaBrand";
import { DetalheDisciplinas, ScenariosSection } from "./ScenariosSection";

interface ScreenProps {
  data: PortalData;
  onApprove: (reportId: string, item: string) => void;
  onRespond: (reportId: string, item: string) => void;
  onOpenPhoto: (url: string) => void;
  onGoTab: (tab: PortalTab) => void;
  submitting?: boolean;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="trilha-eyebrow">{children}</p>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 max-w-3xl">
      <h2 className="font-display text-3xl text-[var(--trilha-navy)]">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-[var(--trilha-navy)]/70">{subtitle}</p>}
    </div>
  );
}

function PendingActions({ p, onApprove, onRespond, submitting }: { p: PortalPending; onApprove: ScreenProps["onApprove"]; onRespond: ScreenProps["onRespond"]; submitting?: boolean }) {
  if (p.response) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--trilha-navy)]/70">
        <Badge className={p.response.status === "aprovado" ? "bg-[var(--trilha-salvia)] text-white" : "bg-[var(--trilha-areia)] text-[var(--trilha-navy)]"}>
          {p.response.status === "aprovado" ? "Aprovado" : "Respondido"}
        </Badge>
        {p.response.client_name && <span>por {p.response.client_name}</span>}
        {p.response.responded_at && <span>em {formatDateBR(p.response.responded_at)}</span>}
        {p.response.response_text && <span className="basis-full text-sm text-[var(--trilha-navy)]">{p.response.response_text}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" className="bg-[var(--trilha-navy)] text-[var(--trilha-areia)] hover:opacity-90" disabled={submitting} onClick={() => onApprove(p.reportId, p.item)}>
        <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
      </Button>
      <Button size="sm" variant="outline" className="border-[var(--trilha-navy)] text-[var(--trilha-navy)]" disabled={submitting} onClick={() => onRespond(p.reportId, p.item)}>
        <Send className="mr-1 h-3.5 w-3.5" /> Responder
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trilha (tela principal)                                             */
/* ------------------------------------------------------------------ */

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

function TrailCard({ eyebrow, title, children, testId, className = "" }: { eyebrow: string; title: string; children: React.ReactNode; testId: string; className?: string }) {
  return (
    <Card className={`border-[var(--trilha-areia)] bg-white/95 ${className}`} data-testid={testId}>
      <CardHeader className="pb-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <CardTitle className="font-display text-xl font-medium text-[var(--trilha-navy)]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
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
  if (blocks.length === 0) return null;
  const edge = 50 / steps; // centro do primeiro e do último ponto, em %
  const reached = journey.finished ? blocks.length - 1 : journey.currentIndex;
  const fill = steps > 1 ? (reached / (steps - 1)) * (100 - 2 * edge) : 0;

  return (
    <section aria-label="Linha do tempo da obra" data-testid="trail-journey" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ol className="relative flex pb-1 pt-1" style={{ minWidth: `${steps * 112}px` }}>
        <span className="absolute top-[13px] h-0.5 bg-[var(--trilha-areia)]" style={{ left: `${edge}%`, right: `${edge}%` }} aria-hidden />
        <span className="absolute top-[13px] h-0.5 bg-[var(--trilha-terracota)] transition-all" style={{ left: `${edge}%`, width: `${fill}%` }} aria-hidden />
        {blocks.map((b, i) => {
          const kind = dotKind(i, b, journey);
          return (
            <li key={b.name} className="relative flex flex-1 flex-col items-center px-1 text-center" aria-current={kind === "current" ? "step" : undefined}>
              <TimelineDot kind={kind} />
              <span className={`mt-2 text-xs leading-tight ${kind === "current" ? "font-semibold text-[var(--trilha-navy)]" : kind === "done" ? "text-[var(--trilha-navy)]/80" : "text-[var(--trilha-navy)]/55"}`}>{b.name}</span>
              {b.start && <span className="mt-0.5 text-[10px] text-[var(--trilha-navy)]/50">{formatDateShort(b.start)}</span>}
            </li>
          );
        })}
        {moveIn && (
          <li className="relative flex flex-1 flex-col items-center px-1 text-center">
            <span className="relative z-[1] flex h-6 w-6 rotate-45 items-center justify-center rounded-[4px] bg-[var(--trilha-navy)]">
              <Home className="h-3 w-3 -rotate-45 text-[var(--trilha-areia)]" />
            </span>
            <span className="mt-2 text-xs font-medium leading-tight text-[var(--trilha-navy)]">Mudança</span>
            <span className="mt-0.5 text-[10px] text-[var(--trilha-navy)]/50">{formatDateShort(moveIn)}</span>
          </li>
        )}
      </ol>
    </section>
  );
}

/** Etapas da obra em linha do tempo vertical (mockup 1b), a atual em destaque. */
function StageTimeline({ blocks, journey }: { blocks: ConstructionBlock[]; journey: JourneyPosition }) {
  return (
    <ol className="relative">
      <span className="absolute bottom-3 left-[7px] top-3 w-0.5 bg-[var(--trilha-areia)]" aria-hidden />
      {blocks.map((b, i) => {
        const kind = dotKind(i, b, journey);
        const status = b.late ? "Além do prazo" : BLOCK_STATE_LABEL[b.state];
        return (
          <li key={b.name} className="relative flex gap-4 pb-5 last:pb-0" data-testid={`trail-block-${b.name}`}>
            <span className="mt-0.5 block">
              <TimelineDot kind={kind} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className={`text-sm ${kind === "next" ? "text-[var(--trilha-navy)]/60" : "font-medium text-[var(--trilha-navy)]"}`}>{b.name}</p>
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
          <Card className={`h-full border-[var(--trilha-terracota)]/40 ${open.length ? "bg-[var(--trilha-terracota)]/10" : "bg-white/95"}`}>
            <CardContent className="p-5">
              <p className="trilha-eyebrow">Depende de você</p>
              <p className="mt-2 font-display text-2xl text-[var(--trilha-navy)]" data-testid="open-pendings">
                {open.length} {open.length === 1 ? "decisão" : "decisões"}
              </p>
              <p className="text-xs text-[var(--trilha-navy)]/70">{open.length ? "toque para ver" : "nada pendente agora"}</p>
            </CardContent>
          </Card>
        </button>
        <button type="button" onClick={() => onGoTab("orcamento")} className="text-left">
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
              <StageTimeline blocks={blocks} journey={journey} />
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

/* ------------------------------------------------------------------ */
/* Minhas pendências (Tela 3)                                          */
/* ------------------------------------------------------------------ */

function PendingList({ items, empty, onApprove, onRespond, submitting }: { items: PortalPending[]; empty: string; onApprove: ScreenProps["onApprove"]; onRespond: ScreenProps["onRespond"]; submitting?: boolean }) {
  if (items.length === 0) return <p className="p-5 text-sm text-[var(--trilha-navy)]/60">{empty}</p>;
  return (
    <>
      {items.map((p) => (
        <div key={`${p.reportId}-${p.item}`} className="flex gap-3 px-5 py-4">
          <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border ${p.isOpen ? "border-[var(--trilha-navy)]/40" : "border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)]"}`} aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className={`whitespace-pre-line text-sm ${p.isOpen ? "text-[var(--trilha-navy)]" : "text-[var(--trilha-navy)]/60 line-through"}`}>{p.item}</p>
            <p className="text-xs text-[var(--trilha-navy)]/60">{formatWeekLabel(p.weekStart)}</p>
            <PendingActions p={p} onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
          </div>
        </div>
      ))}
    </>
  );
}

export function PendenciasScreen({ data, onApprove, onRespond, submitting }: ScreenProps) {
  const pendings = extractPendings(data.weekly_reports, data.pending_responses);
  const open = pendings.filter((p) => p.isOpen);
  const done = pendings.filter((p) => !p.isOpen);
  return (
    <div data-testid="screen-pendencias">
      <SectionTitle title="Minhas pendências" subtitle="O que depende de você para o projeto seguir no prazo. A equipe da Quadra acompanha por aqui." />
      {pendings.length === 0 ? (
        <Card className="border-[var(--trilha-areia)] bg-white/95">
          <CardContent className="p-0">
            <p className="p-5 text-sm text-[var(--trilha-navy)]/60">Nenhuma pendência no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="border-[var(--trilha-terracota)]/40 bg-white/95">
            <CardHeader className="pb-2">
              <p className="text-xs">
                <span className="trilha-eyebrow">Checklist ·</span> <span className="font-display text-base text-[var(--trilha-navy)]">Aguardando vocês ({open.length})</span>
              </p>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
              <PendingList items={open} empty="Nada aguardando vocês agora." onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
            </CardContent>
          </Card>
          <Card className="border-[var(--trilha-areia)] bg-white/95">
            <CardHeader className="pb-2">
              <p className="text-xs">
                <span className="trilha-eyebrow">Histórico ·</span> <span className="font-display text-base text-[var(--trilha-navy)]">Já resolvidas ({done.length})</span>
              </p>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
              <PendingList items={done} empty="As decisões respondidas aparecem aqui." onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Galeria (Tela 4)                                                    */
/* ------------------------------------------------------------------ */

export function GaleriaScreen({ data, onOpenPhoto }: ScreenProps) {
  const groups = groupPhotosByDate(data.photos);
  return (
    <div data-testid="screen-galeria">
      <SectionTitle title="Galeria de progresso" subtitle="Fotos da obra organizadas por data, do jeito que a equipe registra a cada visita ao canteiro." />
      {groups.length === 0 && <p className="text-sm text-[var(--trilha-navy)]/60">Ainda não há fotos publicadas.</p>}
      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.date}>
            <p className="mb-3 font-display text-sm italic text-[var(--trilha-terracota)]">{g.date === "sem-data" ? "Sem data" : formatDateShort(g.date)}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {g.urls.map((url, i) => (
                <button key={i} type="button" onClick={() => onOpenPhoto(url)} className="aspect-square overflow-hidden rounded-md border border-[var(--trilha-areia)] hover:opacity-80">
                  <img src={url} alt={`Foto da obra ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Orçamento / prestação de contas (Tela 5)                            */
/* ------------------------------------------------------------------ */

export function OrcamentoScreen({ data }: ScreenProps) {
  const { project, payments, invoices } = data;
  const contracted = project.estimated_budget || 0;
  const paid = payments.filter((p) => p.status === "pago").reduce((s, p) => s + (p.value || 0), 0);
  const balance = contracted - paid;
  const paidPct = contracted > 0 ? Math.min(100, Math.round((paid / contracted) * 100)) : null;

  return (
    <div className="space-y-10" data-testid="screen-orcamento">
      <SectionTitle title="Orçamento" subtitle="Os cenários que estão na mesa e a prestação de contas da obra." />

      {/* Cenários primeiro: a decisão que ainda está aberta vem antes do
          histórico do que já foi pago. */}
      <ScenariosSection data={data} />
      <DetalheDisciplinas data={data} />

      <section className="space-y-6">
        <h3 className="font-display text-2xl text-[var(--trilha-navy)]">Prestação de contas</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Contratado", value: contracted, dark: true },
          { label: "Pago", value: paid },
          { label: "Saldo", value: balance },
        ].map((k) => (
          <Card key={k.label} className={k.dark ? "relative overflow-hidden border-0 bg-[var(--trilha-navy)] text-[var(--trilha-areia)]" : "border-[var(--trilha-areia)] bg-white/95"}>
            {k.dark && <QuadraWatermark tone="light" className="-bottom-10 -right-10 w-32" opacity={0.06} />}
            <CardContent className="relative p-5">
              <p className="trilha-eyebrow">{k.label}</p>
              <p className="mt-1 font-display text-xl sm:text-2xl">{formatCurrencyBRL(k.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {paidPct != null && (
        <div className="rounded-lg border border-[var(--trilha-areia)] bg-white/95 p-5">
          <div className="mb-2 flex justify-between text-sm text-[var(--trilha-navy)]">
            <span>Pago até agora</span>
            <span className="font-medium">{paidPct}% do contratado</span>
          </div>
          <Progress value={paidPct} className="h-2 bg-[var(--trilha-areia)] [&>div]:bg-[var(--trilha-terracota)]" />
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {payments.length > 0 && (
          <Card className="border-[var(--trilha-areia)] bg-white/95">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base font-medium">Pagamentos</CardTitle></CardHeader>
            <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium">{p.description || "Pagamento"}</p>
                    <p className="text-xs text-[var(--trilha-navy)]/60">{formatDateBR(p.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrencyBRL(p.value)}</p>
                    <Badge className={p.status === "pago" ? "bg-[var(--trilha-salvia)] text-white" : "border border-[var(--trilha-terracota)] bg-transparent text-[var(--trilha-terracota)]"}>
                      {p.status === "pago" ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {invoices.length > 0 && (
          <Card className="border-[var(--trilha-areia)] bg-white/95">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base font-medium">Notas fiscais e materiais</CardTitle></CardHeader>
            <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium">{inv.store_name || inv.description || "NF"}</p>
                    <p className="text-xs text-[var(--trilha-navy)]/60">{formatDateBR(inv.date)}</p>
                  </div>
                  <p className="font-medium">{formatCurrencyBRL(inv.value)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
        {payments.length === 0 && invoices.length === 0 && <p className="text-sm text-[var(--trilha-navy)]/60">Ainda não há pagamentos ou notas registrados.</p>}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resumo semanal (Tela 7)                                             */
/* ------------------------------------------------------------------ */

export function ResumosScreen({ data, onApprove, onRespond, onOpenPhoto, submitting }: ScreenProps) {
  const reports = [...data.weekly_reports].sort((a, b) => b.week_start.localeCompare(a.week_start));
  const pendings = extractPendings(data.weekly_reports, data.pending_responses);

  return (
    <div data-testid="screen-resumos">
      <SectionTitle title="Resumo semanal" subtitle="A cada semana a equipe fecha esse resumo: o que andou, os próximos passos e o que depende de você." />
      {reports.length === 0 && <p className="text-sm text-[var(--trilha-navy)]/60">O primeiro resumo semanal ainda não foi publicado.</p>}
      <div className="space-y-6">
        {reports.map((r) => {
          const pending = pendings.find((p) => p.reportId === r.id);
          const hasSide = (r.photo_urls?.length ?? 0) > 0 || !!pending;
          return (
            <Card key={r.id} className="border-[var(--trilha-areia)] bg-white/95">
              <CardHeader className="pb-2">
                <p className="trilha-eyebrow">{formatWeekLabel(r.week_start)}</p>
                <CardTitle className="font-display text-lg font-medium text-[var(--trilha-navy)]">Conclusão geral {r.completion_percent}%</CardTitle>
                <Progress value={r.completion_percent} className="h-1.5 bg-[var(--trilha-areia)] [&>div]:bg-[var(--trilha-terracota)]" />
              </CardHeader>
              <CardContent className={`grid gap-6 ${hasSide ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]" : ""}`}>
                <div className="space-y-4">
                  <div>
                    <p className="trilha-eyebrow">Resumo</p>
                    <p className="mt-1 whitespace-pre-line text-sm">{r.summary}</p>
                  </div>
                  <div>
                    <p className="trilha-eyebrow">Próximas etapas</p>
                    <p className="mt-1 whitespace-pre-line text-sm">{r.next_steps}</p>
                  </div>
                </div>
                {hasSide && (
                  <div className="space-y-4">
                    {r.photo_urls?.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {r.photo_urls.slice(0, 6).map((url, i) => (
                          <button key={i} type="button" onClick={() => onOpenPhoto(url)} className="aspect-square overflow-hidden rounded-md border border-[var(--trilha-areia)] hover:opacity-80">
                            <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                    {pending && (
                      <div className="space-y-3 rounded-md border-l-4 border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)]/10 p-3">
                        <p className="trilha-eyebrow">Precisamos de você</p>
                        <p className="whitespace-pre-line text-sm">{pending.item}</p>
                        <PendingActions p={pending} onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
