import { PageContainer, COLORS, FONT_TITLE, FONT_BODY, ValidityFooter, type ProposalPageProps } from "./shared";
import { RichText } from "./RichText";
import { columnTotals, customBlockContent, formatFinancialValue } from "@/lib/proposalCustomBlocks";

/** Bloco personalizado "Estudo de viabilidade financeira": tabelas de números. */
export function ProposalCustomFinancialPage(props: ProposalPageProps) {
  const c = customBlockContent("financial", props.blockContent);
  const compact = c.tables.reduce((n, t) => n + t.rows.length + 2, 0) > 14;
  const cell: React.CSSProperties = { padding: compact ? "5px 8px" : "8px 10px", fontSize: compact ? 9 : 10, borderBottom: `1px solid ${COLORS.shapeBege}` };

  return (
    <PageContainer bg={COLORS.begeClaro} pageWidth={props.pageWidth} pageHeight={props.pageHeight}>
      <div style={{ padding: "52px 48px 44px", color: COLORS.textoEscuro, height: "100%", display: "flex", flexDirection: "column", gap: compact ? 14 : 20 }}>
        <div>
          <h2 style={{ fontFamily: FONT_TITLE, fontSize: 28, fontWeight: 600, color: COLORS.textoTituloVinho, textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>
            {c.title}
          </h2>
          <div style={{ width: 48, height: 2, background: COLORS.linhaDestaque, margin: "10px 0 12px" }} />
          {c.intro && (
            <p style={{ fontFamily: FONT_BODY, fontSize: 11, lineHeight: 1.6, margin: 0 }}>
              <RichText text={c.intro} />
            </p>
          )}
        </div>

        {c.tables.map((table, ti) => {
          const totals = table.showTotal ? columnTotals(table) : null;
          return (
            <div key={ti} data-testid="financial-table">
              {table.title && (
                <h3 style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: COLORS.roseMauve, margin: "0 0 6px" }}>
                  {table.title}
                </h3>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY, background: "rgba(255,255,255,0.55)" }}>
                <thead>
                  <tr style={{ background: COLORS.azulMarinho, color: COLORS.textoClaro }}>
                    <th style={{ ...cell, textAlign: "left", fontWeight: 600, borderBottom: "none" }} />
                    {table.columns.map((col, ci) => (
                      <th key={ci} style={{ ...cell, textAlign: "right", fontWeight: 600, borderBottom: "none" }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr key={ri}>
                      <td style={{ ...cell, textAlign: "left" }}>{row.label}</td>
                      {table.columns.map((_, ci) => (
                        <td key={ci} style={{ ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {formatFinancialValue(row.values[ci] ?? null, table.format)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {totals && (
                    <tr style={{ fontWeight: 700 }}>
                      <td style={{ ...cell, textAlign: "left", borderBottom: "none" }}>Total</td>
                      {totals.map((t, ci) => (
                        <td key={ci} style={{ ...cell, textAlign: "right", borderBottom: "none", fontVariantNumeric: "tabular-nums" }}>
                          {formatFinancialValue(t, table.format)}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })}

        {c.note && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 9, fontStyle: "italic", opacity: 0.75, marginTop: "auto" }}>
            <RichText text={c.note} />
          </p>
        )}
      </div>
      <ValidityFooter validUntil={props.validUntil} />
    </PageContainer>
  );
}
