import { ArrowRight, ExternalLink, PlayCircle } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import {
  applyOnboardingPlaceholders,
  parseVideoUrl,
  splitHeroTitle,
  visibleSections,
  type OnboardingPlaceholders,
  type OnboardingSection,
} from "@/lib/onboarding";

interface Props {
  sections: OnboardingSection[];
  /** Nome do cliente e da obra para {cliente} e {projeto}. */
  placeholders?: OnboardingPlaceholders;
  /** Botão "Entrar no meu projeto". Sem callback, o botão não aparece. */
  onEnter?: () => void;
  enterLabel?: string;
  /** Mostra também as seções desligadas, esmaecidas (uso no editor). */
  showInactive?: boolean;
  /** Layout estreito (preview do editor): capa empilhada e passos em coluna. */
  compact?: boolean;
}

function VideoBlock({ url, title, dark }: { url: string; title: string; dark?: boolean }) {
  const v = parseVideoUrl(url);
  if (!v) return null;
  if (v.kind === "youtube" || v.kind === "vimeo" || v.kind === "drive") {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        <iframe
          src={v.src}
          title={title || "Vídeo"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }
  if (v.kind === "file") {
    return (
      <video controls preload="metadata" className="aspect-video w-full rounded-md bg-black object-cover" src={v.src}>
        Seu navegador não reproduz este vídeo. <a href={v.src}>Baixar vídeo</a>
      </video>
    );
  }
  return (
    <a
      href={v.src}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-sm underline ${dark ? "text-[var(--trilha-areia)]" : "text-[var(--trilha-terracota)]"}`}
    >
      <PlayCircle className="h-4 w-4" /> Assistir vídeo
    </a>
  );
}

function Images({ urls, title }: { urls: string[]; title: string }) {
  if (urls.length === 0) return null;
  return (
    <div className={`grid gap-2 ${urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {urls.map((url, j) => (
        <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-[var(--trilha-areia)]">
          <img src={url} alt={`${title || "Imagem"} ${j + 1}`} className="h-32 w-full object-cover" loading="lazy" />
        </a>
      ))}
    </div>
  );
}

function Cta({ s, dark }: { s: OnboardingSection; dark?: boolean }) {
  if (!s.cta_label || !s.cta_url) return null;
  return (
    <a
      href={s.cta_url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        dark
          ? "inline-flex items-center gap-2 rounded-md border border-[var(--trilha-areia)]/60 px-4 py-2 text-sm text-[var(--trilha-areia)] hover:bg-white/10"
          : "inline-flex items-center gap-2 rounded-md border border-[var(--trilha-terracota)] px-4 py-2 text-sm text-[var(--trilha-terracota)] hover:bg-[var(--trilha-terracota)]/10"
      }
    >
      {s.cta_label} <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

/**
 * Tela 0 do mockup "Trilha do Cliente": marca centralizada, capa navy
 * com vídeo de boas-vindas, passos numerados e o botão de entrar.
 * Usada no portal (/client/:token) e no preview do editor, pra ser fiel.
 */
export function OnboardingView({ sections, placeholders, onEnter, enterLabel = "Entrar no meu projeto", showInactive, compact }: Props) {
  const filled = applyOnboardingPlaceholders(sections, placeholders);
  const list = showInactive ? filled : visibleSections(filled);
  if (list.length === 0) return null;

  const [hero, ...steps] = list;
  const heroTitle = splitHeroTitle(hero.title);
  const heroHasVideo = !!hero.video_url;

  return (
    <div className={`trilha rounded-xl ${compact ? "px-4 py-6" : "px-4 py-10 sm:px-8"}`} data-testid="onboarding-view">
      <div className={`mx-auto ${compact ? "max-w-full" : "max-w-4xl"} space-y-8`}>
        <p className="text-center font-display text-2xl tracking-tight text-[var(--trilha-navy)]">
          quadra<span className="text-[var(--trilha-terracota)]">.</span>
        </p>

        {/* Capa */}
        <section
          data-testid={`onboarding-section-${hero.id}`}
          className={`rounded-lg bg-[var(--trilha-navy)] p-6 text-[var(--trilha-areia)] shadow-md sm:p-8 ${!hero.is_active ? "opacity-50" : ""}`}
        >
          <div className={`grid gap-6 ${heroHasVideo && !compact ? "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center" : ""}`}>
            {heroHasVideo && <VideoBlock url={hero.video_url!} title={hero.title} dark />}
            <div className="space-y-3">
              <p className="trilha-eyebrow">Bem-vindos ao seu espaço</p>
              {hero.title && (
                <h1 className="font-display text-2xl leading-snug sm:text-3xl">
                  <span className="font-medium">{heroTitle.lead}</span>
                  {heroTitle.rest && <span className="font-normal italic text-[var(--trilha-areia)]/90"> — {heroTitle.rest}</span>}
                </h1>
              )}
              {hero.body && (
                <p className="text-sm leading-relaxed text-[var(--trilha-areia)]/85">
                  <RichText text={hero.body} />
                </p>
              )}
              <Images urls={hero.image_urls} title={hero.title} />
              <Cta s={hero} dark />
            </div>
          </div>
        </section>

        {/* Passos numerados */}
        {steps.length > 0 && (
          <div className={`grid gap-4 ${compact ? "grid-cols-1" : steps.length === 1 ? "grid-cols-1" : steps.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {steps.map((s, i) => (
              <article
                key={s.id}
                data-testid={`onboarding-section-${s.id}`}
                className={`space-y-2 rounded-lg border border-[var(--trilha-areia)] bg-white p-5 ${!s.is_active ? "opacity-50" : ""}`}
              >
                <p className="font-display text-sm text-[var(--trilha-terracota)]">{String(i + 1).padStart(2, "0")}</p>
                {s.title && <h2 className="font-display text-lg font-medium leading-snug text-[var(--trilha-navy)]">{s.title}</h2>}
                {s.body && (
                  <p className="text-sm leading-relaxed text-[var(--trilha-navy)]/80">
                    <RichText text={s.body} />
                  </p>
                )}
                {s.video_url && <VideoBlock url={s.video_url} title={s.title} />}
                <Images urls={s.image_urls} title={s.title} />
                <Cta s={s} />
              </article>
            ))}
          </div>
        )}

        {onEnter && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={onEnter}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--trilha-navy)] px-6 py-3 text-sm font-medium text-[var(--trilha-areia)] shadow-md transition hover:opacity-90"
            >
              {enterLabel} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
