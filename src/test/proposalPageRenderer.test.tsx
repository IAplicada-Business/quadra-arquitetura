import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildProposalPages, proposalPageKeys } from "@/components/leads/ProposalPageRenderer";
import type { ProposalPageProps } from "@/components/leads/proposal-pages/shared";
import { defaultProposalBlocks, moveProposalBlock, type ProposalBlock, type ResolvedProposalBlock } from "@/lib/proposalBlocks";

const baseData: ProposalPageProps = {
  clientName: "Ana",
  projectName: "Apto 120",
  servicesIncluded: "ambos",
  priceFull: 10000,
  portfolioCards: [{ id: "p1", nome: "Casa X", foto_url: "https://example.com/x.jpg" }],
};

function withBlock(blocks: ProposalBlock[], key: string, patch: Partial<ResolvedProposalBlock>) {
  return blocks.map((b) => (b.key === key ? ({ ...b, ...patch } as ResolvedProposalBlock) : b));
}

describe("buildProposalPages com blocos", () => {
  it("sem blocos => as 9 páginas de sempre, na ordem de sempre", () => {
    const pages = buildProposalPages({ data: baseData });
    expect(proposalPageKeys(pages)).toEqual([
      "cover", "about", "scope", "interiores", "management", "whyhire", "portfolio", "values", "contact",
    ]);
  });

  it("bloco desligado some do PDF (ex.: Projeto de Interiores)", () => {
    const blocks = withBlock(defaultProposalBlocks(), "interiores", { is_active: false });
    const pages = buildProposalPages({ data: baseData, blocks });
    expect(proposalPageKeys(pages)).not.toContain("interiores");
    expect(pages).toHaveLength(8);
  });

  it("ordem salva é a ordem do PDF", () => {
    const blocks = moveProposalBlock(defaultProposalBlocks(), 7, 1); // valores logo após a capa
    const pages = buildProposalPages({ data: baseData, blocks });
    expect(proposalPageKeys(pages).slice(0, 3)).toEqual(["cover", "values", "about"]);
  });

  it("condições por proposta continuam valendo por cima do toggle", () => {
    const blocks = defaultProposalBlocks();
    const soObra = buildProposalPages({ data: { ...baseData, servicesIncluded: "obra" }, blocks });
    expect(proposalPageKeys(soObra)).not.toContain("interiores");

    const semPortfolio = buildProposalPages({ data: { ...baseData, portfolioCards: [] }, blocks });
    expect(proposalPageKeys(semPortfolio)).not.toContain("portfolio");
  });

  it("texto editado de Quem Somos aparece na página", () => {
    const blocks = withBlock(defaultProposalBlocks(), "about", {
      isDefault: false,
      content: {
        tag: "Sobre nós",
        title: "Quem é a Quadra",
        body: "Texto **novo** da Camilla",
        founders: [{ title: "Camilla", desc: "Arquiteta" }],
      },
    });
    const pages = buildProposalPages({ data: baseData, blocks });
    const about = pages.find((p) => p.key === "about")!;
    render(about);
    expect(screen.getByText("Quem é a Quadra")).toBeInTheDocument();
    expect(screen.getByText("novo").tagName).toBe("STRONG");
    expect(screen.getByText("Camilla")).toBeInTheDocument();
    expect(screen.queryByText("Mariana")).not.toBeInTheDocument();
  });

  it("Quem Somos: texto fixo dos assets vale enquanto o bloco está no padrão", () => {
    const pages = buildProposalPages({ data: { ...baseData, aboutText: "Texto dos assets" }, blocks: defaultProposalBlocks() });
    render(pages.find((p) => p.key === "about")!);
    expect(screen.getByText("Texto dos assets")).toBeInTheDocument();
  });

  it("serviço retirado do Gerenciamento de Obra some da página", () => {
    const blocks = defaultProposalBlocks();
    const mgmt = blocks.find((b) => b.key === "management")!;
    const content = mgmt.content as { cards: { title: string; items?: string[] }[] };
    const edited = withBlock(blocks, "management", {
      content: { ...content, cards: content.cards.filter((c) => c.title !== "Gestão de Pessoas") } as ResolvedProposalBlock["content"],
    });
    const pages = buildProposalPages({ data: baseData, blocks: edited });
    render(pages.find((p) => p.key === "management")!);
    expect(screen.getByText("Planejamento")).toBeInTheDocument();
    expect(screen.queryByText("Gestão de Pessoas")).not.toBeInTheDocument();
  });

  it("escopo: texto padrão editável só entra quando a proposta não tem escopo próprio", () => {
    const blocks = withBlock(defaultProposalBlocks(), "scope", {
      content: {
        tag: "O que está sendo contemplado",
        title: "Nosso Escopo",
        defaultText: "Escopo padrão *editado*",
        ambientesLabel: "Ambientes:",
        processTag: "Como funciona",
        processTitle: "Nosso Processo",
      },
    });
    const semEscopo = buildProposalPages({ data: baseData, blocks });
    const { unmount } = render(semEscopo.find((p) => p.key === "scope")!);
    expect(screen.getByText("editado").tagName).toBe("EM");
    unmount();

    const comEscopo = buildProposalPages({ data: { ...baseData, scopeDescription: "Escopo da proposta" }, blocks });
    render(comEscopo.find((p) => p.key === "scope")!);
    expect(screen.getByText("Escopo da proposta")).toBeInTheDocument();
    expect(screen.queryByText("editado")).not.toBeInTheDocument();
  });

  it("etapas do fluxo vêm do bloco: renomear, remover e criar etapa com prazo fixo", () => {
    const blocks = defaultProposalBlocks().map((b) =>
      b.key === "scope"
        ? {
            ...b,
            content: {
              ...b.content,
              steps: [
                { key: "Briefing", title: "Imersão", desc: "Conversa inicial" },
                { key: "etapa-nova", title: "Vistoria final", desc: "Entrega", meta: "2 dias" },
              ],
            },
          }
        : b,
    ) as ProposalBlock[];

    // Proposta com Briefing ativo e prazo de 4 dias; etapa nova também ativa.
    const pages = buildProposalPages({ data: { ...baseData, etapasAtivas: ["Briefing", "etapa-nova"], timelineBriefing: 4 }, blocks });
    const { unmount } = render(pages.find((p) => p.key === "scope")!);
    expect(screen.getByText("Imersão")).toBeInTheDocument();
    expect(screen.queryByText(/Estudo/)).not.toBeInTheDocument(); // removida do bloco
    expect(screen.getByText("4 dias")).toBeInTheDocument(); // prazo da proposta
    expect(screen.getByText("Vistoria final")).toBeInTheDocument();
    expect(screen.getByText("2 dias")).toBeInTheDocument(); // prazo fixo da etapa nova
    unmount();

    // Proposta que desmarcou a etapa nova: ela some.
    const pages2 = buildProposalPages({ data: { ...baseData, etapasAtivas: ["Briefing"] }, blocks });
    render(pages2.find((p) => p.key === "scope")!);
    expect(screen.queryByText("Vistoria final")).not.toBeInTheDocument();
  });

  it("foto da capa e das sócias vêm do bloco quando informadas", () => {
    const blocks = defaultProposalBlocks().map((b) => {
      if (b.key === "cover") return { ...b, content: { ...b.content, imageUrl: "https://cdn/capa.jpg" } };
      if (b.key === "about") return { ...b, content: { ...b.content, photoUrl: "https://cdn/socias.jpg" } };
      return b;
    }) as ProposalBlock[];
    const pages = buildProposalPages({ data: baseData, blocks });
    const { container, unmount } = render(pages.find((p) => p.key === "cover")!);
    expect(container.innerHTML).toContain("https://cdn/capa.jpg");
    unmount();
    render(pages.find((p) => p.key === "about")!);
    expect(screen.getByAltText("Camilla e Mariana")).toHaveAttribute("src", "https://cdn/socias.jpg");
  });

  it("logo enviado substitui o wordmark, respeitando o fundo da página", () => {
    const pages = buildProposalPages({ data: { ...baseData, logoOnDarkUrl: "https://cdn/claro.png", logoOnLightUrl: "https://cdn/escuro.png" } });
    const { unmount } = render(pages.find((p) => p.key === "cover")!);
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "https://cdn/claro.png"); // capa é navy
    unmount();
    render(pages.find((p) => p.key === "interiores")!);
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "https://cdn/escuro.png"); // interiores é bege

    // Sem logo enviado, continua o wordmark em texto.
    const semLogo = buildProposalPages({ data: baseData });
    const { container } = render(semLogo.find((p) => p.key === "values")!);
    expect(container.querySelector("img[alt='Logo']")).toBeNull();
    expect(container.textContent).toContain("QUA");
  });
});
