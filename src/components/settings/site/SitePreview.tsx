import { useLayoutEffect, useRef, useState } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhySection } from "@/components/landing/WhySection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { JourneySection } from "@/components/landing/JourneySection";
import { TrailSection } from "@/components/landing/TrailSection";
import { CasesSection } from "@/components/landing/CasesSection";
import { ArchitectsSection } from "@/components/landing/ArchitectsSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import type { SiteContent, SiteSectionKey } from "@/lib/siteContent";

/** Largura de desktop em que a seção é renderizada antes de reduzir. */
const PREVIEW_WIDTH = 1280;

function Section({ section, content }: { section: SiteSectionKey; content: SiteContent }) {
  switch (section) {
    case "hero":
      return <HeroSection content={content.hero} />;
    case "why":
      return <WhySection content={content.why} />;
    case "services":
      return <ServicesSection content={content.services} />;
    case "journey":
      return <JourneySection content={content.journey} />;
    case "trail":
      return <TrailSection content={content.trail} />;
    case "portfolio":
      return <CasesSection content={content.portfolio} />;
    case "architects":
      return <ArchitectsSection content={content.architects} />;
    case "about":
      return <AboutSection content={content.about} />;
    case "contact":
      return <ContactSection content={content.contact} preview />;
    case "footer":
      return <LandingFooter content={content.footer} />;
    /* As dobras das etapas seguintes ainda não têm componente. O
       TypeScript cobra cada chave do SiteSectionKey aqui, então a
       ausência aparece em tempo de compilação, não como tela branca. */
    case "testimonials":
    case "leadMagnet":
    case "faq":
    case "blog":
      return (
        <div className="px-10 py-16 text-center text-sm text-muted-foreground">
          Esta dobra ainda não foi publicada no site. O conteúdo já pode ser escrito e fica salvo.
        </div>
      );
  }
}

/**
 * Preview da seção com o rascunho: usa os mesmos componentes do site,
 * renderizados em 1280px e reduzidos pra caber na coluna.
 */
export function SitePreview({ section, content }: { section: SiteSectionKey; content: SiteContent }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const s = Math.min(1, outer.clientWidth / PREVIEW_WIDTH) || 0.5;
      setScale(s);
      setHeight(inner.scrollHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [section]);

  return (
    <div ref={outerRef} className="w-full overflow-hidden rounded-md border bg-white" style={{ height: height || undefined }} data-testid="site-preview">
      <div
        ref={innerRef}
        style={{ width: PREVIEW_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
        // Links e botões do preview não navegam.
        onClickCapture={(e) => e.preventDefault()}
      >
        <Section section={section} content={content} />
      </div>
    </div>
  );
}
