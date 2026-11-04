import { formatDateShort, groupPhotosByDate } from "@/lib/portal";
import { SectionTitle, type ScreenProps } from "./shared";

export function GaleriaScreen({ data, onOpenPhoto }: ScreenProps) {
  const groups = groupPhotosByDate(data.photos);
  return (
    <div data-testid="screen-galeria">
      <SectionTitle title="Galeria de progresso" subtitle="Fotos da obra organizadas por data, do jeito que a equipe registra a cada visita ao canteiro." />
      {groups.length === 0 && <p className="text-sm text-[var(--trilha-navy)]/60">Ainda não há fotos publicadas.</p>}
      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.date}>
            <p className="mb-3 font-display text-sm italic text-[var(--trilha-terracota)]">{g.date === "sem-data" ? "Sem data" : formatDateShort(g.date)}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {g.urls.map((url, i) => (
                <button key={i} type="button" onClick={() => onOpenPhoto(url)} className="aspect-square overflow-hidden rounded-md border border-[var(--trilha-areia)] hover:opacity-80">
                  <img src={url} alt={`Foto da obra ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
