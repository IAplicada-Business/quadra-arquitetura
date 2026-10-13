import { Instagram } from "lucide-react";
import logoBege from "@/assets/logo-bege.png";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, type FooterContent } from "@/lib/siteContent";

const year = new Date().getFullYear();

export function LandingFooter({ content = SITE_DEFAULTS.footer }: { content?: FooterContent }) {
  const addressLines = content.address.split(/\r?\n/).filter((l) => l.trim());
  const smoothTo = (href: string) =>
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="bg-[#0F1A2E] text-brand-areia pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 pb-12 border-b border-brand-areia/10">
          {/* Brand */}
          <div>
            <img src={content.logo || logoBege} alt="Quadra Arquitetura" className="h-24 w-auto mb-6" />
            <p
              className="max-w-xs"
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "0.875rem",
                lineHeight: 1.8,
                opacity: 0.7,
                fontWeight: 300,
              }}
            >
              <RichText text={content.tagline} />
            </p>
          </div>

          {/* Nav */}
          <div>
            <p
              className="text-xs mb-5"
              style={{
                color: "hsl(var(--brand-terracota))",
                letterSpacing: "4px",
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              Navegacao
            </p>
            <ul className="space-y-3">
              {[
                { href: "#sobre", label: "Sobre" },
                { href: "#servicos", label: "Servicos" },
                { href: "#projetos", label: "Projetos" },
                { href: "#processo", label: "Processo" },
                { href: "#contato", label: "Contato" },
              ].map((l) => (
                <li key={l.href}>
                  <button
                    onClick={() => smoothTo(l.href)}
                    className="opacity-70 hover:opacity-100 transition-opacity text-sm"
                    style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300 }}
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p
              className="text-xs mb-5"
              style={{
                color: "hsl(var(--brand-terracota))",
                letterSpacing: "4px",
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
                textTransform: "uppercase",
              }}
            >
              Contato
            </p>
            <ul
              className="space-y-3 text-sm"
              style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300 }}
            >
              {addressLines.map((line, i) => (
                <li key={i} className="opacity-70">
                  <RichText text={line} />
                </li>
              ))}
              {content.email && (
                <li>
                  <a
                    href={`mailto:${content.email}`}
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  >
                    {content.email}
                  </a>
                </li>
              )}
              {content.instagramHandle && (
                <li className="pt-2">
                  <a
                    href={content.instagramUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <Instagram className="h-4 w-4" strokeWidth={1.5} />
                    {content.instagramHandle}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs"
          style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, opacity: 0.5 }}
        >
          <p>&copy; {year} {content.legal}</p>
          <p style={{ letterSpacing: "2px", textTransform: "uppercase" }}>
            {content.location}
          </p>
        </div>
      </div>
    </footer>
  );
}
