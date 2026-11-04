import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { extractPendings, formatDateBR, formatDateShort, formatWeekLabel, type PortalActivity, type PortalData } from "@/lib/portal";
import { activitiesOfBlock, type ConstructionBlock } from "@/lib/portalTrail";
import { Eyebrow, PendingActions, type ScreenProps } from "./shared";

const STATE_LABEL: Record<ConstructionBlock["state"], string> = {
  concluido: "Concluída",
  em_andamento: "Em andamento",
  a_iniciar: "A iniciar",
};

const isDone = (a: PortalActivity) => ["concluida", "concluido", "executado"].includes(a.status ?? "");

interface Props extends Pick<ScreenProps, "onApprove" | "onRespond" | "submitting"> {
  block: ConstructionBlock;
  index: number;
  total: number;
  activities: PortalActivity[];
  data: Pick<PortalData, "weekly_reports" | "pending_responses">;
  onBack: () => void;
}

/**
 * Etapa (Tela 2 do mockup): detalhe de uma etapa da trilha: progresso
 * físico, atividades, diário (resumos semanais) e pendências em aberto.
 */
export function EtapaScreen({ block, index, total, activities, data, onBack, onApprove, onRespond, submitting }: Props) {
  const acts = activitiesOfBlock(block.name, activities);
  const diary = [...data.weekly_reports].sort((a, b) => b.week_start.localeCompare(a.week_start)).slice(0, 4);
  const open = extractPendings(data.weekly_reports, data.pending_responses).filter((p) => p.isOpen);
  const range = block.start ? `${formatDateShort(block.start)}${block.end && block.end !== block.start ? ` a ${formatDateShort(block.end)}` : ""}` : null;

  return (
    <div className="space-y-6" data-testid="screen-etapa">
      <div>
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-xs text-[var(--trilha-navy)]/70 hover:text-[var(--trilha-navy)]" data-testid="etapa-voltar">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Trilha do projeto <span aria-hidden>/</span>
          <strong className="font-medium text-[var(--trilha-terracota)]">{block.name}</strong>
        </button>
        <Eyebrow>
          Etapa {index + 1} de {total}
        </Eyebrow>
        <h1 className="mt-1 font-display text-3xl text-[var(--trilha-navy)]">{block.name}</h1>
        <p className="mt-2 text-sm text-[var(--trilha-navy)]/70">
          {block.late ? "Além do prazo" : STATE_LABEL[block.state]}
          {range && ` · ${range}`}
        </p>
      </div>

      <Card className="border-[var(--trilha-areia)] bg-white/95">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-baseline justify-between">
            <p className="trilha-eyebrow">Progresso físico da etapa</p>
            <p className="font-display text-2xl text-[var(--trilha-navy)]" data-testid="etapa-progresso">
              {block.progress}%
            </p>
          </div>
          <Progress value={block.progress} aria-label={`Progresso de ${block.name}`} className="h-2 bg-[var(--trilha-areia)] [&>div]:bg-[var(--trilha-terracota)]" />
          <p className="text-xs text-[var(--trilha-navy)]/70">
            {block.done} de {block.total} {block.total === 1 ? "atividade concluída" : "atividades concluídas"}
          </p>
        </CardContent>
      </Card>

      <section aria-labelledby="etapa-atividades">
        <h2 id="etapa-atividades" className="mb-2 font-display text-lg text-[var(--trilha-navy)]">
          O que acontece nesta etapa
        </h2>
        {acts.length === 0 ? (
          <p className="text-sm text-[var(--trilha-navy)]/60">As atividades desta etapa ainda estão sendo definidas.</p>
        ) : (
          <ul className="divide-y divide-[var(--trilha-areia)] rounded-md border border-[var(--trilha-areia)] bg-white/95">
            {acts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3" data-testid={`etapa-atividade-${a.id}`}>
                <div className="min-w-0">
                  <p className={`text-sm ${isDone(a) ? "text-[var(--trilha-navy)]/60 line-through" : "text-[var(--trilha-navy)]"}`}>{a.name}</p>
                  {a.start_date && (
                    <p className="text-[11px] text-[var(--trilha-navy)]/60">
                      {formatDateShort(a.start_date)}
                      {a.end_date && a.end_date !== a.start_date ? ` a ${formatDateShort(a.end_date)}` : ""}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ${
                    isDone(a) ? "bg-[var(--trilha-salvia)]/20 text-[var(--trilha-navy)]" : a.status === "em_andamento" ? "bg-[var(--trilha-terracota)] text-white" : "bg-[var(--trilha-areia)] text-[var(--trilha-navy)]"
                  }`}
                >
                  {isDone(a) ? "Concluída" : a.status === "em_andamento" ? "Em andamento" : "A iniciar"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="etapa-diario">
        <h2 id="etapa-diario" className="mb-2 font-display text-lg text-[var(--trilha-navy)]">
          Diário de obra
        </h2>
        {diary.length === 0 ? (
          <p className="text-sm text-[var(--trilha-navy)]/60">O primeiro resumo semanal ainda não foi publicado.</p>
        ) : (
          <ul className="space-y-2">
            {diary.map((r) => (
              <li key={r.id} className="rounded-md border border-[var(--trilha-areia)] bg-white/95 p-4">
                <p className="text-[11px] uppercase tracking-wide text-[var(--trilha-terracota)]">{formatWeekLabel(r.week_start)}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-[var(--trilha-navy)]">{r.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="etapa-pendencias">
        <h2 id="etapa-pendencias" className="mb-2 font-display text-lg text-[var(--trilha-navy)]">
          Pendências
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-[var(--trilha-navy)]/60">Nada aguardando você agora.</p>
        ) : (
          <div className="space-y-3">
            {open.map((p) => (
              <Card key={`${p.reportId}-${p.item}`} className="border-[var(--trilha-terracota)]/40 bg-[var(--trilha-terracota)]/10">
                <CardContent className="space-y-3 p-4">
                  <p className="whitespace-pre-line text-sm text-[var(--trilha-navy)]">{p.item}</p>
                  <p className="text-[11px] text-[var(--trilha-navy)]/60">Resumo de {formatDateBR(p.weekStart)}</p>
                  <PendingActions p={p} onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
