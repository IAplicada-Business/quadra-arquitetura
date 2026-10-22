import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhySection } from "@/components/landing/WhySection";
import { JourneySection } from "@/components/landing/JourneySection";
import { TrailSection } from "@/components/landing/TrailSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { LeadMagnetSection } from "@/components/landing/LeadMagnetSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { BlogSection } from "@/components/landing/BlogSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { CasesSection } from "@/components/landing/CasesSection";
import { ArchitectsSection } from "@/components/landing/ArchitectsSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Letreiro, WhatsFlutuante } from "@/components/landing/Efeitos";
import { stripRichText } from "@/components/leads/proposal-pages/RichText";
import { usePublicSiteContent } from "@/hooks/useSiteContent";
import { usePublicBlogPosts } from "@/hooks/useBlog";

export default function Landing() {
  // Textos e imagens editáveis vêm de site_content (Configurações → Site).
  const { content, isLoading } = usePublicSiteContent();
  // Artigos do blog (Configurações → Blog). Falha ou vazio = chamadas de site_content.
  const { posts } = usePublicBlogPosts();
  const { hash } = useLocation();

  // Enable smooth scrolling globally for anchor links on the LP. O
  // scroll-padding compensa a navbar fixa: sem ele, o título da seção
  // alcançada por âncora ficava escondido embaixo da barra.
  useEffect(() => {
    const raiz = document.documentElement.style;
    const original = { comportamento: raiz.scrollBehavior, margem: raiz.scrollPaddingTop };
    raiz.scrollBehavior = "smooth";
    raiz.scrollPaddingTop = "72px";
    return () => {
      raiz.scrollBehavior = original.comportamento;
      raiz.scrollPaddingTop = original.margem;
    };
  }, []);

  // Faixa do letreiro: a chamada do hero ("VIABILIDADE · GERENCIAMENTO · BH")
  // e o nome das fases. Tudo vem do conteúdo editável, nada novo para manter.
  const itensLetreiro = useMemo(() => {
    /* A chamada do hero vem em caixa alta ("VIABILIDADE"), as fases em caixa
       mista. Sem normalizar, a faixa mistura os dois. Siglas curtas (BH)
       ficam como estão. */
    const frase = (t: string) =>
      t.length <= 3 || t !== t.toUpperCase() ? t : t.charAt(0) + t.slice(1).toLowerCase();
    const partes = [
      ...content.hero.eyebrow.split("·"),
      ...content.services.items.map((s) => s.title),
      stripRichText(content.blog.title),
    ]
      .map((t) => frase(t.trim()))
      .filter(Boolean);
    return Array.from(new Set(partes.map((t) => t.toLowerCase()))).map((k) => partes.find((t) => t.toLowerCase() === k)!);
  }, [content.hero.eyebrow, content.services.items, content.blog.title]);

  // Botão flutuante: o primeiro canal de WhatsApp do bloco de contato.
  const whatsapp = useMemo(
    () => content.contact.contacts.find((c) => /wa\.me|whatsapp/i.test(c.desc))?.desc.trim() ?? "",
    [content.contact.contacts],
  );

  // Chegada por /#contato (vindo do blog): a seção só existe depois que o
  // conteúdo carrega, então a rolagem espera a página montar.
  useEffect(() => {
    if (isLoading || !hash) return;
    const t = setTimeout(() => document.querySelector(hash)?.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(t);
  }, [isLoading, hash]);

  // Segura a página na primeira leitura (limitada por timeout no hook) pra
  // não piscar o texto padrão antes do publicado.
  if (isLoading) return <div className="min-h-screen bg-brand-navy" aria-busy="true" />;

  return (
    /* lining-nums: a Cormorant usa numerais "old-style" por padrão, em que o
       0 vira um "o" e o 1 um "I" (o1, 5o, +8oh). Numeral alinhado lê como
       número, e vale para a página toda. É a classe do Tailwind, e não um
       font-variant-numeric solto, porque o tabular-nums da Jornada
       sobrescreveria o valor inteiro; as classes compõem por variável. */
    <div className="min-h-screen bg-white lining-nums">
      <LandingNavbar />
      <main>
        <HeroSection content={content.hero} />
        <Letreiro itens={itensLetreiro} />
        <WhySection content={content.why} />
        <ServicesSection content={content.services} />
        <JourneySection content={content.journey} />
        <TrailSection content={content.trail} />
        <CasesSection content={content.portfolio} />
        <ArchitectsSection content={content.architects} />
        <AboutSection content={content.about} />
        <TestimonialsSection content={content.testimonials} />
        <LeadMagnetSection content={content.leadMagnet} />
        <FaqSection content={content.faq} />
        <BlogSection content={content.blog} posts={posts} />
        <ContactSection content={content.contact} />
      </main>
      <LandingFooter content={content.footer} />
      {whatsapp && <WhatsFlutuante href={whatsapp} />}
    </div>
  );
}
