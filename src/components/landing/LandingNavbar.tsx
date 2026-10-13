import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import logoBege from "@/assets/logo-bege.png";
import logoAzul from "@/assets/logo-azul.png";

/* A ordem segue a leitura da página: o que fazemos, como fazemos, o que
   já fizemos, para quem mais serve, de onde viemos e como falar com a
   gente. "Fale conosco" fica separado porque é botão, não link. */
const links = [
  { href: "#servicos", label: "Gerenciamento" },
  { href: "#jornada", label: "Jornada" },
  { href: "#projetos", label: "Projetos" },
  { href: "#arquitetos", label: "Para arquitetos" },
  { href: "#blog", label: "Obra sem Surto" },
  { href: "#sobre", label: "Sobre" },
];

export function LandingNavbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const smoothTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  return (
    /* Barra sólida sempre. Antes ela era transparente sobre uma foto de
       tela cheia; com o hero em painel navy, transparente só fazia o
       menu brigar com o logo e com a chamada. Ao rolar, ela só ganha
       sombra e encolhe. */
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b border-brand-navy/10 bg-brand-creme transition-all duration-300 ${
        scrolled ? "py-2 shadow-sm" : "py-3"
      }`}
      style={{ fontFamily: "'Jost', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-10 flex items-center justify-between">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center"
          aria-label="Quadra Arquitetura"
        >
          <img
            src={logoAzul}
            alt="Quadra Arquitetura"
            className="h-11 md:h-12 w-auto"
          />
        </button>

        {/* Desktop menu */}
        <div className="hidden lg:flex items-center gap-6 min-w-0">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => smoothTo(l.href)}
              className="text-brand-navy/80 text-xs tracking-wider uppercase whitespace-nowrap transition-colors hover:text-brand-navy"
              style={{ letterSpacing: "1.5px", fontWeight: 400 }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <button
            onClick={() => navigate("/login")}
            className="text-brand-navy/50 text-[11px] tracking-wider uppercase whitespace-nowrap transition-colors hover:text-brand-navy"
            style={{ letterSpacing: "1.5px" }}
          >
            Area da Equipe
          </button>
          <button
            onClick={() => smoothTo("#contato")}
            className="border border-brand-navy px-5 py-2.5 text-[11px] tracking-wider uppercase whitespace-nowrap text-brand-navy transition-colors hover:bg-brand-navy hover:text-brand-areia"
            style={{ letterSpacing: "1.5px", fontWeight: 500 }}
          >
            Fale conosco
          </button>
        </div>

        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="lg:hidden" aria-label="Menu">
              <Menu className="h-6 w-6 text-brand-navy" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-brand-navy border-none w-full sm:w-96">
            <div className="flex flex-col h-full pt-8">
              <button onClick={() => setMobileOpen(false)} className="self-end mb-8">
                <X className="h-6 w-6 text-brand-areia" />
              </button>
              <div className="flex flex-col gap-6 flex-1">
                {links.map((l) => (
                  <button
                    key={l.href}
                    onClick={() => smoothTo(l.href)}
                    className="text-brand-areia text-lg text-left tracking-wider uppercase"
                    style={{ letterSpacing: "3px", fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-brand-areia/20 pt-6 flex flex-col gap-4">
                <button
                  onClick={() => smoothTo("#contato")}
                  className="bg-brand-areia text-brand-navy py-3 text-sm tracking-widest uppercase"
                  style={{ letterSpacing: "3px" }}
                >
                  Fale conosco
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="text-brand-areia/70 text-xs tracking-widest uppercase"
                  style={{ letterSpacing: "2px" }}
                >
                  Area da Equipe
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
