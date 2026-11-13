import { ScenariosSection } from "../ScenariosSection";
import { SectionTitle, type ScreenProps } from "./shared";
import { analiseDeCenarios } from "@/lib/portalScenarios";

/** Análise orçamentária: os cenários que estão na mesa, o comparativo, o que consome o orçamento e a validade das propostas. */
export function AnaliseScreen({ data }: ScreenProps) {
  const vazio = analiseDeCenarios(data.quotes, data.scope_items).vazio;
  const importadas = data.analysis_imports ?? [];
  return (
    <div className="space-y-8" data-testid="screen-analise">
      <SectionTitle title="Análise orçamentária" subtitle="Os cenários que estão na mesa, o comparativo entre eles e a validade das propostas." />
      {importadas.map((a) => (
        <section key={a.id} className="space-y-2" data-testid="analise-importada">
          <h3 className="font-display text-xl text-[var(--trilha-navy)]">{a.title}</h3>
          {/* sandbox sem allow-scripts: o HTML importado só exibe, não executa */}
          <iframe title={a.title} srcDoc={a.html} sandbox="" className="h-[75vh] w-full rounded-lg border border-[var(--trilha-areia)] bg-white" />
        </section>
      ))}
      {vazio && importadas.length > 0 ? null : vazio ? (
        <p className="rounded-lg border border-[var(--trilha-areia)] bg-white/95 px-5 py-4 text-sm text-[var(--trilha-navy)]/60">
          A análise de cenários aparece aqui quando a equipe tiver propostas para comparar.
        </p>
      ) : (
        <ScenariosSection data={data} />
      )}
    </div>
  );
}
