/**
 * Blocos configuráveis do PDF da proposta.
 *
 * Cada página do gerador de 9 páginas vira um "bloco" com chave fixa.
 * O time liga/desliga, reordena e edita os textos de cada bloco na aba
 * Configurações → Proposta → Blocos do PDF. O que fica salvo em
 * `proposal_blocks` é só o que difere do padrão abaixo; a leitura sempre
 * faz merge com o padrão, então uma tabela vazia gera o PDF de sempre.
 */

export type ProposalBlockKey =
  | "cover"
  | "about"
  | "scope"
  | "interiores"
  | "management"
  | "whyhire"
  | "portfolio"
  | "values"
  | "contact";

export const PROPOSAL_BLOCK_KEYS: ProposalBlockKey[] = [
  "cover",
  "about",
  "scope",
  "interiores",
  "management",
  "whyhire",
  "portfolio",
  "values",
  "contact",
];

/** Item de lista dentro de um bloco (card com título + descrição ou título + itens). */
export interface BlockCard {
  title: string;
  desc?: string;
  items?: string[];
  /** Identificador estável (etapas do fluxo: é o que a proposta guarda em etapas_ativas). */
  key?: string;
  /** Texto curto extra (etapas novas: prazo exibido, ex. "7 dias"). */
  meta?: string;
}

export interface CoverContent {
  title: string;
  clientFallback: string;
  /** Foto de fundo da capa. Vazio => foto padrão das sócias embutida no app. */
  imageUrl: string;
}

export interface AboutContent {
  tag: string;
  title: string;
  body: string;
  /** Foto das sócias na página Quem Somos. Vazio => foto padrão embutida. */
  photoUrl: string;
  founders: BlockCard[];
}

export interface ScopeContent {
  tag: string;
  title: string;
  defaultText: string;
  ambientesLabel: string;
  processTag: string;
  processTitle: string;
  /** Etapas do fluxo "Nosso Processo". key = id usado em proposals.etapas_ativas. */
  steps: BlockCard[];
}

/** Campo de prazo da proposta que alimenta o badge de dias de cada etapa original. */
export type FlowTimelineKey =
  | "briefing"
  | "study"
  | "anteprojeto"
  | "budget"
  | "priorities"
  | "mobilization"
  | "fiscalization";

/**
 * Etapas originais do fluxo -> campo de prazo da proposta. Etapas criadas
 * pelo time no bloco não têm campo no formulário: mostram o texto `meta`.
 */
export const FLOW_STEP_TIMELINE: Record<string, FlowTimelineKey> = {
  Briefing: "briefing",
  "Estudo Preliminar": "study",
  Anteprojeto: "anteprojeto",
  "Orçamento Executivo": "budget",
  "Reunião de Prioridades": "priorities",
  "Mobilização de Obra": "mobilization",
  "Conferência e Fiscalização de Obra": "fiscalization",
};

export function newFlowStepKey(): string {
  return `etapa-${Math.random().toString(36).slice(2, 8)}`;
}

/** Etapas do fluxo configuradas (do bloco "scope"), para o formulário da proposta. */
export function flowStepsFromBlocks(blocks: ProposalBlock[] | undefined): BlockCard[] {
  const scope = blocks?.find((b) => b.key === "scope");
  const steps = scope ? (scope.content as ScopeContent).steps : BLOCK_DEFAULTS.scope.steps;
  return steps.filter((s) => !!s.key);
}

/** Logos do time (proposal_assets, categoria "logo") separados por fundo. */
export function pickProposalLogos(
  logos: { file_url: string | null; name?: string | null; metadata?: unknown }[],
): { onDark?: string; onLight?: string } {
  const variantOf = (l: { name?: string | null; metadata?: unknown }): "light" | "dark" | null => {
    const v = (l.metadata as { variant?: unknown } | null)?.variant;
    if (v === "light" || v === "dark") return v;
    const n = (l.name ?? "").toLowerCase();
    if (/branc|clar|bege|white/.test(n)) return "light";
    if (/azul|pret|escur|navy|dark/.test(n)) return "dark";
    return null;
  };
  const withUrl = logos.filter((l) => !!l.file_url);
  const light = withUrl.find((l) => variantOf(l) === "light")?.file_url ?? undefined;
  const dark = withUrl.find((l) => variantOf(l) === "dark")?.file_url ?? undefined;
  const single = withUrl.length === 1 ? withUrl[0].file_url ?? undefined : undefined;
  return {
    onDark: light ?? single ?? (withUrl.length && !dark ? withUrl[0].file_url ?? undefined : undefined),
    onLight: dark ?? single ?? (withUrl.length && !light ? withUrl[0].file_url ?? undefined : undefined),
  };
}

export interface InterioresContent {
  title: string;
  subtitle: string;
  steps: BlockCard[];
}

export interface ManagementContent {
  tag: string;
  title: string;
  subtitle: string;
  cards: BlockCard[];
}

export interface WhyHireContent {
  title: string;
  cards: BlockCard[];
}

export interface PortfolioContent {
  title: string;
}

export interface ValuesContent {
  title: string;
  investmentLabel: string;
  consultLabel: string;
  cashPrefix: string;
  paymentLabel: string;
  paymentFallback: string;
  paymentFallbackSub: string;
  entryPrefix: string;
  defaultNote: string;
}

export interface ContactContent {
  socialLabel: string;
  instagramFallback: string;
  contact1Name: string;
  contact1Fallback: string;
  contact2Name: string;
  contact2Fallback: string;
  thanks: string;
}

export interface BlockContentMap {
  cover: CoverContent;
  about: AboutContent;
  scope: ScopeContent;
  interiores: InterioresContent;
  management: ManagementContent;
  whyhire: WhyHireContent;
  portfolio: PortfolioContent;
  values: ValuesContent;
  contact: ContactContent;
}

export const DEFAULT_ABOUT_TEXT =
  "A Quadra nasceu em 2022 da seguinte pergunta: como garantir que o cliente tenha, no final da obra, o resultado exatamente igual ao projeto 3D? Desenvolvemos um serviço de gerenciamento completo para que cada detalhe seja executado do jeito que sempre foi sonhado.";

export const DEFAULT_SCOPE_TEXT =
  "Desenvolvemos o **projeto executivo** com todos os desenhos necessários à obra, considerando cada ideia discutida com o cliente. Em seguida, conduzimos o **gerenciamento completo** — administração de fornecedores, cronograma, pagamentos, vistorias e conferências. Acompanhamos também o **pós-obra**, garantindo que tudo funcione como entregue.";

export const BLOCK_DEFAULTS: BlockContentMap = {
  cover: {
    title: "PROPOSTA",
    clientFallback: "CLIENTE",
    imageUrl: "",
  },
  about: {
    tag: "Sobre nós",
    title: "Quem Somos",
    body: DEFAULT_ABOUT_TEXT,
    photoUrl: "",
    founders: [
      { title: "Camilla", desc: "Formada em Arquitetura pela FUMEC, 2018" },
      { title: "Mariana", desc: "Formada em Arquitetura pela UFMG, 2021\nPós-graduação em Arquitetura Hospitalar" },
    ],
  },
  scope: {
    tag: "O que está sendo contemplado",
    title: "Nosso Escopo",
    defaultText: DEFAULT_SCOPE_TEXT,
    ambientesLabel: "Ambientes contemplados:",
    processTag: "Como funciona",
    processTitle: "Nosso Processo",
    steps: [
      { key: "Briefing", title: "Levantamento\n& Briefing", desc: "Alinhamento de conceito e necessidades" },
      { key: "Estudo Preliminar", title: "Estudo\nPreliminar", desc: "Aprovação do layout" },
      { key: "Anteprojeto", title: "Anteprojeto", desc: "Detalhamento do projeto" },
      { key: "Orçamento Executivo", title: "Orçamento\nExecutivo", desc: "Valor total definido" },
      { key: "Reunião de Prioridades", title: "Reunião de\nPrioridades", desc: "Budget x escopo" },
      { key: "Mobilização de Obra", title: "Mobilização\nde Obra", desc: "Preparação para início" },
      { key: "Conferência e Fiscalização de Obra", title: "Conferência\ne Fiscalização", desc: "Gerenciamento pleno" },
    ],
  },
  interiores: {
    title: "Projeto de Interiores",
    subtitle: "Desenvolve toda parte conceitual, de fluxo, de organização e estética do local.",
    steps: [
      { title: "Briefing", desc: "Reuniões de alinhamento com escuta ativa de todas as necessidades do cliente" },
      { title: "Estudo Preliminar", desc: "Estudos e opções em planta com possibilidade de revisões" },
      { title: "Anteprojeto", desc: "Visualização do ambiente em 3D com materiais" },
      { title: "Projeto Executivo", desc: "Desenhos técnicos para viabilizar a obra" },
    ],
  },
  management: {
    tag: "Metodologia",
    title: "Gerenciamento de Obra",
    subtitle: "Organizamos, coordenamos e controlamos todas as etapas da reforma para garantir prazo, orçamento e qualidade",
    cards: [
      {
        title: "Planejamento",
        items: [
          "Estudo do projeto 3D e executivo",
          "Definição do escopo e sequências",
          "Documento de responsabilidade",
          "Contato com síndico e condomínio",
          "Regras de execução do condomínio",
        ],
      },
      {
        title: "Orçamento",
        items: [
          "Alinhamento de fornecedores",
          "Orçamento completo de todos os itens",
          "Provisão de imprevistos",
          "Comparação e correção de orçamentos",
          "Tabela de acompanhamento para o cliente",
        ],
      },
      {
        title: "Aquisição de Material",
        items: [
          "Lista de compras online",
          "Ajuste de datas com a logística",
          "Conferência de links e itens",
          "Gestão de pagamentos e lembretes",
          "Conta numerário para pequenos itens",
        ],
      },
      {
        title: "Verificação de Qualidade",
        items: [
          "Acompanhamento constante em obra",
          "Visitas com o cliente para alinhamento",
          "Medições constantes para evitar retrabalho",
          "Revisões de projeto com aval da projetista",
        ],
      },
      {
        title: "Acompanhamento da Execução",
        items: [
          "Revisão do cronograma durante a obra",
          "Medições e liberações de pagamento",
          "Conferência de NBRs e normas",
          "Contato constante com a projetista",
        ],
      },
      {
        title: "Gestão de Pessoas",
        items: [
          "Orientação de mão de obra",
          "Feedbacks e sugestões de execução",
          "Gestão de retirada de lixo",
          "Isolamento de piso",
          "Limpeza durante a obra",
        ],
      },
    ],
  },
  whyhire: {
    title: "Por que Contratar Arquitetos para Gerenciar sua Obra?",
    cards: [
      {
        title: "Alinhamento Técnico e Estético",
        desc: "Unimos a precisão técnica à sensibilidade projetual — garantindo fidelidade ao conceito em cada etapa da execução.",
      },
      {
        title: "Fidelidade Total ao Projeto",
        desc: "Conhecemos o projeto de dentro para fora. Nenhum detalhe é perdido na transição do papel para a obra.",
      },
      {
        title: "Transformamos Conceito em Solução",
        desc: "Resolvemos imprevistos com visão de projeto, sem comprometer a estética aprovada.",
      },
      {
        title: "Presença Constante na Obra",
        desc: "Da fase inicial até a instalação de eletros, metais e pequenos detalhes — estamos lá para cada decisão.",
      },
    ],
  },
  portfolio: {
    title: "Nossos Projetos",
  },
  values: {
    title: "Valores",
    investmentLabel: "Investimento Total",
    consultLabel: "A consultar",
    cashPrefix: "À vista:",
    paymentLabel: "Formas de Pagamento",
    paymentFallback: "Boleto ou Pix",
    paymentFallbackSub: "Parcelamento disponível",
    entryPrefix: "Entrada:",
    defaultNote: "* Mão de obra e materiais de execução não estão inclusos neste valor.",
  },
  contact: {
    socialLabel: "Siga nas redes sociais",
    instagramFallback: "@quadraarq",
    contact1Name: "Camilla",
    contact1Fallback: "(31) 97264-1970",
    contact2Name: "Mariana",
    contact2Fallback: "(31) 9124-4672",
    thanks: "Obrigada pela confiança.",
  },
};

export type BlockFieldKind = "text" | "richtext" | "cards" | "image";

export interface BlockFieldDef {
  key: string;
  label: string;
  kind: BlockFieldKind;
  hint?: string;
  /** Para kind "cards": cada card tem descrição (desc) ou lista de itens (items). */
  cardShape?: "desc" | "items" | "steps";
  /** Rótulos dos campos do card, quando diferem de "Título"/"Descrição". */
  cardLabels?: { title?: string; desc?: string; items?: string };
}

export interface ProposalBlockDefinition {
  key: ProposalBlockKey;
  label: string;
  description: string;
  fields: BlockFieldDef[];
  /** Condição extra, além do toggle, para a página entrar no PDF. */
  condition?: string;
}

export const PROPOSAL_BLOCK_DEFINITIONS: ProposalBlockDefinition[] = [
  {
    key: "cover",
    label: "Capa",
    description: "Foto das sócias com o nome do cliente e do projeto.",
    fields: [
      { key: "title", label: "Título", kind: "text" },
      { key: "imageUrl", label: "Foto de fundo da capa", kind: "image", hint: "Vazio usa a foto padrão das sócias." },
    ],
  },
  {
    key: "about",
    label: "Quem Somos",
    description: "Apresentação do escritório e formação das sócias.",
    fields: [
      { key: "tag", label: "Etiqueta", kind: "text" },
      { key: "title", label: "Título", kind: "text" },
      { key: "body", label: "Texto", kind: "richtext" },
      { key: "photoUrl", label: "Foto das sócias", kind: "image", hint: "Vazio usa a foto padrão embutida." },
      { key: "founders", label: "Sócias", kind: "cards", cardShape: "desc", cardLabels: { title: "Nome", desc: "Formação" } },
    ],
  },
  {
    key: "scope",
    label: "Escopo e Processo",
    description: "Texto de escopo (quando a proposta não tem o próprio) e as etapas do processo.",
    fields: [
      { key: "tag", label: "Etiqueta do escopo", kind: "text" },
      { key: "title", label: "Título do escopo", kind: "text" },
      {
        key: "defaultText",
        label: "Texto padrão do escopo",
        kind: "richtext",
        hint: "Usado quando a proposta não tem descrição de escopo própria.",
      },
      { key: "ambientesLabel", label: "Rótulo dos ambientes", kind: "text" },
      { key: "processTag", label: "Etiqueta do processo", kind: "text" },
      { key: "processTitle", label: "Título do processo", kind: "text" },
      {
        key: "steps",
        label: "Etapas do processo",
        kind: "cards",
        cardShape: "steps",
        hint: "Cada proposta escolhe quais destas etapas entram. As 7 originais mostram o prazo informado na proposta; etapas novas mostram o texto do campo Prazo.",
      },
    ],
    condition: "Quais etapas entram e os prazos das 7 originais seguem cada proposta (seção Etapas do formulário).",
  },
  {
    key: "interiores",
    label: "Projeto de Interiores",
    description: "Etapas do projeto de interiores.",
    fields: [
      { key: "title", label: "Título", kind: "text" },
      { key: "subtitle", label: "Subtítulo", kind: "richtext" },
      { key: "steps", label: "Etapas", kind: "cards", cardShape: "desc" },
    ],
    condition: "Só entra em propostas com serviço \"projeto\" ou \"ambos\".",
  },
  {
    key: "management",
    label: "Gerenciamento de Obra",
    description: "Os seis pilares da metodologia de gerenciamento.",
    fields: [
      { key: "tag", label: "Etiqueta", kind: "text" },
      { key: "title", label: "Título", kind: "text" },
      { key: "subtitle", label: "Subtítulo", kind: "richtext" },
      { key: "cards", label: "Pilares", kind: "cards", cardShape: "items", cardLabels: { items: "Itens (um por linha)" } },
    ],
  },
  {
    key: "whyhire",
    label: "Por que Contratar",
    description: "Argumentos para contratar arquitetos no gerenciamento.",
    fields: [
      { key: "title", label: "Título", kind: "text" },
      { key: "cards", label: "Argumentos", kind: "cards", cardShape: "desc" },
    ],
  },
  {
    key: "portfolio",
    label: "Nossos Projetos",
    description: "Cards de projetos selecionados na proposta.",
    fields: [{ key: "title", label: "Título", kind: "text" }],
    condition: "Só entra quando a proposta tem projetos de portfólio selecionados.",
  },
  {
    key: "values",
    label: "Valores",
    description: "Investimento e formas de pagamento.",
    fields: [
      { key: "title", label: "Título", kind: "text" },
      { key: "investmentLabel", label: "Rótulo do investimento", kind: "text" },
      { key: "consultLabel", label: "Texto sem valor", kind: "text", hint: "Aparece quando a proposta não tem valor." },
      { key: "cashPrefix", label: "Prefixo à vista", kind: "text" },
      { key: "paymentLabel", label: "Rótulo do pagamento", kind: "text" },
      { key: "paymentFallback", label: "Pagamento padrão", kind: "text", hint: "Aparece quando não há parcelamento." },
      { key: "paymentFallbackSub", label: "Subtexto do pagamento padrão", kind: "text" },
      { key: "entryPrefix", label: "Prefixo da entrada", kind: "text" },
      { key: "defaultNote", label: "Observação padrão", kind: "richtext", hint: "Usada quando a proposta não tem observação própria." },
    ],
  },
  {
    key: "contact",
    label: "Contato",
    description: "Instagram, telefones e agradecimento.",
    fields: [
      { key: "socialLabel", label: "Chamada das redes", kind: "text" },
      { key: "instagramFallback", label: "Instagram padrão", kind: "text", hint: "Usado quando não há contato cadastrado em Configurações → Contato." },
      { key: "contact1Name", label: "Nome do contato 1", kind: "text" },
      { key: "contact1Fallback", label: "Telefone padrão 1", kind: "text" },
      { key: "contact2Name", label: "Nome do contato 2", kind: "text" },
      { key: "contact2Fallback", label: "Telefone padrão 2", kind: "text" },
      { key: "thanks", label: "Agradecimento", kind: "richtext" },
    ],
  },
];

const DEFINITION_BY_KEY: Record<string, ProposalBlockDefinition> = Object.fromEntries(
  PROPOSAL_BLOCK_DEFINITIONS.map((d) => [d.key, d]),
);

export function getBlockDefinition(key: string): ProposalBlockDefinition | undefined {
  return DEFINITION_BY_KEY[key];
}

export function isProposalBlockKey(key: string): key is ProposalBlockKey {
  return key in DEFINITION_BY_KEY;
}

import {
  customBlockContent,
  customBlockType,
  customTypeDef,
  type CustomBlockKey,
  type CustomBlockType,
  type CustomContentMap,
} from "@/lib/proposalCustomBlocks";

/** Linha da tabela proposal_blocks. */
export interface ProposalBlockRow {
  id: string;
  team_id: string;
  user_id: string;
  key: string;
  label: string;
  display_order: number;
  is_active: boolean;
  content_json: unknown;
  created_at: string;
  updated_at: string;
}

/** Bloco pronto pra uso: linha do banco (ou padrão) já com o conteúdo mesclado. */
export interface ResolvedProposalBlock<K extends ProposalBlockKey = ProposalBlockKey> {
  key: K;
  label: string;
  display_order: number;
  is_active: boolean;
  content: BlockContentMap[K];
  /** true quando não existe linha no banco (bloco ainda no padrão). */
  isDefault: boolean;
}

/** Bloco criado pela equipe a partir de um tipo (financeiro, linha do tempo, cartões). */
export interface CustomProposalBlock<T extends CustomBlockType = CustomBlockType> {
  key: CustomBlockKey;
  type: T;
  label: string;
  display_order: number;
  is_active: boolean;
  content: CustomContentMap[T];
  isDefault: false;
}

/** Qualquer bloco da lista: um dos 9 fixos ou um personalizado. */
export type ProposalBlock = ResolvedProposalBlock | CustomProposalBlock;

export function isCustomBlock(b: ProposalBlock): b is CustomProposalBlock {
  return "type" in b;
}

function isBlockCard(v: unknown): v is BlockCard {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  if (typeof c.title !== "string") return false;
  if (c.desc !== undefined && typeof c.desc !== "string") return false;
  if (c.items !== undefined && !(Array.isArray(c.items) && c.items.every((i) => typeof i === "string"))) return false;
  if (c.key !== undefined && typeof c.key !== "string") return false;
  if (c.meta !== undefined && typeof c.meta !== "string") return false;
  return true;
}

/**
 * Mescla o conteúdo salvo com o padrão do bloco, descartando chaves
 * desconhecidas e valores com tipo errado. Sempre devolve um objeto
 * completo, então as páginas podem ler os campos sem checar nada.
 */
export function blockContent<K extends ProposalBlockKey>(key: K, raw?: unknown): BlockContentMap[K] {
  const defaults = BLOCK_DEFAULTS[key] as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, dv] of Object.entries(defaults)) {
    // Cópia profunda dos arrays pra ninguém editar o padrão por referência.
    out[k] = Array.isArray(dv) ? (dv as BlockCard[]).map((c) => ({ ...c, items: c.items ? [...c.items] : undefined })) : dv;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!(k in defaults)) continue;
      const dv = defaults[k];
      if (typeof dv === "string") {
        if (typeof v === "string") out[k] = v;
      } else if (Array.isArray(dv)) {
        if (Array.isArray(v)) out[k] = v.filter(isBlockCard).map((c) => ({ ...c }));
      }
    }
  }
  return out as unknown as BlockContentMap[K];
}

/**
 * Resolve a lista final de blocos a partir das linhas do banco.
 * - Linhas com chave desconhecida são ignoradas.
 * - Blocos personalizados (custom-<tipo>-<id>) entram na ordem salva.
 * - Blocos fixos sem linha entram no fim, ativos e com o conteúdo padrão.
 * - display_order é renumerado sequencialmente (0..n-1).
 */
export function resolveProposalBlocks(rows?: ProposalBlockRow[] | null): ProposalBlock[] {
  const known = (rows ?? [])
    .filter((r) => isProposalBlockKey(r.key) || customBlockType(r.key) != null)
    .sort((a, b) => a.display_order - b.display_order || a.key.localeCompare(b.key));

  const seen = new Set<string>();
  const resolved: ProposalBlock[] = [];

  for (const row of known) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    const type = customBlockType(row.key);
    if (type) {
      resolved.push({
        key: row.key as CustomBlockKey,
        type,
        label: row.label?.trim() || customTypeDef(type).label,
        display_order: resolved.length,
        is_active: row.is_active !== false,
        content: customBlockContent(type, row.content_json),
        isDefault: false,
      } as CustomProposalBlock);
      continue;
    }
    const key = row.key as ProposalBlockKey;
    const def = DEFINITION_BY_KEY[key];
    resolved.push({
      key,
      label: row.label?.trim() || def.label,
      display_order: resolved.length,
      is_active: row.is_active !== false,
      content: blockContent(key, row.content_json),
      isDefault: false,
    });
  }

  for (const def of PROPOSAL_BLOCK_DEFINITIONS) {
    if (seen.has(def.key)) continue;
    resolved.push({
      key: def.key,
      label: def.label,
      display_order: resolved.length,
      is_active: true,
      content: blockContent(def.key),
      isDefault: true,
    });
  }

  return resolved;
}

/** Blocos no padrão (tabela vazia). */
export function defaultProposalBlocks(): ProposalBlock[] {
  return resolveProposalBlocks([]);
}

/** Move um bloco de posição e renumera display_order. */
export function moveProposalBlock<B extends { display_order: number }>(blocks: B[], from: number, to: number): B[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((b, i) => ({ ...b, display_order: i }));
}

export function findProposalBlock<K extends ProposalBlockKey>(
  blocks: ProposalBlock[],
  key: K,
): ResolvedProposalBlock<K> | undefined {
  return blocks.find((b) => b.key === key) as ResolvedProposalBlock<K> | undefined;
}

/** Payload que vai pro upsert em proposal_blocks (sem team_id: o banco preenche). */
export interface ProposalBlockUpsert {
  key: string;
  label: string;
  display_order: number;
  is_active: boolean;
  content_json: Record<string, unknown>;
}

export function toProposalBlockUpserts(blocks: ProposalBlock[]): ProposalBlockUpsert[] {
  return blocks.map((b, i) => ({
    key: b.key,
    label: b.label,
    display_order: i,
    is_active: b.is_active,
    content_json: b.content as unknown as Record<string, unknown>,
  }));
}

/** Compara dois conjuntos de blocos (ordem, ativo e conteúdo). */
export function proposalBlocksEqual(a: ProposalBlock[], b: ProposalBlock[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].key !== b[i].key) return false;
    if (a[i].is_active !== b[i].is_active) return false;
    if (a[i].label !== b[i].label) return false;
    if (JSON.stringify(a[i].content) !== JSON.stringify(b[i].content)) return false;
  }
  return true;
}
