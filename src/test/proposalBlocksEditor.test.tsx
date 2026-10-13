import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { defaultProposalBlocks, type ProposalBlock, type ProposalBlockUpsert } from "@/lib/proposalBlocks";

let blocksDoServidor: ProposalBlock[] = defaultProposalBlocks();
let textoQuemSomosAssets: string | null = null;
const saveMutate = vi.fn<(rows: ProposalBlockUpsert[]) => void>();

vi.mock("@/hooks/useProposalBlocks", () => ({
  useProposalBlocks: () => ({
    rows: [],
    blocks: blocksDoServidor,
    isLoading: false,
    isFetched: true,
    dataUpdatedAt: 1,
    save: { mutate: saveMutate, isPending: false },
  }),
}));

vi.mock("@/hooks/useProposalAssets", () => ({
  useProposalAssets: () => ({
    assets: [],
    isLoading: false,
    logos: [],
    founderPhotos: [{ id: "f1", category: "founder_photo", name: "Sócias 2026", file_url: "https://cdn/socias-2026.jpg" }],
    uploadFile: vi.fn(async () => "https://cdn/upload.jpg"),
    portfolio: [],
    feedbacks: [],
    texts: textoQuemSomosAssets
      ? [{ id: "t1", category: "text", name: "Quem Somos", description: textoQuemSomosAssets, metadata: { key: "quem_somos" } }]
      : [],
    contacts: [],
    byCategory: () => [],
  }),
}));

import ProposalBlocksEditor, { seedBlocksFromAssets } from "@/components/settings/proposal-blocks/ProposalBlocksEditor";

beforeEach(() => {
  blocksDoServidor = defaultProposalBlocks();
  textoQuemSomosAssets = null;
  saveMutate.mockReset();
});

const botaoSalvar = () => screen.getByRole("button", { name: /Salvar alterações/ });

describe("editor de blocos do PDF", () => {
  it("lista os 9 blocos com interruptor e começa sem alterações pendentes", () => {
    render(<ProposalBlocksEditor />);
    expect(screen.getAllByRole("switch")).toHaveLength(9);
    expect(screen.getByText("9 de 9 blocos ativos", { exact: false })).toBeInTheDocument();
    expect(botaoSalvar()).toBeDisabled();
  });

  it("desligar Projeto de Interiores e salvar persiste is_active=false", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("switch", { name: "Ativar bloco Projeto de Interiores" }));

    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument();
    expect(screen.getByText("8 de 9 blocos ativos", { exact: false })).toBeInTheDocument();

    fireEvent.click(botaoSalvar());
    expect(saveMutate).toHaveBeenCalledTimes(1);
    const rows = saveMutate.mock.calls[0][0];
    expect(rows).toHaveLength(9);
    expect(rows.find((r) => r.key === "interiores")).toMatchObject({ is_active: false, display_order: 3 });
    expect(rows.find((r) => r.key === "cover")).toMatchObject({ is_active: true, display_order: 0 });
  });

  it("bloco desligado mostra aviso no preview em vez da página", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("switch", { name: "Ativar bloco Projeto de Interiores" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar Projeto de Interiores" }));
    expect(screen.getByTestId("preview-empty")).toHaveTextContent("está desligado e não entra no PDF");
  });

  it("editar o texto de Quem Somos reflete no preview e vai no content_json ao salvar", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Quem Somos" }));

    const campo = screen.getByLabelText("Texto") as HTMLTextAreaElement;
    fireEvent.change(campo, { target: { value: "Somos a Quadra, **desde 2022**." } });

    // Preview em tempo real: a página Quem Somos renderiza o texto novo.
    expect(screen.getByText("desde 2022").tagName).toBe("STRONG");

    fireEvent.click(botaoSalvar());
    const about = saveMutate.mock.calls[0][0].find((r) => r.key === "about")!;
    expect(about.content_json.body).toBe("Somos a Quadra, **desde 2022**.");
    expect(about.content_json.title).toBe("Quem Somos");
  });

  it("enquanto o bloco está no padrão, Quem Somos é semeado com o texto fixo dos assets", () => {
    textoQuemSomosAssets = "Texto antigo dos assets";
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Quem Somos" }));
    expect((screen.getByLabelText("Texto") as HTMLTextAreaElement).value).toBe("Texto antigo dos assets");
    expect(botaoSalvar()).toBeDisabled();
  });

  it("retirar um pilar do Gerenciamento de Obra remove o card", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Gerenciamento de Obra" }));
    const bloco = screen.getByTestId("block-management");
    expect(within(bloco).getAllByTestId(/management-cards-card-/)).toHaveLength(6);

    fireEvent.click(within(bloco).getByRole("button", { name: "Remover Pilares 6" }));
    expect(within(bloco).getAllByTestId(/management-cards-card-/)).toHaveLength(5);

    fireEvent.click(botaoSalvar());
    const mgmt = saveMutate.mock.calls[0][0].find((r) => r.key === "management")!;
    const cards = mgmt.content_json.cards as { title: string }[];
    expect(cards.map((c) => c.title)).not.toContain("Gestão de Pessoas");
    expect(cards).toHaveLength(5);
  });

  it("Descartar volta ao estado do servidor", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("switch", { name: "Ativar bloco Capa" }));
    expect(botaoSalvar()).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Descartar/ }));
    expect(botaoSalvar()).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Ativar bloco Capa" })).toHaveAttribute("aria-checked", "true");
  });

  it("ordem salva no servidor é a ordem exibida", () => {
    const base = defaultProposalBlocks();
    const contato = base[8];
    blocksDoServidor = [contato, ...base.slice(0, 8)].map((b, i) => ({ ...b, display_order: i }));
    render(<ProposalBlocksEditor />);
    const nomes = screen.getAllByRole("switch").map((s) => s.getAttribute("aria-label"));
    expect(nomes[0]).toBe("Ativar bloco Contato");
    expect(nomes[1]).toBe("Ativar bloco Capa");
  });
});

describe("estruturas editáveis (etapas e fotos)", () => {
  it("adiciona uma etapa nova ao fluxo, com prazo fixo, e salva com key própria", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Escopo e Processo" }));
    const bloco = screen.getByTestId("block-scope");
    expect(within(bloco).getAllByTestId(/scope-steps-card-/)).toHaveLength(7);

    fireEvent.click(within(bloco).getByRole("button", { name: /Adicionar/ }));
    const cards = within(bloco).getAllByTestId(/scope-steps-card-/);
    expect(cards).toHaveLength(8);
    expect(cards[7]).toHaveTextContent("Etapa nova");
    fireEvent.change(within(cards[7]).getByLabelText("Etapas do processo 8: Título"), { target: { value: "Vistoria final" } });
    fireEvent.change(within(cards[7]).getByLabelText("Etapas do processo 8: Prazo"), { target: { value: "2 dias" } });

    // Etapa original não tem campo de prazo (vem da proposta).
    expect(within(cards[0]).queryByLabelText("Etapas do processo 1: Prazo")).not.toBeInTheDocument();
    expect(cards[0]).toHaveTextContent("prazo vem da proposta");

    fireEvent.click(botaoSalvar());
    const scope = saveMutate.mock.calls[0][0].find((r) => r.key === "scope")!;
    const steps = scope.content_json.steps as { key: string; title: string; meta?: string }[];
    expect(steps).toHaveLength(8);
    expect(steps[7]).toMatchObject({ title: "Vistoria final", meta: "2 dias" });
    expect(steps[7].key).toMatch(/^etapa-/);
  });

  it("foto das sócias pode ser escolhida entre as enviadas em Configurações e volta ao padrão", () => {
    render(<ProposalBlocksEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Quem Somos" }));
    fireEvent.click(screen.getByRole("button", { name: "Usar Sócias 2026" }));
    expect((screen.getByLabelText("Foto das sócias") as HTMLInputElement).value).toBe("https://cdn/socias-2026.jpg");
    // preview reflete
    expect(screen.getByAltText("Camilla e Mariana")).toHaveAttribute("src", "https://cdn/socias-2026.jpg");

    fireEvent.click(botaoSalvar());
    const about = saveMutate.mock.calls[0][0].find((r) => r.key === "about")!;
    expect(about.content_json.photoUrl).toBe("https://cdn/socias-2026.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Usar padrão" }));
    expect((screen.getByLabelText("Foto das sócias") as HTMLInputElement).value).toBe("");
  });
});

describe("seedBlocksFromAssets", () => {
  it("só substitui o corpo de Quem Somos quando o bloco ainda está no padrão", () => {
    const base = defaultProposalBlocks();
    const seeded = seedBlocksFromAssets(base, "Dos assets");
    expect((seeded.find((b) => b.key === "about")!.content as { body: string }).body).toBe("Dos assets");

    const jaSalvo = base.map((b) => (b.key === "about" ? { ...b, isDefault: false } : b));
    const naoMexe = seedBlocksFromAssets(jaSalvo, "Dos assets");
    expect((naoMexe.find((b) => b.key === "about")!.content as { body: string }).body).not.toBe("Dos assets");

    expect(seedBlocksFromAssets(base, "   ")).toBe(base);
  });
});
