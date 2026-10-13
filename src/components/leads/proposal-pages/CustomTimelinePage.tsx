import { PageContainer, COLORS, FONT_TITLE, FONT_BODY, ValidityFooter, type ProposalPageProps } from "./shared";
import { RichText } from "./RichText";
import { customBlockContent } from "@/lib/proposalCustomBlocks";

/** Bloco personalizado "Linha do tempo": etapas na vertical, marcos em destaque. */
export function ProposalCustomTimelinePage(props: ProposalPageProps) {
  const c = customBlockContent("timeline", props.blockContent);
  const compact = c.steps.length > 6;

  return (
    <PageContainer bg={COLORS.azulMarinho} pageWidth={props.pageWidth} pageHeight={props.pageHeight}>
      <div style={{ padding: "52px 52px 44px", color: COLORS.textoClaro, height: "100%", display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontFamily: FONT_TITLE, fontSize: 28, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>{c.title}</h2>
        <div style={{ width: 48, height: 2, background: COLORS.linhaDestaque, margin: "10px 0 12px" }} />
        {c.subtitle && <p style={{ fontFamily: FONT_BODY, fontSize: 11, opacity: 0.85, margin: "0 0 24px" }}>{c.subtitle}</p>}

        <div style={{ position: "relative", paddingLeft: 28 }}>
          <div style={{ position: "absolute", left: 7, top: 6, bottom: 6, width: 1, background: "rgba(240,220,200,0.35)" }} />
          {c.steps.map((step, i) => (
            <div key={i} style={{ position: "relative", marginBottom: compact ? 12 : 20 }} data-testid="timeline-step">
              <span
                style={{
                  position: "absolute",
                  left: step.milestone ? -27 : -25,
                  top: 3,
                  width: step.milestone ? 14 : 10,
                  height: step.milestone ? 14 : 10,
                  background: step.milestone ? COLORS.linhaDestaque : COLORS.azulMarinho,
                  border: `2px solid ${step.milestone ? COLORS.linhaDestaque : COLORS.textoClaro}`,
                  transform: step.milestone ? "rotate(45deg)" : undefined,
                  borderRadius: step.milestone ? 2 : "50%",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                {step.date && (
                  <span style={{ fontFamily: FONT_TITLE, fontSize: compact ? 12 : 14, fontStyle: "italic", color: COLORS.linhaDestaque, minWidth: 74 }}>{step.date}</span>
                )}
                <h4 style={{ fontFamily: FONT_BODY, fontSize: compact ? 10 : 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", margin: 0 }}>
                  {step.title}
                  {step.milestone && <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", opacity: 0.7 }}> · marco</span>}
                </h4>
              </div>
              {step.desc && (
                <p style={{ fontFamily: FONT_BODY, fontSize: compact ? 9 : 10, lineHeight: 1.55, opacity: 0.85, margin: "4px 0 0" }}>
                  <RichText text={step.desc} />
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <ValidityFooter validUntil={props.validUntil} dark />
    </PageContainer>
  );
}
