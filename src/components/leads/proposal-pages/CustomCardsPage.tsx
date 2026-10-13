import { PageContainer, COLORS, FONT_TITLE, FONT_BODY, ValidityFooter, type ProposalPageProps } from "./shared";
import { RichText } from "./RichText";
import { customBlockContent } from "@/lib/proposalCustomBlocks";

/** Bloco personalizado "Cartões": grade com título, texto curto e imagem. */
export function ProposalCustomCardsPage(props: ProposalPageProps) {
  const c = customBlockContent("cards", props.blockContent);
  const cols = c.columns;
  const rows = Math.max(1, Math.ceil(c.cards.length / cols));
  const imageH = rows >= 3 ? 70 : cols === 3 ? 90 : 120;

  return (
    <PageContainer bg={COLORS.begeClaro} pageWidth={props.pageWidth} pageHeight={props.pageHeight}>
      <div style={{ padding: "52px 44px 44px", color: COLORS.textoEscuro, height: "100%", display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontFamily: FONT_TITLE, fontSize: 28, fontWeight: 600, color: COLORS.textoTituloVinho, textTransform: "uppercase", letterSpacing: 2, margin: 0, textAlign: "center" }}>
          {c.title}
        </h2>
        {c.subtitle && <p style={{ fontFamily: FONT_BODY, fontSize: 11, textAlign: "center", margin: "10px 0 0" }}>{c.subtitle}</p>}

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginTop: 28 }}>
          {c.cards.map((card, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 6, overflow: "hidden", border: `1px solid ${COLORS.shapeBege}` }} data-testid="custom-card">
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.title} crossOrigin="anonymous" style={{ width: "100%", height: imageH, objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ height: 6, background: COLORS.linhaDestaque }} />
              )}
              <div style={{ padding: "12px 14px 14px" }}>
                <h4 style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: COLORS.textoTituloVinho, margin: 0 }}>
                  {card.title}
                </h4>
                {card.text && (
                  <p style={{ fontFamily: FONT_BODY, fontSize: 9.5, lineHeight: 1.55, margin: "6px 0 0" }}>
                    <RichText text={card.text} />
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ValidityFooter validUntil={props.validUntil} />
    </PageContainer>
  );
}
