import { ProposalAsset } from "@/hooks/useProposalAssets";

// Shared types and constants for proposal pages
export const COLORS = {
  azulMarinho: "#1B2A4A",
  begeClaro: "#F5E0D0",
  roseMauve: "#9B6B7B",
  textoClaro: "#F0DCC8",
  textoTituloVinho: "#8B4557",
  textoEscuro: "#1B2A4A",
  linhaDestaque: "#C4756E",
  shapeBege: "#D4B8A0",
} as const;

// 595×842 matches the HTML template dimensions
export const PAGE_W = 595;
export const PAGE_H = 842;

export const FONT_TITLE = "'Cormorant Garamond', serif";
export const FONT_BODY = "'Jost', sans-serif";

export interface ProposalPageProps {
  clientName?: string;
  projectName?: string;
  scopeDescription?: string;
  servicesIncluded?: string;
  timelineBriefing?: number;
  timelineStudy?: number;
  timelineAnteprojeto?: number;
  timelinePriorities?: number;
  timelineBudget?: number;
  timelineConstruction?: number;
  timelineMobilization?: number;
  timelineFiscalization?: number;
  priceFull?: number | null;
  priceCash?: number | null;
  installmentsCount?: number | null;
  installmentEntry?: number | null;
  installmentValue?: number | null;
  priceNote?: string;
  logoUrl?: string;
  founderPhotos?: ProposalAsset[];
  aboutText?: string;
  pillarTexts?: Record<string, string>;
  differentials?: string[];
  portfolioImages?: ProposalAsset[];
  feedbackImages?: ProposalAsset[];
  contactInstagram?: string;
  contactPhone1?: string;
  contactPhone2?: string;
  ambientes?: string[];
  totalArea?: number | null;
  etapasAtivas?: string[];
  portfolioCards?: { id: string; nome: string; foto_url: string; legenda?: string }[];
  pageWidth?: number;
  pageHeight?: number;
  validUntil?: string | null;
  /**
   * Blocos personalizados escolhidos nesta proposta (proposals.custom_block_keys).
   * null/ausente => proposta sem escolha salva: entram os marcados "Incluir por padrão".
   */
  customBlockKeys?: string[] | null;
  /** Só no preview do editor: mostra todos os blocos personalizados ativos. */
  previewAllCustomBlocks?: boolean;
  /** Conteúdo editável do bloco (proposal_blocks.content_json). Ausente => padrão. */
  blockContent?: unknown;
  /** Logo enviado em Configurações → Logo para fundos escuros (navy/rosé). */
  logoOnDarkUrl?: string;
  /** Logo enviado em Configurações → Logo para fundos claros (bege). */
  logoOnLightUrl?: string;
}

export function ValidityFooter({ validUntil, dark }: { validUntil?: string | null; dark?: boolean }) {
  if (!validUntil) return null;
  const parts = validUntil.split("-");
  const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : validUntil;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 14,
        left: 24,
        fontFamily: FONT_BODY,
        fontSize: 8,
        opacity: 0.4,
        color: dark ? "#F0DCC8" : "#1B2A4A",
      }}
    >
      Proposta válida até {formatted}
    </div>
  );
}

export function PageContainer({ bg, children, pageWidth, pageHeight }: { bg: string; children: React.ReactNode; pageWidth?: number; pageHeight?: number }) {
  const targetW = pageWidth || PAGE_W;
  const targetH = pageHeight || PAGE_H;
  const needsScale = targetW !== PAGE_W || targetH !== PAGE_H;

  if (!needsScale) {
    return (
      <div
        style={{
          width: PAGE_W,
          height: PAGE_H,
          background: bg,
          position: "relative",
          overflow: "hidden",
          fontFamily: FONT_BODY,
        }}
      >
        {children}
      </div>
    );
  }

  // Scale the original 595×842 content to fit the target dimensions
  const scaleX = targetW / PAGE_W;
  const scaleY = targetH / PAGE_H;

  return (
    <div
      style={{
        width: targetW,
        height: targetH,
        position: "relative",
        overflow: "hidden",
        background: bg,
      }}
    >
      <div
        style={{
          width: PAGE_W,
          height: PAGE_H,
          transform: `scale(${scaleX}, ${scaleY})`,
          transformOrigin: "top left",
          fontFamily: FONT_BODY,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function LogoQuadra() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        right: 28,
        fontFamily: FONT_BODY,
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: 3,
        color: COLORS.textoClaro,
        opacity: 0.7,
        lineHeight: 1,
        textAlign: "right",
      }}
    >
      QUA
      <small style={{ fontSize: 8, letterSpacing: 4, display: "block", marginTop: 2, fontWeight: 300 }}>DRA</small>
    </div>
  );
}

/**
 * Logo no canto da página. Usa a imagem enviada em Configurações → Logo
 * (uma para fundo escuro, outra para fundo claro); sem imagem, cai no
 * wordmark "QUA DRA" em texto.
 */
export function LogoSmall({
  url,
  urlOnDark,
  urlOnLight,
  variant = "onDark",
  position = "br",
}: {
  url?: string;
  urlOnDark?: string;
  urlOnLight?: string;
  variant?: "onDark" | "onLight";
  position?: "br" | "bl";
}) {
  const src = (variant === "onDark" ? urlOnDark : urlOnLight) ?? url;
  if (!src) return <LogoQuadra />;
  return (
    <img
      src={src}
      alt="Logo"
      crossOrigin="anonymous"
      style={{
        position: "absolute",
        bottom: 22,
        ...(position === "bl" ? { left: 28 } : { right: 28 }),
        height: 30,
        maxWidth: 110,
        objectFit: "contain",
        opacity: 0.9,
      }}
    />
  );
}

export function DecorativeShape({ position = "bl", color = COLORS.shapeBege }: { position?: "bl" | "br"; color?: string }) {
  return null; // Not used in new design
}

export function formatBRL(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
