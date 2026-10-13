import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { JourneySection } from "@/components/landing/JourneySection";
import { TrailSection } from "@/components/landing/TrailSection";
import { CasesSection } from "@/components/landing/CasesSection";
import { ArchitectsSection } from "@/components/landing/ArchitectsSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { BlogSection } from "@/components/landing/BlogSection";
import {
  SITE_DEFAULTS,
  type JourneyContent,
  type PortfolioContent,
  type ServicesContent,
  type TrailContent,
} from "@/lib/siteContent";

const clone = <T,>(v: T): T => structuredClone(v);

describe("Serviços — as duas fases", () => {
  it("mostra o resumo de cada fase, mas não o escopo, antes do clique", () => {
    render(<ServicesSection />);
    expect(screen.getByText("Viabilidade")).toBeInTheDocument();
    expect(screen.getByText("Gerenciamento")).toBeInTheDocument();
    expect(screen.queryByText("EVF · Estudo de Viabilidade Financeira")).toBeNull();
  });

  /* O escopo é longo; aberto de saída, empurraria a jornada para fora da
     primeira rolagem. */
  it("abre o escopo no clique e fecha no segundo", () => {
    render(<ServicesSection />);
    const botao = screen.getAllByRole("button", { name: /Ver o que está incluso/ })[0];
    expect(botao).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("EVF · Estudo de Viabilidade Financeira")).toBeInTheDocument();

    fireEvent.click(botao);
    expect(screen.queryByText("EVF · Estudo de Viabilidade Financeira")).toBeNull();
  });

  /* As fases são compráveis separadamente: abrir uma não fecha a outra. */
  it("cada fase abre sozinha", () => {
    render(<ServicesSection />);
    const botoes = screen.getAllByRole("button", { name: /Ver o que está incluso/ });
    fireEvent.click(botoes[0]);
    fireEvent.click(botoes[1]);
    expect(botoes[0]).toHaveAttribute("aria-expanded", "true");
    expect(botoes[1]).toHaveAttribute("aria-expanded", "true");
  });

  it("fase sem escopo não mostra o botão de abrir", () => {
    const content: ServicesContent = clone(SITE_DEFAULTS.services);
    content.items = [{ tag: "FASE 01", title: "Só resumo", desc: "Sem itens.", bullets: "" }];
    render(<ServicesSection content={content} />);
    expect(screen.queryByRole("button", { name: /Ver o que está incluso/ })).toBeNull();
  });
});

describe("Jornada — agrupamento e numeração", () => {
  it("numera pela posição na lista, não pelo conteúdo", () => {
    render(<JourneySection />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("09")).toBeInTheDocument();
    // a 4ª etapa é a primeira do momento "DECISÃO"
    const quarta = screen.getByText("Desenhos de cenários").closest("li")!;
    expect(within(quarta).getByText("04")).toBeInTheDocument();
  });

  /* Remover uma etapa do meio não pode deixar a numeração com buraco. */
  it("renumera sozinha quando uma etapa sai do meio", () => {
    const content: JourneyContent = clone(SITE_DEFAULTS.journey);
    content.steps = content.steps.filter((s) => s.title !== "Análise do projeto");
    render(<JourneySection content={content} />);
    const orcamentos = screen.getByText("Orçamentos").closest("li")!;
    expect(within(orcamentos).getByText("02")).toBeInTheDocument();
    expect(screen.queryByText("09")).toBeNull();
  });

  /* O site é editado por quem não escreve código: um erro de digitação na
     etiqueta não pode apagar a etapa da página. */
  it("etapa com momento que não existe ainda aparece", () => {
    const content: JourneyContent = clone(SITE_DEFAULTS.journey);
    content.steps = [
      { tag: "ENTENDIMENTO", title: "Com momento", desc: "ok" },
      { tag: "MOMENTO QUE NÃO EXISTE", title: "Órfã", desc: "também aparece" },
    ];
    render(<JourneySection content={content} />);
    expect(screen.getByText("Órfã")).toBeInTheDocument();
    expect(screen.getByText("também aparece")).toBeInTheDocument();
  });

  it("momento sem nenhuma etapa não deixa cabeçalho solto", () => {
    const content: JourneyContent = clone(SITE_DEFAULTS.journey);
    content.steps = content.steps.filter((s) => s.tag === "OBRA");
    render(<JourneySection content={content} />);
    // o rótulo do momento vazio não vira cabeçalho da coluna de etapas
    const cabecalhos = screen.getAllByText("ENTENDIMENTO");
    expect(cabecalhos).toHaveLength(1); // só o da lista de momentos à esquerda
  });
});

describe("Trilha do Cliente — a amostra do painel", () => {
  it("desenha a barra com o percentual publicado", () => {
    const { container } = render(<TrailSection />);
    const barra = container.querySelector<HTMLElement>('[style*="width: 62%"]');
    expect(barra).toBeInTheDocument();
    expect(screen.getByText("62% concluído")).toBeInTheDocument();
  });

  /* O percentual é texto editável: "120" ou "abc" não podem estourar nem
     sumir com a barra. */
  it("apara percentual fora da faixa e aceita texto inválido", () => {
    const alto: TrailContent = { ...clone(SITE_DEFAULTS.trail), demoProgress: "120" };
    const { unmount } = render(<TrailSection content={alto} />);
    expect(screen.getByText("100% concluído")).toBeInTheDocument();
    unmount();

    const invalido: TrailContent = { ...clone(SITE_DEFAULTS.trail), demoProgress: "abc" };
    render(<TrailSection content={invalido} />);
    expect(screen.getByText("0% concluído")).toBeInTheDocument();
  });

  /* O painel é ilustração: repetir os seis passos para quem usa leitor de
     tela só atrapalharia, já que o texto ao lado diz o mesmo. */
  it("a amostra fica fora do leitor de tela", () => {
    render(<TrailSection />);
    // o conteúdo existe no DOM...
    const obra = screen.getByText("Reforma · Apartamento Sion");
    // ...mas dentro de um bloco marcado como decorativo
    expect(obra.closest('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("o texto ao lado continua legível pelo leitor de tela", () => {
    render(<TrailSection />);
    expect(screen.getByRole("heading", { name: /A Trilha do Cliente/ })).toBeInTheDocument();
    expect(screen.getByText(/Prazo sempre honesto/)).toBeInTheDocument();
  });
});

describe("Cases — a história em três parágrafos", () => {
  it("separa história, o que foi evitado e as fases", () => {
    render(<CasesSection />);
    const card = screen.getByText("A reforma que quase começou errada").closest("article")!;
    expect(within(card).getByText(/O orçamento inicial não previa/)).toBeInTheDocument();
    expect(within(card).getByText(/uma parada de obra de seis semanas/)).toBeInTheDocument();
    expect(within(card).getByText("Fases 01 + 02 · Sion, BH")).toBeInTheDocument();
  });

  /* Case recém-cadastrado tem só a história escrita; tem que publicar
     assim mesmo, sem bloco vazio na tela. */
  it("case com só a história não mostra os blocos que faltam", () => {
    const content: PortfolioContent = clone(SITE_DEFAULTS.portfolio);
    content.items = [{ tag: "RESIDENCIAL", title: "Em construção", desc: "Só a história por enquanto.", image: "" }];
    const { container } = render(<CasesSection content={content} />);
    expect(screen.getByText("Só a história por enquanto.")).toBeInTheDocument();
    expect(container.querySelector(".border-l-2")).toBeNull();
  });

  it("usa foto padrão quando o case ainda não tem imagem", () => {
    render(<CasesSection />);
    const img = screen.getByAltText("A reforma que quase começou errada");
    expect(img.getAttribute("src")).toBeTruthy();
  });
});

describe("Para arquitetos — compromissos", () => {
  it("separa o que fazemos do que nunca fazemos pela etiqueta", () => {
    render(<ArchitectsSection />);
    const nunca = screen.getByText("Nunca alteramos decisões de projeto sem alinhamento.").closest("li")!;
    const sim = screen.getByText(/Mantemos o arquiteto informado/).closest("li")!;
    expect(within(nunca).getByText("Nunca:")).toBeInTheDocument();
    expect(within(sim).getByText("Sim:")).toBeInTheDocument();
  });

  it("lista os quatro ganhos", () => {
    render(<ArchitectsSection />);
    for (const g of ["Tempo", "Proteção", "Experiência", "Reputação"]) {
      expect(screen.getByRole("heading", { name: g })).toBeInTheDocument();
    }
  });
});

describe("Sobre — sócias e selos", () => {
  it("mostra cada sócia com a sua área", () => {
    render(<AboutSection />);
    expect(screen.getByText("Camilla")).toBeInTheDocument();
    expect(screen.getByText("VISÃO, PROJETO E DECISÕES")).toBeInTheDocument();
    expect(screen.getByText("Mariana")).toBeInTheDocument();
    expect(screen.getByText("OPERAÇÃO, OBRA E SOLUÇÃO")).toBeInTheDocument();
  });

  it("mostra os selos de registro", () => {
    render(<AboutSection />);
    expect(screen.getByText("REGISTRO CAU")).toBeInTheDocument();
    expect(screen.getByText("RRT POR OBRA")).toBeInTheDocument();
  });
});

describe("Modelo da dobra (escolhido no admin)", () => {
  const com = <T extends { layout: string }>(base: T, layout: string): T => ({ ...clone(base), layout });

  it("Jornada: linha do tempo numera os marcadores sem repetir o zero à esquerda", () => {
    render(<JourneySection content={com(SITE_DEFAULTS.journey, "linha")} />);
    // na linha do tempo o marcador é "1", não "01"
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("01")).toBeNull();
  });

  it("Jornada: lista numerada mantém o zero à esquerda", () => {
    render(<JourneySection content={com(SITE_DEFAULTS.journey, "etapas")} />);
    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("Jornada: os três modelos mostram as nove etapas", () => {
    for (const layout of ["etapas", "linha", "cards"]) {
      const { unmount } = render(<JourneySection content={com(SITE_DEFAULTS.journey, layout)} />);
      expect(screen.getByText("Contratação da Quadra")).toBeInTheDocument();
      expect(screen.getByText("Contratações conforme cronograma")).toBeInTheDocument();
      unmount();
    }
  });

  /* "lista" mostra o escopo direto: sem botão para abrir, porque não há
     nada fechado. */
  it("Serviços: modelo lista mostra o escopo sem botão", () => {
    render(<ServicesSection content={com(SITE_DEFAULTS.services, "lista")} />);
    expect(screen.getByText("EVF · Estudo de Viabilidade Financeira")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver o que está incluso/ })).toBeNull();
  });

  it("Serviços: modelo cards não mostra escopo nem botão", () => {
    render(<ServicesSection content={com(SITE_DEFAULTS.services, "cards")} />);
    expect(screen.getByText("Viabilidade")).toBeInTheDocument();
    expect(screen.queryByText("EVF · Estudo de Viabilidade Financeira")).toBeNull();
    expect(screen.queryByRole("button", { name: /Ver o que está incluso/ })).toBeNull();
  });

  it("Cases: os dois modelos mostram os três cases", () => {
    for (const layout of ["cards", "lista"]) {
      const { unmount } = render(<CasesSection content={com(SITE_DEFAULTS.portfolio, layout)} />);
      expect(screen.getByText("A reforma que quase começou errada")).toBeInTheDocument();
      expect(screen.getByText("A clínica que não caberia naquele imóvel")).toBeInTheDocument();
      unmount();
    }
  });

  it("Blog: modelo lista esconde a foto, mas mantém a chamada", () => {
    const { container } = render(<BlogSection content={com(SITE_DEFAULTS.blog, "lista")} />);
    expect(screen.getByText(/O orçamento da sua obra pode estar mentindo/)).toBeInTheDocument();
    expect(container.querySelector(".hidden img")).toBeInTheDocument();
  });

  it("Prova social: modelo destaque aumenta só o primeiro", () => {
    const { container } = render(<TestimonialsSection content={com(SITE_DEFAULTS.testimonials, "destaque")} />);
    const figuras = container.querySelectorAll("figure");
    expect(figuras[0].className).toContain("md:col-span-2");
    expect(figuras[1].className).not.toContain("md:col-span-2");
  });
});
