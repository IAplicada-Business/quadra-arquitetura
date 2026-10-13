import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  columnTotals,
  customBlockContent,
  customBlockType,
  defaultCustomContent,
  formatFinancialValue,
  includeCustomBlock,
  newCustomBlockKey,
  parseBRNumber,
} from "@/lib/proposalCustomBlocks";
import {
  defaultProposalBlocks,
  isCustomBlock,
  resolveProposalBlocks,
  toProposalBlockUpserts,
  type ProposalBlock,
  type ProposalBlockRow,
  type ProposalBlockUpsert,
} from "@/lib/proposalBlocks";
import { buildProposalPages, proposalPageKeys } from "@/components/leads/ProposalPageRenderer";

function row(partial: Partial<ProposalBlockRow> & { key: string }): ProposalBlockRow {
  return {
    id: partial.key, team_id: "t", user_id: "u", label: "", display_order: 0, is_active: true, content_json: {},
    created_at: "", updated_at: "", ...partial,
  };
}

describe("modelo dos blocos personalizados", () => {
  it("o tipo sai da chave; chave nova é única", () => {
    expect(customBlockType("custom-financial-ab12cd")).toBe("financial");
    expect(customBlockType("custom-timeline-x9y8z7")).toBe("timeline");
    expect(customBlockType("custom-video-ab12cd")).toBeNull();
    expect(customBlockType("cover")).toBeNull();
    const k = newCustomBlockKey("cards", ["custom-cards-aaaaaa"]);
    expect(customBlockType(k)).toBe("cards");
  });

  it("sanitiza a tabela: uma célula por coluna, só números", () => {
    const c = customBlockContent("financial", {
      title: "Viabilidade",
      tables: [{ title: "T", columns: ["A", "B"], rows: [{ label: "Invest.", values: [100, "x", 3] }, { label: "Só A", values: [50] }], format: "percent", showTotal: true }],
    });
    expect(c.tables[0].rows).toEqual([{ label: "Invest.", values: [100, null] }, { label: "Só A", values: [50, null] }]);
    expect(c.tables[0].format).toBe("percent");
    expect(c.includeByDefault).toBe(false);
    expect(columnTotals(c.tables[0])).toEqual([150, null]);
  });

  it("conteúdo inválido cai no padrão do tipo", () => {
    expect(customBlockContent("timeline", "lixo")).toEqual(defaultCustomContent("timeline"));
    expect(customBlockContent("cards", { columns: 7 }).columns).toBe(2);
  });

  it("números digitados em pt-BR", () => {
    expect(parseBRNumber("1.234,56")).toBe(1234.56);
    expect(parseBRNumber("R$ 2.000")).toBe(2000);
    expect(parseBRNumber("12,5%")).toBe(12.5);
    expect(parseBRNumber("1500")).toBe(1500);
    expect(parseBRNumber("")).toBeNull();
    expect(parseBRNumber("abc")).toBeNull();
    expect(formatFinancialValue(1234.5, "currency")).toMatch(/^R\$\s1\.234,50$/);
    expect(formatFinancialValue(12.5, "percent")).toBe("12,5%");
    expect(formatFinancialValue(null, "number")).toBe("—");
  });

  it("resolve mantém blocos personalizados na ordem salva e ignora tipo desconhecido", () => {
    const blocks = resolveProposalBlocks([
      row({ key: "cover", display_order: 0 }),
      row({ key: "custom-timeline-abc123", display_order: 1, label: "Etapas Silva" }),
      row({ key: "custom-video-abc123", display_order: 2 }),
    ]);
    expect(blocks.map((b) => b.key).slice(0, 2)).toEqual(["cover", "custom-timeline-abc123"]);
    expect(blocks).toHaveLength(10); // 9 fixos + 1 personalizado
    const custom = blocks.find(isCustomBlock)!;
    expect(custom).toMatchObject({ type: "timeline", label: "Etapas Silva" });
    expect(toProposalBlockUpserts(blocks).map((u) => u.key)).toContain("custom-timeline-abc123");
  });

  it("entra no PDF se a proposta escolheu; sem escolha salva, só os 'Incluir por padrão'", () => {
    const b = { key: "custom-cards-abc123", is_active: true, content: { includeByDefault: false } };
    expect(includeCustomBlock(b, ["custom-cards-abc123"])).toBe(true);
    expect(includeCustomBlock(b, [])).toBe(false);
    expect(includeCustomBlock(b, null)).toBe(false);
    expect(includeCustomBlock({ ...b, content: { includeByDefault: true } }, null)).toBe(true);
    expect(includeCustomBlock({ ...b, is_active: false }, ["custom-cards-abc123"])).toBe(false);
  });
});

describe("páginas do PDF dos blocos personalizados", () => {
  const blocks = resolveProposalBlocks([
    row({
      key: "custom-financial-fin001", display_order: 9, label: "Viabilidade",
      content_json: {
        title: "Estudo de viabilidade",
        tables: [{ title: "Retorno", columns: ["Cenário A"], rows: [{ label: "Investimento", values: [450000] }, { label: "Receita", values: [72000] }], format: "currency", showTotal: true }],
      },
    }),
    row({ key: "custom-timeline-tim001", display_order: 10, content_json: { includeByDefault: true, title: "Linha do tempo", steps: [{ title: "Briefing", date: "Semana 1", desc: "", milestone: false }, { title: "Entrega", date: "Semana 12", desc: "", milestone: true }] } }),
    row({ key: "custom-cards-car001", display_order: 11, content_json: { title: "Módulos", columns: 3, cards: [{ title: "Marcenaria", text: "Móveis sob medida", imageUrl: "https://cdn/m.jpg" }] } }),
  ]);
  const data = { clientName: "Ana", servicesIncluded: "ambos" };

  it("proposta escolhe quais entram; antiga (sem escolha) leva só o 'Incluir por padrão'", () => {
    expect(proposalPageKeys(buildProposalPages({ data: { ...data, customBlockKeys: ["custom-financial-fin001"] }, blocks }))).toContain("custom-financial-fin001");
    const semEscolha = proposalPageKeys(buildProposalPages({ data, blocks }));
    expect(semEscolha).toContain("custom-timeline-tim001");
    expect(semEscolha).not.toContain("custom-financial-fin001");
    expect(semEscolha).not.toContain("custom-cards-car001");
  });

  it("estudo de viabilidade mostra a tabela formatada com total", () => {
    const pages = buildProposalPages({ data: { ...data, customBlockKeys: ["custom-financial-fin001"] }, blocks });
    render(pages.find((p) => p.key === "custom-financial-fin001")!);
    const table = screen.getByTestId("financial-table");
    expect(table).toHaveTextContent("Investimento");
    expect(table).toHaveTextContent("R$ 450.000,00");
    expect(table).toHaveTextContent("Total");
    expect(table).toHaveTextContent("R$ 522.000,00");
  });

  it("linha do tempo e cartões renderizam etapas, marcos, imagem", () => {
    const pages = buildProposalPages({ data: { ...data, customBlockKeys: ["custom-timeline-tim001", "custom-cards-car001"] }, blocks });
    const { unmount } = render(pages.find((p) => p.key === "custom-timeline-tim001")!);
    expect(screen.getAllByTestId("timeline-step")).toHaveLength(2);
    expect(screen.getByText(/· marco/)).toBeInTheDocument();
    unmount();
    render(pages.find((p) => p.key === "custom-cards-car001")!);
    expect(screen.getByTestId("custom-card")).toHaveTextContent("Marcenaria");
    expect((screen.getByAltText("Marcenaria") as HTMLImageElement).src).toBe("https://cdn/m.jpg");
  });

  it("bloco desligado não entra nem escolhido", () => {
    const off = blocks.map((b) => (b.key === "custom-cards-car001" ? { ...b, is_active: false } : b)) as ProposalBlock[];
    expect(proposalPageKeys(buildProposalPages({ data: { ...data, customBlockKeys: ["custom-cards-car001"] }, blocks: off }))).not.toContain("custom-cards-car001");
  });
});

/* ---------- editor ---------- */

let blocksDoServidor: ProposalBlock[] = defaultProposalBlocks();
const saveMutate = vi.fn<(rows: ProposalBlockUpsert[]) => void>();

vi.mock("@/hooks/useProposalBlocks", () => ({
  useProposalBlocks: () => ({ rows: [], blocks: blocksDoServidor, isLoading: false, isFetched: true, dataUpdatedAt: 1, save: { mutate: saveMutate, isPending: false } }),
}));
vi.mock("@/hooks/useProposalAssets", () => ({
  useProposalAssets: () => ({ assets: [], isLoading: false, logos: [], founderPhotos: [], uploadFile: vi.fn(async () => "https://cdn/upload.jpg"), portfolio: [], feedbacks: [], texts: [], contacts: [], byCategory: () => [] }),
}));

import ProposalBlocksEditor from "@/components/settings/proposal-blocks/ProposalBlocksEditor";

beforeEach(() => {
  blocksDoServidor = defaultProposalBlocks();
  saveMutate.mockReset();
});

describe("editor: criar blocos a partir dos tipos", () => {
  it("cria estudo de viabilidade, edita número em pt-BR e salva com o tipo na chave", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("button", { name: /Novo bloco/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Estudo de viabilidade financeira/ }));
    fireEvent.change(screen.getByLabelText("Nome do bloco (só no admin)"), { target: { value: "Viabilidade — Silva" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar bloco" }));

    expect(screen.getAllByRole("switch", { name: /Ativar bloco/ })).toHaveLength(10);
    const cell = screen.getByLabelText("Tabela 1: Investimento total × Cenário A") as HTMLInputElement;
    fireEvent.change(cell, { target: { value: "1.234.567,89" } });
    fireEvent.blur(cell);

    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    const rows = saveMutate.mock.calls[0][0];
    const custom = rows.find((r) => r.key.startsWith("custom-financial-"))!;
    expect(custom.label).toBe("Viabilidade — Silva");
    expect(custom.display_order).toBe(9);
    const tables = (custom.content_json as { tables: { rows: { values: (number | null)[] }[] }[] }).tables;
    expect(tables[0].rows[0].values[0]).toBe(1234567.89);
  });

  it("cartões e linha do tempo: adicionar item e duplicar bloco", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("button", { name: /Novo bloco/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Cartões/ }));
    fireEvent.click(screen.getByRole("button", { name: "Criar bloco" }));
    fireEvent.click(screen.getByRole("button", { name: /^Cartão$/ }));
    fireEvent.change(screen.getByLabelText("Cartão 3: título"), { target: { value: "Paisagismo" } });
    fireEvent.click(screen.getByRole("button", { name: /Duplicar bloco/ }));

    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    const rows = saveMutate.mock.calls[0][0].filter((r) => r.key.startsWith("custom-cards-"));
    expect(rows).toHaveLength(2);
    expect(rows[1].label).toMatch(/\(cópia\)$/);
    for (const r of rows) {
      expect((r.content_json as { cards: { title: string }[] }).cards.map((c) => c.title)).toContain("Paisagismo");
    }
  });

  it("excluir bloco personalizado pede confirmação e tira do salvar; fixos não têm excluir", () => {
    blocksDoServidor = resolveProposalBlocks([row({ key: "custom-timeline-tim001", display_order: 0, label: "Etapas" })]);
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Etapas" }));
    fireEvent.click(screen.getByRole("button", { name: /Excluir bloco/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir bloco" }));
    fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/ }));
    expect(saveMutate.mock.calls[0][0].map((r) => r.key)).not.toContain("custom-timeline-tim001");

    fireEvent.click(screen.getByRole("button", { name: "Editar Capa" }));
    expect(screen.queryByRole("button", { name: /Excluir bloco/ })).not.toBeInTheDocument();
  });
});
