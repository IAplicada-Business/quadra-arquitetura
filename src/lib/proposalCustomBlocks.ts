// Blocos personalizados do PDF da proposta: tipos que a equipe usa para
// criar blocos novos sem chamar dev (estudo de viabilidade financeira,
// linha do tempo, cartões). Cada bloco criado é uma linha em
// proposal_blocks com chave "custom-<tipo>-<id>"; o tipo sai da chave,
// então a tabela não precisou mudar.
//
// Diferente dos 9 blocos fixos, um bloco personalizado não entra em toda
// proposta: cada proposta escolhe quais incluir (proposals.custom_block_keys).
// Com "Incluir por padrão" ligado, ele vem marcado em propostas novas e
// entra nas antigas, que não têm escolha salva.

export type CustomBlockType = "financial" | "timeline" | "cards";
export type CustomBlockKey = `custom-${CustomBlockType}-${string}`;

const KEY_RE = /^custom-(financial|timeline|cards)-[a-z0-9]{4,}$/;

export function customBlockType(key: string | null | undefined): CustomBlockType | null {
  const m = (key ?? "").match(KEY_RE);
  return m ? (m[1] as CustomBlockType) : null;
}

export function isCustomBlockKey(key: string | null | undefined): key is CustomBlockKey {
  return customBlockType(key) != null;
}

export function newCustomBlockKey(type: CustomBlockType, existing: string[] = []): CustomBlockKey {
  const taken = new Set(existing);
  for (let i = 0; i < 50; i++) {
    const id = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
    const key = `custom-${type}-${id}` as CustomBlockKey;
    if (!taken.has(key)) return key;
  }
  return `custom-${type}-${Date.now().toString(36)}` as CustomBlockKey;
}

/* ------------------------------------------------------------------ */
/* Conteúdo por tipo                                                   */
/* ------------------------------------------------------------------ */

export type FinancialFormat = "currency" | "number" | "percent";

export interface FinancialRow {
  label: string;
  /** Um valor por coluna; null = célula vazia. */
  values: (number | null)[];
}

export interface FinancialTable {
  title: string;
  columns: string[];
  rows: FinancialRow[];
  format: FinancialFormat;
  /** Linha de total no fim (soma por coluna). */
  showTotal: boolean;
}

export interface FinancialContent {
  includeByDefault: boolean;
  title: string;
  intro: string;
  tables: FinancialTable[];
  note: string;
}

export interface TimelineStep {
  title: string;
  /** Texto livre: "Mar/2027", "Semana 3", "30 dias". */
  date: string;
  desc: string;
  /** Marco (destaque na linha do tempo). */
  milestone: boolean;
}

export interface TimelineContent {
  includeByDefault: boolean;
  title: string;
  subtitle: string;
  steps: TimelineStep[];
}

export interface CardItem {
  title: string;
  text: string;
  imageUrl: string;
}

export interface CardsContent {
  includeByDefault: boolean;
  title: string;
  subtitle: string;
  columns: 2 | 3;
  cards: CardItem[];
}

export interface CustomContentMap {
  financial: FinancialContent;
  timeline: TimelineContent;
  cards: CardsContent;
}

export interface CustomBlockTypeDef {
  type: CustomBlockType;
  label: string;
  description: string;
}

export const CUSTOM_BLOCK_TYPES: CustomBlockTypeDef[] = [
  {
    type: "financial",
    label: "Estudo de viabilidade financeira",
    description: "Tabelas de números editáveis (investimento, receitas, retorno), com total por coluna.",
  },
  {
    type: "timeline",
    label: "Linha do tempo",
    description: "Etapas em sequência com data/prazo, descrição e marcos em destaque.",
  },
  {
    type: "cards",
    label: "Cartões",
    description: "Grade de cartões com título, texto curto e imagem (módulos, diferenciais, produtos).",
  },
];

export function customTypeDef(type: CustomBlockType): CustomBlockTypeDef {
  return CUSTOM_BLOCK_TYPES.find((t) => t.type === type)!;
}

export function defaultCustomContent<T extends CustomBlockType>(type: T): CustomContentMap[T] {
  const byType: CustomContentMap = {
    financial: {
      includeByDefault: false,
      title: "Estudo de viabilidade financeira",
      intro: "Comparativo dos cenários estudados para o projeto.",
      tables: [
        {
          title: "Investimento e retorno",
          columns: ["Cenário A", "Cenário B"],
          rows: [
            { label: "Investimento total", values: [450000, 520000] },
            { label: "Receita anual estimada", values: [72000, 90000] },
            { label: "Custos anuais", values: [12000, 15000] },
          ],
          format: "currency",
          showTotal: false,
        },
      ],
      note: "Valores estimados; serão confirmados no orçamento executivo.",
    },
    timeline: {
      includeByDefault: false,
      title: "Linha do tempo",
      subtitle: "As etapas do seu projeto, do primeiro encontro à entrega.",
      steps: [
        { title: "Briefing", date: "Semana 1", desc: "Entendemos a rotina e os desejos de vocês.", milestone: false },
        { title: "Estudo preliminar", date: "Semana 3", desc: "Primeira proposta de layout para aprovação.", milestone: true },
        { title: "Projeto executivo", date: "Semana 8", desc: "Detalhamento completo para a obra.", milestone: false },
        { title: "Entrega", date: "Semana 12", desc: "Pranchas finais e acompanhamento da obra.", milestone: true },
      ],
    },
    cards: {
      includeByDefault: false,
      title: "Módulos do projeto",
      subtitle: "Escolha os módulos que fazem sentido para vocês.",
      columns: 2,
      cards: [
        { title: "Módulo 1", text: "Descrição curta do que este módulo entrega.", imageUrl: "" },
        { title: "Módulo 2", text: "Descrição curta do que este módulo entrega.", imageUrl: "" },
      ],
    },
  };
  return structuredCloneSafe(byType[type]) as CustomContentMap[T];
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/* ------------------------------------------------------------------ */
/* Sanitização (o conteúdo vem de JSON do banco)                       */
/* ------------------------------------------------------------------ */

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : fallback);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function sanitizeTable(raw: unknown): FinancialTable | null {
  const t = obj(raw);
  if (!t) return null;
  const columns = arr(t.columns).filter((c): c is string => typeof c === "string");
  const rows = arr(t.rows)
    .map(obj)
    .filter((r): r is Record<string, unknown> => !!r)
    .map((r) => {
      const values = arr(r.values).map(num);
      // Uma célula por coluna: corta o excesso e completa com vazio.
      const fitted = columns.map((_, i) => values[i] ?? null);
      return { label: str(r.label), values: fitted };
    });
  const format = t.format === "number" || t.format === "percent" ? t.format : "currency";
  return { title: str(t.title), columns, rows, format, showTotal: bool(t.showTotal) };
}

export function customBlockContent<T extends CustomBlockType>(type: T, raw?: unknown): CustomContentMap[T] {
  const d = defaultCustomContent(type) as unknown as Record<string, unknown>;
  const r = obj(raw);
  if (!r) return d as unknown as CustomContentMap[T];
  const includeByDefault = bool(r.includeByDefault, false);

  if (type === "financial") {
    const tables = Array.isArray(r.tables) ? r.tables.map(sanitizeTable).filter((t): t is FinancialTable => !!t) : (d.tables as FinancialTable[]);
    const out: FinancialContent = { includeByDefault, title: str(r.title, d.title as string), intro: str(r.intro, d.intro as string), tables, note: str(r.note, d.note as string) };
    return out as CustomContentMap[T];
  }
  if (type === "timeline") {
    const steps = Array.isArray(r.steps)
      ? r.steps.map(obj).filter((s): s is Record<string, unknown> => !!s).map((s) => ({ title: str(s.title), date: str(s.date), desc: str(s.desc), milestone: bool(s.milestone) }))
      : (d.steps as TimelineStep[]);
    const out: TimelineContent = { includeByDefault, title: str(r.title, d.title as string), subtitle: str(r.subtitle, d.subtitle as string), steps };
    return out as CustomContentMap[T];
  }
  const cards = Array.isArray(r.cards)
    ? r.cards.map(obj).filter((c): c is Record<string, unknown> => !!c).map((c) => ({ title: str(c.title), text: str(c.text), imageUrl: str(c.imageUrl) }))
    : (d.cards as CardItem[]);
  const out: CardsContent = { includeByDefault, title: str(r.title, d.title as string), subtitle: str(r.subtitle, d.subtitle as string), columns: r.columns === 3 ? 3 : 2, cards };
  return out as CustomContentMap[T];
}

/* ------------------------------------------------------------------ */
/* Números                                                             */
/* ------------------------------------------------------------------ */

/**
 * Lê número digitado em pt-BR: "1.234,56", "1234,5", "R$ 2.000", "12%".
 * Devolve null para vazio ou texto inválido.
 */
export function parseBRNumber(text: string): number | null {
  const t = text.replace(/[R$%\s]/g, "");
  if (!t) return null;
  let normalized = t;
  if (t.includes(",")) normalized = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) normalized = t.replace(/\./g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatFinancialValue(value: number | null, format: FinancialFormat): string {
  if (value == null) return "—";
  if (format === "currency") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
  if (format === "percent") return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}%`;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

/** Total por coluna (células vazias não contam; coluna toda vazia => null). */
export function columnTotals(table: FinancialTable): (number | null)[] {
  return table.columns.map((_, ci) => {
    const vals = table.rows.map((r) => r.values[ci]).filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  });
}

/* ------------------------------------------------------------------ */
/* Escolha por proposta                                                */
/* ------------------------------------------------------------------ */

/**
 * Um bloco personalizado entra no PDF quando está ativo e: a proposta o
 * escolheu; ou a proposta não tem escolha salva (antiga / preview) e o
 * bloco está marcado "Incluir por padrão".
 */
export function includeCustomBlock(
  block: { key: string; is_active: boolean; content: { includeByDefault: boolean } },
  selectedKeys: string[] | null | undefined,
): boolean {
  if (!block.is_active) return false;
  if (selectedKeys == null) return block.content.includeByDefault;
  return selectedKeys.includes(block.key);
}
