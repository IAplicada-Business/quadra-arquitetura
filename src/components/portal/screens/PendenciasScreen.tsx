import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { extractPendings } from "@/lib/portal";
import { SectionTitle, PendingList, type ScreenProps } from "./shared";

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
