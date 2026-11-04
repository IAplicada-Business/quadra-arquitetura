import { Check, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateBR, formatWeekLabel, type PortalData, type PortalPending, type PortalTab } from "@/lib/portal";

/** Props comuns às telas da Trilha do cliente. */
export interface ScreenProps {
  data: PortalData;
  onApprove: (reportId: string, item: string) => void;
  onRespond: (reportId: string, item: string) => void;
  onOpenPhoto: (url: string) => void;
  onGoTab: (tab: PortalTab) => void;
  submitting?: boolean;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="trilha-eyebrow">{children}</p>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 max-w-3xl">
      <h2 className="font-display text-3xl text-[var(--trilha-navy)]">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-[var(--trilha-navy)]/70">{subtitle}</p>}
    </div>
  );
}

export function PendingActions({ p, onApprove, onRespond, submitting }: { p: PortalPending; onApprove: ScreenProps["onApprove"]; onRespond: ScreenProps["onRespond"]; submitting?: boolean }) {
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


export function TrailCard({ eyebrow, title, children, testId, className = "" }: { eyebrow: string; title: string; children: React.ReactNode; testId: string; className?: string }) {
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

export function PendingList({ items, empty, onApprove, onRespond, submitting }: { items: PortalPending[]; empty: string; onApprove: ScreenProps["onApprove"]; onRespond: ScreenProps["onRespond"]; submitting?: boolean }) {
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

