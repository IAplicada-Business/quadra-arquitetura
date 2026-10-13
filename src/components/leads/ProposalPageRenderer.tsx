import React from "react";
import { ProposalPageProps } from "./proposal-pages/shared";
import { ProposalCoverPage } from "./proposal-pages/CoverPage";
import { ProposalAboutPage } from "./proposal-pages/AboutPage";
import { ProposalScopeFlowPage } from "./proposal-pages/ScopeFlowPage";
import { ProposalInterioresPage } from "./proposal-pages/InterioresPage";
import { ProposalManagementFullPage } from "./proposal-pages/ManagementFullPage";
import { ProposalWhyHireValuesPage } from "./proposal-pages/WhyHireValuesPage";
import { ProposalValuesPage } from "./proposal-pages/ValuesPage";
import { ProposalContactPage } from "./proposal-pages/ContactPage";
import { ProposalPortfolioCardsPage } from "./proposal-pages/PortfolioCardsPage";
import { ProposalAsset } from "@/hooks/useProposalAssets";
import { ProposalCustomFinancialPage } from "./proposal-pages/CustomFinancialPage";
import { ProposalCustomTimelinePage } from "./proposal-pages/CustomTimelinePage";
import { ProposalCustomCardsPage } from "./proposal-pages/CustomCardsPage";
import { defaultProposalBlocks, isCustomBlock, type ProposalBlock, type ProposalBlockKey } from "@/lib/proposalBlocks";
import { includeCustomBlock } from "@/lib/proposalCustomBlocks";

interface RendererProps {
  data: ProposalPageProps;
  /**
   * Blocos configurados pelo time (useProposalBlocks). Ausente => padrão:
   * as 9 páginas de sempre, na ordem de sempre.
   */
  blocks?: ProposalBlock[];
  portfolioImages?: ProposalAsset[];
  feedbackImages?: ProposalAsset[];
  selectedPortfolioProjects?: string[];
  selectedFeedbackIds?: string[];
}

/**
 * Monta as páginas do PDF a partir dos blocos ativos, na ordem salva.
 * Cada elemento devolvido tem `key` igual à chave do bloco, o que permite
 * ao preview localizar a página de um bloco específico.
 *
 * Condições por proposta continuam valendo por cima do toggle do bloco:
 * "interiores" só entra com serviço projeto/ambos e "portfolio" só entra
 * quando a proposta tem cards selecionados. Blocos personalizados entram
 * quando a proposta os escolheu (ou, sem escolha salva, os marcados
 * "Incluir por padrão").
 */
export function buildProposalPages({ data, blocks }: RendererProps): React.ReactElement[] {
  const resolved = blocks ?? defaultProposalBlocks();
  const showInteriores = !data.servicesIncluded || data.servicesIncluded === "ambos" || data.servicesIncluded === "projeto";
  const hasPortfolio = !!(data.portfolioCards && data.portfolioCards.length > 0);

  const pages: React.ReactElement[] = [];

  for (const block of resolved) {
    if (!block.is_active) continue;
    const props: ProposalPageProps = { ...data, blockContent: block.content };

    if (isCustomBlock(block)) {
      const selected = data.previewAllCustomBlocks ? [block.key] : data.customBlockKeys;
      if (!includeCustomBlock(block, selected)) continue;
      if (block.type === "financial") pages.push(<ProposalCustomFinancialPage key={block.key} {...props} />);
      else if (block.type === "timeline") pages.push(<ProposalCustomTimelinePage key={block.key} {...props} />);
      else pages.push(<ProposalCustomCardsPage key={block.key} {...props} />);
      continue;
    }

    const key: ProposalBlockKey = block.key;

    switch (key) {
      case "cover":
        pages.push(<ProposalCoverPage key={key} {...props} />);
        break;
      case "about":
        pages.push(<ProposalAboutPage key={key} {...props} />);
        break;
      case "scope":
        pages.push(<ProposalScopeFlowPage key={key} {...props} />);
        break;
      case "interiores":
        if (showInteriores) pages.push(<ProposalInterioresPage key={key} {...props} />);
        break;
      case "management":
        pages.push(<ProposalManagementFullPage key={key} {...props} />);
        break;
      case "whyhire":
        pages.push(<ProposalWhyHireValuesPage key={key} {...props} />);
        break;
      case "portfolio":
        if (hasPortfolio) pages.push(<ProposalPortfolioCardsPage key={key} {...props} />);
        break;
      case "values":
        pages.push(<ProposalValuesPage key={key} {...props} />);
        break;
      case "contact":
        pages.push(<ProposalContactPage key={key} {...props} />);
        break;
    }
  }

  return pages;
}

/** Chaves de bloco das páginas montadas, na ordem em que saem no PDF. */
export function proposalPageKeys(pages: React.ReactElement[]): string[] {
  return pages.map((p) => String(p.key));
}
