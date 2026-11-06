import { ScenariosSection } from "../ScenariosSection";
import { SectionTitle, type ScreenProps } from "./shared";
import { analiseDeCenarios } from "@/lib/portalScenarios";

/** Análise orçamentária: os cenários que estão na mesa, o comparativo, o que consome o orçamento e a validade das propostas. */
export function AnaliseScreen({ data }: ScreenProps) {
  const vazio = analiseDeCenarios(data.quotes, data.scope_items).vazio;
  return (
    <div className="space-y-8" data-testid="screen-analise">
      <SectionTitle title="Análise orçamentária" subtitle="Os cenários que estão na mesa, o comparativo entre eles e a validade das propostas." />
      {vazio ? (
        <p className="rounded-lg border border-[var(--trilha-areia)] bg-white/95 px-5 py-4 text-sm text-[var(--trilha-navy)]/60">
          A análise de cenários aparece aqui quando a equipe tiver propostas para comparar.
        </p>
      ) : (
        <ScenariosSection data={data} />
      )}
    </div>
  );
}
