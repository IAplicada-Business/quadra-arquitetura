import logoBege from "@/assets/logo-bege.png";
import { SITE_DEFAULTS, type FooterContent } from "@/lib/siteContent";

const year = new Date().getFullYear();

/* Os atalhos repetem o que o menu já tem. O rodapé serve a quem chegou
   até o fim rolando e não quer subir para navegar. */
const atalhos = [
  { href: "#servicos", label: "Gerenciamento" },
  { href: "#arquitetos", label: "Para arquitetos" },
  { href: "#blog", label: "Obra sem Surto" },
];

/**
 * Rodapé enxuto, encostado no bloco de contato.
 *
 * Virou uma faixa só porque tudo que o rodapé antigo carregava agora
 * tem lugar melhor na página: endereço e canais estão no bloco de
 * contato logo acima, e repeti-los a dois palmos de distância só faz o
 * fim da página parecer mais longo do que é.
 *
 * O que sobra é o que de fato pertence ao rodapé: quem assina, por onde
 * navegar sem subir, e a linha legal.
 */
export function LandingFooter({
  content = SITE_DEFAULTS.footer,
  irPara,
}: {
  content?: FooterContent;
  /** Fora da home (páginas do blog) o atalho navega até a âncora em vez de rolar. */
  irPara?: (href: string) => void;
}) {
  const smoothTo =
    irPara ?? ((href: string) => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }));

  return (
    <footer className="bg-brand-navy border-t border-brand-areia/10" style={{ fontFamily: "'Jost', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
          <div className="flex items-center gap-4 min-w-0">
            <img src={content.logo || logoBege} alt="Quadra Arquitetura" className="h-9 w-auto shrink-0" />
            <p className="text-brand-areia/50 min-w-0" style={{ fontSize: "0.8125rem", fontWeight: 300 }}>
              {content.tagline}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 min-w-0">
            {atalhos.map((a) => (
              <button
                key={a.href}
                onClick={() => smoothTo(a.href)}
                className="text-brand-areia/60 whitespace-nowrap transition-colors hover:text-brand-areia"
                style={{ fontSize: "0.8125rem", fontWeight: 300 }}
              >
                {a.label}
              </button>
            ))}
            <a
              href={content.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-areia/60 whitespace-nowrap transition-colors hover:text-brand-areia"
              style={{ fontSize: "0.8125rem", fontWeight: 300 }}
            >
              {content.instagramHandle}
            </a>
            <span className="text-brand-areia/30 whitespace-nowrap" style={{ fontSize: "0.8125rem" }}>
              © {year}
            </span>
          </nav>
        </div>

        {content.legal && (
          <p
            className="text-brand-areia/25 border-t border-brand-areia/10 mt-7 pt-6 min-w-0 break-words"
            style={{ fontSize: "0.75rem", fontWeight: 300 }}
          >
            {content.legal}
            {content.location ? ` · ${content.location}` : null}
          </p>
        )}
      </div>
    </footer>
  );
}
