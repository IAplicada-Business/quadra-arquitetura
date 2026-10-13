import { Check, Send } from "lucide-react";
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
import { buildPortalTrail, trailActivities, type BlockState, type HealthLevel } from "@/lib/portalTrail";

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
    <div className="mb-4">
      <h2 className="font-display text-2xl text-[var(--trilha-navy)]">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[var(--trilha-navy)]/70">{subtitle}</p>}
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
/* Trilha (tela principal) — versão simplificada                        */
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

function TrailCard({ eyebrow, title, children, testId }: { eyebrow: string; title: string; children: React.ReactNode; testId: string }) {
  return (
    <Card className="border-[var(--trilha-areia)] bg-white" data-testid={testId}>
      <CardHeader className="pb-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <CardTitle className="font-display text-xl font-medium text-[var(--trilha-navy)]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export function InicioScreen({ data, onApprove, onRespond, onGoTab, submitting }: ScreenProps) {
  const { project, tasks, weekly_reports, pending_responses } = data;
  const trail = buildPortalTrail(data);
  const progress = computeProgress(weekly_reports, tasks.length ? tasks : trailActivities(data).map((a) => ({
    id: a.id, task_name: a.name, start_date: a.start_date, end_date: a.end_date, status: a.status,
    discipline: a.discipline, color: null, progress_percentage: a.progress_percent,
  })));
  const phase = currentPhase(tasks);
  const moveDays = daysUntil(project.client_move_in_date);
  const open = extractPendings(weekly_reports, pending_responses).filter((p) => p.isOpen);
  const totalBlocks = trail.blocks.length;

  return (
    <div className="space-y-6" data-testid="screen-inicio">
      <div>
        <Eyebrow>Seu projeto está em</Eyebrow>
        <h1 className="mt-1 font-display text-3xl leading-tight text-[var(--trilha-navy)]">
          {phase ? phase.label : project.name}
          {phase && (
            <span className="font-normal italic text-[var(--trilha-terracota)]">
              {" "}
              — {phase.state === "em_execucao" ? "em execução" : phase.state === "a_iniciar" ? "a iniciar" : "concluído"}
            </span>
          )}
        </h1>
      </div>

      {/* Resumo rápido */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-0 bg-[var(--trilha-navy)] text-[var(--trilha-areia)]">
          <CardContent className="p-5">
            <p className="trilha-eyebrow">Mudança prevista</p>
            <p className="mt-2 font-display text-2xl">{project.client_move_in_date ? formatDateLong(project.client_move_in_date) : "A definir"}</p>
            <p className="text-xs opacity-80" data-testid="move-in-countdown">{describeCountdown(moveDays)}</p>
          </CardContent>
        </Card>
        <Card className="border-[var(--trilha-areia)] bg-white">
          <CardContent className="p-5">
            <p className="trilha-eyebrow">Progresso físico</p>
            <p className="mt-2 font-display text-2xl text-[var(--trilha-navy)]" data-testid="progress-value">{progress == null ? "—" : `${progress}%`}</p>
            <Progress value={progress ?? 0} className="mt-2 h-1.5 bg-[var(--trilha-areia)] [&>div]:bg-[var(--trilha-terracota)]" />
          </CardContent>
        </Card>
        <button type="button" onClick={() => onGoTab("pendencias")} className="text-left">
          <Card className={`h-full border-[var(--trilha-terracota)]/40 ${open.length ? "bg-[var(--trilha-terracota)]/10" : "bg-white"}`}>
            <CardContent className="p-5">
              <p className="trilha-eyebrow">Depende de você</p>
              <p className="mt-2 font-display text-2xl text-[var(--trilha-navy)]" data-testid="open-pendings">
                {open.length} {open.length === 1 ? "decisão" : "decisões"}
              </p>
              <p className="text-xs text-[var(--trilha-navy)]/70">{open.length ? "toque para ver" : "nada pendente agora"}</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {open.slice(0, 1).map((p) => (
        <Card key={`${p.reportId}-${p.item}`} className="border-[var(--trilha-terracota)]/50 bg-[var(--trilha-creme)]">
          <CardContent className="space-y-3 p-5">
            <p className="text-xs">
              <span className="trilha-eyebrow">Pendente ·</span> <span className="font-display text-base text-[var(--trilha-navy)]">Sua aprovação</span>
            </p>
            <p className="whitespace-pre-line text-sm text-[var(--trilha-navy)]">{p.item}</p>
            <PendingActions p={p} onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
          </CardContent>
        </Card>
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. Escopos entregues */}
        <TrailCard eyebrow="01 · Escopos entregues" title={totalBlocks ? `${trail.delivered.length} de ${totalBlocks} entregues` : "Ainda sem escopos"} testId="trail-delivered">
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

        {/* 3. Saúde do projeto */}
        <TrailCard eyebrow="03 · Saúde do projeto" title={trail.health.label} testId="trail-health">
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
      </div>

      {/* 2. Blocos de construção */}
      <TrailCard eyebrow="02 · Blocos de construção" title="Etapas da obra" testId="trail-blocks">
        {trail.blocks.length === 0 ? (
          <p className="text-sm text-[var(--trilha-navy)]/60">O cronograma da obra está sendo montado pela equipe.</p>
        ) : (
          <ol className="space-y-3">
            {trail.blocks.map((b) => (
              <li key={b.name} className="space-y-1" data-testid={`trail-block-${b.name}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-[var(--trilha-navy)]">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-[var(--trilha-navy)]/70">
                    {b.late ? "Além do prazo" : BLOCK_STATE_LABEL[b.state]}
                    {b.start && ` · ${formatDateShort(b.start)}${b.end ? ` a ${formatDateShort(b.end)}` : ""}`}
                  </span>
                </div>
                <Progress
                  value={b.progress}
                  aria-label={`Progresso de ${b.name}`}
                  className={`h-1.5 bg-[var(--trilha-areia)] ${b.state === "concluido" ? "[&>div]:bg-[var(--trilha-salvia)]" : b.late ? "[&>div]:bg-amber-500" : "[&>div]:bg-[var(--trilha-terracota)]"}`}
                />
              </li>
            ))}
          </ol>
        )}
      </TrailCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 4. Adoção */}
        <TrailCard eyebrow="04 · Adoção" title={trail.adoption.score == null ? "Sua participação" : `${trail.adoption.score}% em dia`} testId="trail-adoption">
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

        {/* 5. Próximas entregas */}
        <TrailCard eyebrow="05 · Próximas entregas" title="Próximos 60 dias e a mudança" testId="trail-upcoming">
          {trail.upcoming.length === 0 ? (
            <p className="text-sm text-[var(--trilha-navy)]/60">Nada agendado para os próximos 60 dias.</p>
          ) : (
            <ul className="divide-y divide-[var(--trilha-areia)]">
              {trail.upcoming.map((u, i) => (
                <li key={`${u.date}-${i}`} className="flex gap-4 py-2 text-sm text-[var(--trilha-navy)]">
                  <span className="w-14 shrink-0 font-display text-xs italic text-[var(--trilha-terracota)]">{formatDateShort(u.date)}</span>
                  <span className="flex-1">
                    {u.title}
                    {u.clientAction && (
                      <Badge className="ml-2 bg-[var(--trilha-terracota)] text-white text-[10px]">Depende de vocês</Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TrailCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Minhas pendências (Tela 3)                                          */
/* ------------------------------------------------------------------ */

export function PendenciasScreen({ data, onApprove, onRespond, submitting }: ScreenProps) {
  const pendings = extractPendings(data.weekly_reports, data.pending_responses);
  return (
    <div data-testid="screen-pendencias">
      <SectionTitle title="Minhas pendências" subtitle="O que depende de você para o projeto seguir no prazo. A equipe da Quadra acompanha por aqui." />
      <Card className="border-[var(--trilha-areia)] bg-white">
        <CardHeader className="pb-2">
          <p className="text-xs">
            <span className="trilha-eyebrow">Checklist ·</span> <span className="font-display text-base text-[var(--trilha-navy)]">Tarefas de vocês</span>
          </p>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
          {pendings.length === 0 && <p className="p-5 text-sm text-[var(--trilha-navy)]/60">Nenhuma pendência no momento.</p>}
          {pendings.map((p) => (
            <div key={`${p.reportId}-${p.item}`} className="flex gap-3 px-5 py-4">
              <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border ${p.isOpen ? "border-[var(--trilha-navy)]/40" : "border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)]"}`} aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <p className={`whitespace-pre-line text-sm ${p.isOpen ? "text-[var(--trilha-navy)]" : "text-[var(--trilha-navy)]/60 line-through"}`}>{p.item}</p>
                <p className="text-xs text-[var(--trilha-navy)]/60">{formatWeekLabel(p.weekStart)}</p>
                <PendingActions p={p} onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
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
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.date}>
            <p className="mb-2 font-display text-sm italic text-[var(--trilha-terracota)]">{g.date === "sem-data" ? "Sem data" : formatDateShort(g.date)}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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

  return (
    <div className="space-y-4" data-testid="screen-orcamento">
      <SectionTitle title="Orçamento" subtitle="Prestação de contas da obra: o que foi contratado, o que já foi pago e as notas dos materiais." />
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Contratado", value: contracted, dark: true },
          { label: "Pago", value: paid },
          { label: "Saldo", value: balance },
        ].map((k) => (
          <Card key={k.label} className={k.dark ? "border-0 bg-[var(--trilha-navy)] text-[var(--trilha-areia)]" : "border-[var(--trilha-areia)] bg-white"}>
            <CardContent className="p-4">
              <p className="trilha-eyebrow">{k.label}</p>
              <p className="mt-1 font-display text-lg sm:text-xl">{formatCurrencyBRL(k.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {payments.length > 0 && (
        <Card className="border-[var(--trilha-areia)] bg-white">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base font-medium">Pagamentos</CardTitle></CardHeader>
          <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
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
        <Card className="border-[var(--trilha-areia)] bg-white">
          <CardHeader className="pb-2"><CardTitle className="font-display text-base font-medium">Notas fiscais e materiais</CardTitle></CardHeader>
          <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
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
      {payments.length === 0 && invoices.length === 0 && <p className="text-sm text-[var(--trilha-navy)]/60">Ainda não há pagamentos ou notas registrados.</p>}
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
      <div className="space-y-4">
        {reports.map((r) => {
          const pending = pendings.find((p) => p.reportId === r.id);
          return (
            <Card key={r.id} className="border-[var(--trilha-areia)] bg-white">
              <CardHeader className="pb-2">
                <p className="trilha-eyebrow">{formatWeekLabel(r.week_start)}</p>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="font-display text-lg font-medium text-[var(--trilha-navy)]">Conclusão geral {r.completion_percent}%</CardTitle>
                </div>
                <Progress value={r.completion_percent} className="h-1.5 bg-[var(--trilha-areia)] [&>div]:bg-[var(--trilha-terracota)]" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="trilha-eyebrow">Resumo</p>
                  <p className="whitespace-pre-line text-sm">{r.summary}</p>
                </div>
                <div>
                  <p className="trilha-eyebrow">Próximas etapas</p>
                  <p className="whitespace-pre-line text-sm">{r.next_steps}</p>
                </div>
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
