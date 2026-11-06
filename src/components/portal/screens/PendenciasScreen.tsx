import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  closingPendings,
  closingResolved,
  extractPendings,
  formatCurrencyBRL,
  formatDateShort,
  type ClosingUrgency,
  type PortalClosingItem,
} from "@/lib/portal";
import { SectionTitle, PendingList, type ScreenProps } from "./shared";

const URGENCY: Record<ClosingUrgency, { label: string; cls: string }> = {
  vencida: { label: "Vencida", cls: "border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)] text-white" },
  esta_semana: { label: "Esta semana", cls: "border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)]/10 text-[var(--trilha-navy)]" },
  no_prazo: { label: "No prazo", cls: "border-[var(--trilha-areia)] bg-[var(--trilha-creme)] text-[var(--trilha-navy)]" },
  sem_data: { label: "Sem data limite", cls: "border-[var(--trilha-areia)] bg-white text-[var(--trilha-navy)]/70" },
};

function ClosingRow({ item, urgency }: { item: PortalClosingItem; urgency?: ClosingUrgency }) {
  const done = !urgency;
  const facts: string[] = [];
  if (item.closing_date) facts.push(`Data limite ${formatDateShort(item.closing_date)}`);
  if (item.delivery_date) facts.push(`Chegada na obra ${formatDateShort(item.delivery_date)}`);
  if (item.delivery_time) facts.push(`Prazo de entrega ${item.delivery_time}`);
  if (item.estimated_value) facts.push(`Valor previsto ${formatCurrencyBRL(item.estimated_value)}`);
  return (
    <div className="flex gap-3 px-5 py-4" data-testid="closing-pending">
      <span
        className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border ${done ? "border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)]" : "border-[var(--trilha-navy)]/40"}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm ${done ? "text-[var(--trilha-navy)]/60 line-through" : "text-[var(--trilha-navy)]"}`}>{item.description}</p>
          {urgency && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${URGENCY[urgency].cls}`}>{URGENCY[urgency].label}</span>
          )}
        </div>
        {facts.length > 0 && <p className="text-xs tabular-nums text-[var(--trilha-navy)]/60">{facts.join(" · ")}</p>}
      </div>
    </div>
  );
}

export function PendenciasScreen({ data, onApprove, onRespond, submitting }: ScreenProps) {
  const pendings = extractPendings(data.weekly_reports, data.pending_responses);
  const open = pendings.filter((p) => p.isOpen);
  const done = pendings.filter((p) => !p.isOpen);
  const closingOpen = closingPendings(data.closing_items);
  const closingDone = closingResolved(data.closing_items);
  const openTotal = open.length + closingOpen.length;
  const doneTotal = done.length + closingDone.length;
  const nothing = pendings.length === 0 && closingOpen.length === 0 && closingDone.length === 0;
  return (
    <div data-testid="screen-pendencias">
      <SectionTitle title="Minhas pendências" subtitle="O que depende de você para o projeto seguir no prazo. A equipe da Quadra acompanha por aqui." />
      {nothing ? (
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
                <span className="trilha-eyebrow">Checklist ·</span> <span className="font-display text-base text-[var(--trilha-navy)]">Aguardando vocês ({openTotal})</span>
              </p>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
              {open.length > 0 || closingOpen.length === 0 ? (
                <PendingList items={open} empty="Nada aguardando vocês agora." onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
              ) : null}
              {closingOpen.length > 0 && (
                <div data-testid="closing-open">
                  <p className="trilha-eyebrow px-5 pt-4">Itens de fechamento</p>
                  {closingOpen.map(({ item, urgency }) => (
                    <ClosingRow key={item.id} item={item} urgency={urgency} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-[var(--trilha-areia)] bg-white/95">
            <CardHeader className="pb-2">
              <p className="text-xs">
                <span className="trilha-eyebrow">Histórico ·</span> <span className="font-display text-base text-[var(--trilha-navy)]">Já resolvidas ({doneTotal})</span>
              </p>
            </CardHeader>
            <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
              {done.length > 0 || closingDone.length === 0 ? (
                <PendingList items={done} empty="As decisões respondidas aparecem aqui." onApprove={onApprove} onRespond={onRespond} submitting={submitting} />
              ) : null}
              {closingDone.map((item) => (
                <ClosingRow key={item.id} item={item} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
