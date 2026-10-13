import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Item, ItemLista, Revelar, Rotulo, Sequencia, SequenciaUl } from "@/components/landing/Motion";
import { CASCATA, DISTANCIA, DURACAO, MARGEM_GATILHO, cascata, semMovimento, sobe } from "@/lib/motion";
import { HeroSection } from "@/components/landing/HeroSection";
import { CasesSection } from "@/components/landing/CasesSection";
import { TrailSection } from "@/components/landing/TrailSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { WhySection } from "@/components/landing/WhySection";
import { FaqSection } from "@/components/landing/FaqSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";

/** Liga/desliga o prefers-reduced-motion do jsdom para um teste. */
function pedirMenosMovimento(ligado: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: ligado && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

afterEach(() => pedirMenosMovimento(false));

/*
 * O movimento anterior existia no código e não aparecia na tela: 20px
 * terminando em ~300ms úteis. Estes limites são o que foi medido como
 * perceptível no navegador; se alguém baixar os números de novo, o
 * problema volta calado, porque nada quebra — a página só fica sem
 * graça. Daí travá-los aqui.
 */
describe("Régua do movimento", () => {
  it("o deslocamento fica acima do limiar em que se confunde com a rolagem", () => {
    expect(DISTANCIA).toBeGreaterThanOrEqual(28);
    // e abaixo do ponto em que a página parece montar-se sozinha
    expect(DISTANCIA).toBeLessThanOrEqual(40);
  });

  it("a cascata é lenta o bastante para ser lida como sequência", () => {
    // em 0.08 quatro cards fecham em 240ms e leem-se como um bloco só
    expect(CASCATA).toBeGreaterThanOrEqual(0.1);
    // seis itens não podem passar de ~0.7s no total
    expect(CASCATA * 6).toBeLessThanOrEqual(0.7);
  });

  it("o gatilho espera o elemento entrar de verdade na tela", () => {
    const px = Number(MARGEM_GATILHO.replace(/[^-\d]/g, ""));
    expect(px).toBeLessThanOrEqual(-120);
  });

  it("a cascata distribui os filhos a partir do atraso pedido", () => {
    const v = cascata(0.15) as { visivel: { transition: Record<string, number> } };
    expect(v.visivel.transition.staggerChildren).toBe(CASCATA);
    expect(v.visivel.transition.delayChildren).toBe(0.15);
  });

  it("nenhuma variante ultrapassa o destino e volta", () => {
    // material de escritório de arquitetura não quica: o y final é 0,
    // não um valor negativo seguido de correção
    expect(sobe.visivel.y).toBe(0);
    expect(sobe.oculto.y).toBe(DISTANCIA);
    expect(sobe.visivel.transition.duration).toBe(DURACAO.media);
  });
});

describe("Quem pede menos movimento", () => {
  it("a variante reduzida não desloca nada, só revela", () => {
    expect(semMovimento.oculto).toEqual({ opacity: 0 });
    expect("y" in semMovimento.visivel).toBe(false);
    expect("x" in semMovimento.visivel).toBe(false);
    expect("scale" in semMovimento.visivel).toBe(false);
  });

  it("o Item troca de variante quando o sistema pede menos movimento", () => {
    pedirMenosMovimento(true);
    const { container } = render(
      <Sequencia>
        <Item className="cartao">conteúdo</Item>
      </Sequencia>,
    );
    const cartao = container.querySelector(".cartao") as HTMLElement;
    // sem deslocamento no estado inicial
    expect(cartao.style.transform || "none").toBe("none");
  });

  it("as dobras continuam legíveis com menos movimento ligado", () => {
    pedirMenosMovimento(true);
    render(<CasesSection />);
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
  });
});

/*
 * Guarda de regressão com nome e sobrenome: ao converter as dobras para
 * estes componentes eu engoli o aria-hidden do painel de amostra da
 * Trilha, e ele voltou a ser anunciado por leitor de tela. O teste da
 * Trilha pegou; este aqui prende a causa em vez do sintoma, para que a
 * próxima peça que envolver um bloco decorativo já nasça certa.
 */
describe("Os invólucros não engolem a marcação", () => {
  it("Revelar encaminha aria-hidden", () => {
    const { container } = render(
      <Revelar aria-hidden className="painel">
        ilustração
      </Revelar>,
    );
    expect(container.querySelector(".painel")).toHaveAttribute("aria-hidden", "true");
  });

  it("Item e ItemLista encaminham aria-hidden e style", () => {
    const { container } = render(
      <SequenciaUl>
        <ItemLista aria-hidden className="selo" style={{ letterSpacing: "0.12em" }}>
          selo
        </ItemLista>
      </SequenciaUl>,
    );
    const selo = container.querySelector(".selo") as HTMLElement;
    expect(selo).toHaveAttribute("aria-hidden", "true");
    expect(selo.style.letterSpacing).toBe("0.12em");
  });

  it("a amostra da Trilha segue fora do leitor de tela", () => {
    render(<TrailSection />);
    const obra = screen.getByText("Reforma · Apartamento Sion");
    expect(obra.closest('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("o fio do rótulo é decorativo", () => {
    const { container } = render(<Rotulo>Quem somos</Rotulo>);
    expect(screen.getByText("Quem somos")).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});

/*
 * O ponto que a Quadra levantou foi "nenhuma modernidade aplicada": o
 * problema não era uma dobra, era a página inteira entrar sem anunciar
 * que mudou de assunto. Este bloco garante que nenhuma dobra fique de
 * fora da gramática — é o tipo de coisa que se perde ao adicionar a
 * décima quinta dobra meses depois.
 */
describe("Toda dobra abre com o rótulo e o fio", () => {
  const dobras = [
    ["hero", <HeroSection key="h" />],
    ["cases", <CasesSection key="c" />],
    ["trilha", <TrailSection key="t" />],
    ["contato", <ContactSection key="ct" />],
    ["por que", <WhySection key="w" />],
    ["faq", <FaqSection key="f" />],
    ["depoimentos", <TestimonialsSection key="d" />],
  ] as const;

  it.each(dobras)("%s traz o fio decorativo ao lado do rótulo", (_nome, elemento) => {
    /* O formulário do Contato consulta o React Query ao enviar; sem o
       provider ele nem monta. */
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(<QueryClientProvider client={client}>{elemento}</QueryClientProvider>);
    const fios = container.querySelectorAll('span[aria-hidden="true"].block.h-px');
    expect(fios.length).toBeGreaterThan(0);
  });
});
