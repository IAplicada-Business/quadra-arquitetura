import { useEffect } from "react";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { ResultsSection } from "@/components/landing/ResultsSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { PortfolioSection } from "@/components/landing/PortfolioSection";
import { ProcessSection } from "@/components/landing/ProcessSection";
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
        <AboutSection content={content.about} />
        <ResultsSection />
        <ServicesSection content={content.services} />
        <PortfolioSection content={content.portfolio} />
        <ProcessSection />
        <ContactSection content={content.contact} />
      </main>
      <LandingFooter content={content.footer} />
    </div>
  );
}
