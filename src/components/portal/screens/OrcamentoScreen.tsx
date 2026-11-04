import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrencyBRL, formatDateBR } from "@/lib/portal";
import { QuadraWatermark } from "../TrilhaBrand";
import { DetalheDisciplinas, ScenariosSection } from "../ScenariosSection";
import { SectionTitle, type ScreenProps } from "./shared";

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
