import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrencyBRL, formatDateBR, type PortalPayment } from "@/lib/portal";
import { QuadraWatermark } from "../TrilhaBrand";
import { SectionTitle, type ScreenProps } from "./shared";

type PaymentState = "pago" | "atrasado" | "pendente";

const PAYMENT_BADGE: Record<PaymentState, { label: string; cls: string }> = {
  pago: { label: "Pago", cls: "bg-[var(--trilha-salvia)] text-white" },
  atrasado: { label: "Atrasado", cls: "bg-[var(--trilha-terracota)] text-white" },
  pendente: { label: "Pendente", cls: "border border-[var(--trilha-terracota)] bg-transparent text-[var(--trilha-terracota)]" },
};

function paymentState(p: PortalPayment, today: string): PaymentState {
  if (p.status === "pago") return "pago";
  if (p.status === "atrasado" || (p.due_date && p.due_date.slice(0, 10) < today)) return "atrasado";
  return "pendente";
}

export function PrestacaoScreen({ data }: ScreenProps) {
  const { project, payments, invoices } = data;
  const contracted = project.estimated_budget || 0;
  const paid = payments.filter((p) => p.status === "pago").reduce((s, p) => s + (p.value || 0), 0);
  const balance = contracted - paid;
  const today = new Date().toLocaleDateString("sv-SE");
  const paidPct = contracted > 0 ? Math.min(100, Math.round((paid / contracted) * 100)) : null;

  return (
    <div className="space-y-10" data-testid="screen-prestacao">
      <SectionTitle title="Prestação de contas" subtitle="O que foi contratado, o que já foi pago e o que ainda falta, com pagamentos e notas fiscais." />

      <section className="space-y-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          {/* Principal: pagamentos (ou uma linha, quando não há) */}
          <div className="order-2 min-w-0 lg:order-1" data-testid="prestacao-principal">
            {payments.length > 0 ? (
              <Card className="border-[var(--trilha-areia)] bg-white/95">
                <CardHeader className="pb-2"><CardTitle className="font-display text-base font-medium">Pagamentos</CardTitle></CardHeader>
                <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
                  {payments.map((p) => {
                    const st = paymentState(p, today);
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{p.description || "Pagamento"}</p>
                          <p className="text-xs tabular-nums text-[var(--trilha-navy)]/60">{formatDateBR(p.due_date)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-medium tabular-nums">{formatCurrencyBRL(p.value)}</p>
                          <Badge className={PAYMENT_BADGE[st].cls}>{PAYMENT_BADGE[st].label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <p className="rounded-lg border border-[var(--trilha-areia)] bg-white/95 px-5 py-4 text-sm text-[var(--trilha-navy)]/60">
                Ainda não há pagamentos registrados.
              </p>
            )}
          </div>

          {/* Lateral: resumo (Contratado / Pago / Saldo e barra) */}
          <aside className="order-1 space-y-4 lg:sticky lg:top-4 lg:order-2" data-testid="prestacao-resumo">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
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
          </aside>
        </div>

        {/* Notas e materiais: largura total, só quando existirem */}
        {invoices.length > 0 && (
          <Card className="border-[var(--trilha-areia)] bg-white/95" data-testid="prestacao-notas">
            <CardHeader className="pb-2"><CardTitle className="font-display text-base font-medium">Notas fiscais e materiais</CardTitle></CardHeader>
            <CardContent className="divide-y divide-[var(--trilha-areia)] p-0">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{inv.store_name || inv.description || "NF"}</p>
                    <p className="text-xs tabular-nums text-[var(--trilha-navy)]/60">{formatDateBR(inv.date)}</p>
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatCurrencyBRL(inv.value)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
