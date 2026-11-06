import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyBRL } from "@/lib/portal";
import { QuadraWatermark } from "../TrilhaBrand";
import { DetalheDisciplinas } from "../ScenariosSection";
import { SectionTitle, type ScreenProps } from "./shared";

/** Orçamento: o valor total orçado e as propostas por disciplina. A análise de cenários e a prestação de contas têm aba própria. */
export function OrcamentoScreen({ data }: ScreenProps) {
  const total = data.project.estimated_budget || 0;
  return (
    <div className="space-y-8" data-testid="screen-orcamento">
      <SectionTitle title="Orçamento" subtitle="O valor total orçado da obra e as propostas por disciplina." />
      <Card className="relative max-w-md overflow-hidden border-0 bg-[var(--trilha-navy)] text-[var(--trilha-areia)]">
        <QuadraWatermark tone="light" className="-bottom-10 -right-10 w-32" opacity={0.06} />
        <CardContent className="relative p-5">
          <p className="trilha-eyebrow">Valor total orçado</p>
          <p className="mt-1 font-display text-2xl" data-testid="orcamento-total">{formatCurrencyBRL(total)}</p>
        </CardContent>
      </Card>
      <DetalheDisciplinas data={data} />
    </div>
  );
}
