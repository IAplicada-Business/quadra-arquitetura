import { useEffect } from "react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhySection } from "@/components/landing/WhySection";
import { JourneySection } from "@/components/landing/JourneySection";
import { TrailSection } from "@/components/landing/TrailSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { CasesSection } from "@/components/landing/CasesSection";
import { ArchitectsSection } from "@/components/landing/ArchitectsSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { usePublicSiteContent } from "@/hooks/useSiteContent";

export default function Landing() {
  // Textos e imagens editáveis vêm de site_content (Configurações → Site).
  const { content, isLoading } = usePublicSiteContent();

  // Enable smooth scrolling globally for anchor links on the LP
  useEffect(() => {
    const original = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = original;
    };
  }, []);

  // Segura a página na primeira leitura (limitada por timeout no hook) pra
  // não piscar o texto padrão antes do publicado.
  if (isLoading) return <div className="min-h-screen bg-brand-navy" aria-busy="true" />;

  return (
    <div className="min-h-screen bg-white">
      <LandingNavbar />
      <main>
        <HeroSection content={content.hero} />
        <WhySection content={content.why} />
        <ServicesSection content={content.services} />
        <JourneySection content={content.journey} />
        <TrailSection content={content.trail} />
        <CasesSection content={content.portfolio} />
        <ArchitectsSection content={content.architects} />
        <AboutSection content={content.about} />
        <ContactSection content={content.contact} />
      </main>
      <LandingFooter content={content.footer} />
    </div>
  );
}
