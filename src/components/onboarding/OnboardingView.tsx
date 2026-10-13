import { ArrowRight, ExternalLink, PlayCircle } from "lucide-react";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import {
  applyOnboardingPlaceholders,
  parseVideoUrl,
  sectionLayout,
  splitHeroTitle,
  visibleSections,
  type OnboardingLayout,
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

type Block =
  | { kind: "single"; layout: Exclude<OnboardingLayout, "card">; section: OnboardingSection; first: boolean }
  | { kind: "cards"; items: { section: OnboardingSection; number: number }[] };

/** Agrupa cards seguidos numa grade; as demais seções ocupam a largura toda. */
function toBlocks(list: OnboardingSection[]): Block[] {
  const blocks: Block[] = [];
  let n = 0;
  list.forEach((section, i) => {
    const layout = sectionLayout(section, i);
    if (layout === "card") {
      const last = blocks[blocks.length - 1];
      const item = { section, number: ++n };
      if (last?.kind === "cards") last.items.push(item);
      else blocks.push({ kind: "cards", items: [item] });
    } else {
      blocks.push({ kind: "single", layout, section, first: i === 0 });
    }
  });
  return blocks;
}

const dim = (s: OnboardingSection) => (!s.is_active ? "opacity-50" : "");

function Body({ s, className }: { s: OnboardingSection; className: string }) {
  if (!s.body) return null;
  return (
    <p className={className}>
      <RichText text={s.body} />
    </p>
  );
}

function CapaBlock({ s, first, compact }: { s: OnboardingSection; first: boolean; compact?: boolean }) {
  const title = splitHeroTitle(s.title);
  const hasVideo = !!s.video_url;
  return (
    <section data-testid={`onboarding-section-${s.id}`} data-layout="capa" className={`rounded-lg bg-[var(--trilha-navy)] p-6 text-[var(--trilha-areia)] shadow-md sm:p-8 ${dim(s)}`}>
      <div className={`grid gap-6 ${hasVideo && !compact ? "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-center" : ""}`}>
        {hasVideo && <VideoBlock url={s.video_url!} title={s.title} dark />}
        <div className="space-y-3">
          {first && <p className="trilha-eyebrow">Bem-vindos ao seu espaço</p>}
          {s.title && (
            <h1 className="font-display text-2xl leading-snug sm:text-3xl">
              <span className="font-medium">{title.lead}</span>
              {title.rest && <span className="font-normal italic text-[var(--trilha-areia)]/90"> — {title.rest}</span>}
            </h1>
          )}
          <Body s={s} className="text-sm leading-relaxed text-[var(--trilha-areia)]/85" />
          <Images urls={s.image_urls} title={s.title} />
          <Cta s={s} dark />
        </div>
      </div>
    </section>
  );
}

function CardsBlock({ items, compact }: { items: { section: OnboardingSection; number: number }[]; compact?: boolean }) {
  const cols = compact || items.length === 1 ? "grid-cols-1" : items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-4 ${cols}`}>
      {items.map(({ section: s, number }) => (
        <article key={s.id} data-testid={`onboarding-section-${s.id}`} data-layout="card" className={`space-y-2 rounded-lg border border-[var(--trilha-areia)] bg-white p-5 ${dim(s)}`}>
          <p className="font-display text-sm text-[var(--trilha-terracota)]">{String(number).padStart(2, "0")}</p>
          {s.title && <h2 className="font-display text-lg font-medium leading-snug text-[var(--trilha-navy)]">{s.title}</h2>}
          <Body s={s} className="text-sm leading-relaxed text-[var(--trilha-navy)]/80" />
          {s.video_url && <VideoBlock url={s.video_url} title={s.title} />}
          <Images urls={s.image_urls} title={s.title} />
          <Cta s={s} />
        </article>
      ))}
    </div>
  );
}

function TextoBlock({ s }: { s: OnboardingSection }) {
  return (
    <section data-testid={`onboarding-section-${s.id}`} data-layout="texto" className={`space-y-3 px-1 ${dim(s)}`}>
      {s.title && <h2 className="font-display text-2xl leading-snug text-[var(--trilha-navy)]">{s.title}</h2>}
      <Body s={s} className="text-base leading-relaxed text-[var(--trilha-navy)]/85" />
      {s.video_url && <VideoBlock url={s.video_url} title={s.title} />}
      <Images urls={s.image_urls} title={s.title} />
      <Cta s={s} />
    </section>
  );
}

function DestaqueBlock({ s }: { s: OnboardingSection }) {
  return (
    <section
      data-testid={`onboarding-section-${s.id}`}
      data-layout="destaque"
      className={`space-y-3 rounded-lg border-l-4 border-[var(--trilha-terracota)] bg-[var(--trilha-terracota)]/10 p-6 ${dim(s)}`}
    >
      {s.title && <h2 className="font-display text-xl font-medium leading-snug text-[var(--trilha-navy)]">{s.title}</h2>}
      <Body s={s} className="text-sm leading-relaxed text-[var(--trilha-navy)]/85" />
      {s.video_url && <VideoBlock url={s.video_url} title={s.title} />}
      <Images urls={s.image_urls} title={s.title} />
      <Cta s={s} />
    </section>
  );
}

function MidiaBlock({ s, compact }: { s: OnboardingSection; compact?: boolean }) {
  const hasMedia = !!s.video_url || s.image_urls.length > 0;
  return (
    <section data-testid={`onboarding-section-${s.id}`} data-layout="midia" className={`rounded-lg border border-[var(--trilha-areia)] bg-white p-5 sm:p-6 ${dim(s)}`}>
      <div className={`grid gap-6 ${hasMedia && !compact ? "md:grid-cols-2 md:items-center" : ""}`}>
        {hasMedia && (
          <div className="space-y-2">
            {s.video_url ? <VideoBlock url={s.video_url} title={s.title} /> : null}
            {s.image_urls.length > 0 && (
              <a href={s.image_urls[0]} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-[var(--trilha-areia)]">
                <img src={s.image_urls[0]} alt={s.title || "Imagem"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              </a>
            )}
          </div>
        )}
        <div className="space-y-3">
          {s.title && <h2 className="font-display text-xl font-medium leading-snug text-[var(--trilha-navy)]">{s.title}</h2>}
          <Body s={s} className="text-sm leading-relaxed text-[var(--trilha-navy)]/80" />
          {s.image_urls.length > 1 && <Images urls={s.image_urls.slice(1)} title={s.title} />}
          <Cta s={s} />
        </div>
      </div>
    </section>
  );
}

/**
 * Tela 0 do mockup "Trilha do Cliente": marca centralizada e as seções no
 * layout escolhido para cada uma (capa, card numerado, texto, destaque ou
 * mídia ao lado), com o botão de entrar no fim. Sem layout escolhido, a
 * primeira seção é a capa e as demais viram cards, como antes.
 * Usada no portal (/client/:token) e no preview do editor, pra ser fiel.
 */
export function OnboardingView({ sections, placeholders, onEnter, enterLabel = "Entrar no meu projeto", showInactive, compact }: Props) {
  const filled = applyOnboardingPlaceholders(sections, placeholders);
  const list = showInactive ? filled : visibleSections(filled);
  if (list.length === 0) return null;

  const blocks = toBlocks(list);

  return (
    <div className={`trilha rounded-xl ${compact ? "px-4 py-6" : "px-4 py-10 sm:px-8"}`} data-testid="onboarding-view">
      <div className={`mx-auto ${compact ? "max-w-full" : "max-w-4xl"} space-y-8`}>
        <p className="text-center font-display text-2xl tracking-tight text-[var(--trilha-navy)]">
          quadra<span className="text-[var(--trilha-terracota)]">.</span>
        </p>

        {blocks.map((b) => {
          if (b.kind === "cards") return <CardsBlock key={b.items[0].section.id} items={b.items} compact={compact} />;
          const s = b.section;
          switch (b.layout) {
            case "capa":
              return <CapaBlock key={s.id} s={s} first={b.first} compact={compact} />;
            case "texto":
              return <TextoBlock key={s.id} s={s} />;
            case "destaque":
              return <DestaqueBlock key={s.id} s={s} />;
            case "midia":
              return <MidiaBlock key={s.id} s={s} compact={compact} />;
          }
        })}

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
