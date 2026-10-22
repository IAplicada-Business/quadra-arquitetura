import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { Contador, Letreiro, WhatsFlutuante } from "@/components/landing/Efeitos";
import { HeroSection } from "@/components/landing/HeroSection";
import { SITE_DEFAULTS } from "@/lib/siteContent";

beforeAll(() => {
  // useInView e o letreiro dependem de IntersectionObserver, que o jsdom não tem.
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
});

describe("Contador", () => {
  it("ano não conta: mostra a data como está", () => {
    render(<Contador valor="2022" />);
    expect(screen.getByText("2022")).toBeInTheDocument();
  });

  it("número que conta deixa o valor final para o leitor de tela", () => {
    render(<Contador valor="+80h" />);
    expect(screen.getByText("+80h", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("texto sem número passa direto", () => {
    render(<Contador valor="Sempre" />);
    expect(screen.getByText("Sempre")).toBeInTheDocument();
  });

  it("o hero continua mostrando os quatro números do conteúdo", () => {
    render(<HeroSection content={SITE_DEFAULTS.hero} />);
    expect(screen.getByText("2022")).toBeInTheDocument();
    expect(screen.getByText("50", { selector: ".sr-only" })).toBeInTheDocument();
    expect(screen.getByText("+80h", { selector: ".sr-only" })).toBeInTheDocument();
    expect(screen.getByText("PROJETOS ATENDIDOS")).toBeInTheDocument();
  });
});

describe("Letreiro", () => {
  it("é decorativo: escondido do leitor de tela, pois repete texto da página", () => {
    const { container } = render(<Letreiro itens={["Viabilidade", "Gerenciamento"]} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("li").length).toBeGreaterThan(2);
  });

  it("sem itens não renderiza faixa vazia", () => {
    const { container } = render(<Letreiro itens={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("WhatsFlutuante", () => {
  it("não aparece no topo da página (primeira dobra já tem o botão principal)", () => {
    render(<WhatsFlutuante href="https://wa.me/5531900000000" />);
    expect(screen.queryByRole("link", { name: /Falar com a Quadra/ })).toBeNull();
  });
});
