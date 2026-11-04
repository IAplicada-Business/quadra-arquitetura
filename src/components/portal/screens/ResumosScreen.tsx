import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { extractPendings, formatWeekLabel } from "@/lib/portal";
import { SectionTitle, PendingActions, type ScreenProps } from "./shared";

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

