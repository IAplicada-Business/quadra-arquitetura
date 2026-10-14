/**
 * Cenários orçamentários da Trilha do Cliente.
 *
 * O ponto de partida é que a Quadra já tem os cenários no sistema: eles
 * são as cotações concorrentes de cada disciplina. Quando a marcenaria
 * tem Partum a R$ 162.730 e DAL a R$ 185.450, isso *é* a escolha entre
 * um cenário econômico e um caro — só que guardada como linha de
 * orçamento, não como "cenário".
 *
 * Por isso aqui não existe cenário cadastrado à mão. Os três cenários
 * saem das cotações:
 *
 *   Econômico   menor valor de cada disciplina
 *   Recomendado o que o escritório aprovou; onde não aprovou, o menor
 *   Máximo      maior valor de cada disciplina
 *
 * A consequência é a que a Quadra pediu: cotou um fornecedor novo no
 * sistema, os três cenários se refazem sozinhos na tela do cliente. Não
 * há segunda base para manter em dia, e não há como a tela do cliente
 * divergir do que a equipe vê — é a mesma linha.
 *
 * Tudo aqui é puro: sem React e sem Supabase, pra ser testável.
 */

import type { PortalQuote, PortalScopeItem } from "@/lib/portal";

/* ------------------------------------------------------------------ */
/* Normalização                                                        */
/* ------------------------------------------------------------------ */

/**
 * Disciplina sem o espaço sobrando e com maiúscula inicial.
 *
 * O banco tem "Marcenaria " com espaço no fim, cadastrada assim numa
 * digitação antiga. Sem aparar, ela vira uma segunda disciplina na
 * tabela e o cliente vê a marcenaria duas vezes.
 */
export function normalizaDisciplina(d: string | null | undefined): string {
  const t = (d ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "Sem disciplina";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Fornecedor sem espaço sobrando; vazio vira null. */
function normalizaFornecedor(n: string | null | undefined): string | null {
  const t = (n ?? "").trim().replace(/\s+/g, " ");
  return t || null;
}

/**
 * Linha de cotação que não é proposta de verdade.
 *
 * O sistema cria uma linha zerada quando a disciplina é aberta, antes
 * de qualquer fornecedor responder, e o gerador de prévia cria linhas
 * de preço unitário ("Prévia automática"). Nenhuma das duas é uma
 * proposta que o cliente possa escolher, e somá-las derrubaria o
 * cenário econômico para perto de zero.
 */
export function ehPlaceholder(q: PortalQuote): boolean {
  const semValor = (q.value ?? 0) <= 0 && (q.material ?? 0) <= 0;
  const semFornecedor = !normalizaFornecedor(q.supplier);
  if (semValor) return true;
  if (semFornecedor) return true;
  return /pr[ée]via autom[áa]tica/i.test(q.supplier ?? "");
}

/* ------------------------------------------------------------------ */
/* Propostas                                                           */
/* ------------------------------------------------------------------ */

export interface Proposta {
  id: string;
  disciplina: string;
  fornecedor: string;
  /** Mão de obra / serviço. */
  servico: number;
  /** Material, quando o fornecedor separa. */
  material: number;
  /** O que entra na conta do cenário. */
  total: number;
  condicao: string | null;
  prazoEntrega: string | null;
  status: PortalQuote["status"];
  cotadaEm: string | null;
  validaAte: string | null;
  revisao: string | null;
}

/** Converte a linha crua em proposta, já normalizada. */
function paraProposta(q: PortalQuote): Proposta {
  const servico = q.value ?? 0;
  const material = q.material ?? 0;
  return {
    id: q.id,
    disciplina: normalizaDisciplina(q.discipline),
    fornecedor: normalizaFornecedor(q.supplier) ?? "Sem fornecedor",
    servico,
    material,
    total: servico + material,
    condicao: (q.paymentTerms ?? "").trim() || null,
    prazoEntrega: (q.deliveryTime ?? "").trim() || null,
    status: q.status,
    cotadaEm: q.quotedAt,
    validaAte: q.validUntil,
    revisao: (q.revision ?? "").trim() || null,
  };
}

/**
 * Só a revisão que vale.
 *
 * Uma proposta revisada vira linha nova com `is_current_revision` falso
 * na anterior. Mostrar as duas faria o cliente comparar com um preço
 * que o fornecedor já substituiu.
 */
export function propostasValidas(quotes: PortalQuote[]): Proposta[] {
  return quotes
    .filter((q) => q.isCurrentRevision !== false)
    .filter((q) => q.status !== "rejeitado")
    .filter((q) => !ehPlaceholder(q))
    .map(paraProposta);
}

/* ------------------------------------------------------------------ */
/* Disciplinas                                                         */
/* ------------------------------------------------------------------ */

export interface Disciplina {
  nome: string;
  propostas: Proposta[];
  /** A aprovada pelo escritório, se já houver. */
  aprovada: Proposta | null;
  maisBarata: Proposta;
  maisCara: Proposta;
  /** Quanto separa a mais barata da mais cara. */
  amplitude: number;
  /** Já fechada com fornecedor: sai da conta do "a contratar". */
  contratada: boolean;
  /** Observação da equipe sobre a disciplina. */
  nota: string | null;
}

/**
 * Agrupa as propostas por disciplina.
 *
 * Disciplina sem nenhuma proposta real não aparece: uma linha vazia na
 * tabela comparativa só ocupa espaço e sugere que falta cotar algo que
 * talvez nem esteja no escopo.
 */
export function agrupaDisciplinas(propostas: Proposta[], escopos: PortalScopeItem[] = []): Disciplina[] {
  const porNome = new Map<string, Proposta[]>();
  for (const p of propostas) {
    const lista = porNome.get(p.disciplina) ?? [];
    lista.push(p);
    porNome.set(p.disciplina, lista);
  }

  const escopoPor = new Map<string, PortalScopeItem>();
  for (const e of escopos) escopoPor.set(normalizaDisciplina(e.discipline), e);

  const out: Disciplina[] = [];
  for (const [nome, lista] of porNome) {
    if (lista.length === 0) continue;
    const ordenadas = [...lista].sort((a, b) => a.total - b.total);
    const maisBarata = ordenadas[0];
    const maisCara = ordenadas[ordenadas.length - 1];
    const aprovada = ordenadas.find((p) => p.status === "aprovado") ?? null;
    const escopo = escopoPor.get(nome);
    out.push({
      nome,
      propostas: ordenadas,
      aprovada,
      maisBarata,
      maisCara,
      amplitude: maisCara.total - maisBarata.total,
      contratada: escopo?.status === "contratado" || aprovada !== null,
      nota: (escopo?.note ?? "").trim() || null,
    });
  }
  /* Maior peso primeiro: o cliente decide onde o dinheiro está, e a
     disciplina de R$ 200 mil tem que abrir a lista, não a de R$ 5 mil. */
  return out.sort((a, b) => b.maisBarata.total - a.maisBarata.total);
}

/* ------------------------------------------------------------------ */
/* Cenários                                                            */
/* ------------------------------------------------------------------ */

export type ChaveCenario = "economico" | "recomendado" | "maximo";

export interface EscolhaCenario {
  disciplina: string;
  proposta: Proposta;
  /** Difere da escolha do cenário de referência (o econômico). */
  destoa: boolean;
}

export interface Cenario {
  chave: ChaveCenario;
  nome: string;
  resumo: string;
  escolhas: EscolhaCenario[];
  /** Soma das escolhas, sem imprevistos. */
  subtotal: number;
  /** Reserva para imprevisto. */
  imprevistos: number;
  total: number;
  /** Parte já fechada com fornecedor. */
  contratado: number;
  aContratar: number;
  /** Diferença para o cenário econômico. */
  deltaReferencia: number;
}

/** Percentual de imprevistos que a referência adota. */
export const TAXA_IMPREVISTOS = 0.05;

const DEFINICOES: { chave: ChaveCenario; nome: string; resumo: string; escolhe: (d: Disciplina) => Proposta }[] = [
  {
    chave: "economico",
    nome: "Econômico",
    resumo: "A proposta mais barata de cada disciplina.",
    escolhe: (d) => d.maisBarata,
  },
  {
    chave: "recomendado",
    nome: "Recomendado",
    resumo: "O que a Quadra aprovou; onde ainda não há aprovação, a proposta mais barata.",
    escolhe: (d) => d.aprovada ?? d.maisBarata,
  },
  {
    chave: "maximo",
    nome: "Máximo",
    resumo: "A proposta mais cara de cada disciplina: o teto, se tudo for pela opção mais completa.",
    escolhe: (d) => d.maisCara,
  },
];

/**
 * Monta os três cenários a partir das disciplinas.
 *
 * `destoa` marca a escolha diferente da do econômico — é o que a tabela
 * comparativa põe em negrito. Sem essa marca, uma tabela de doze linhas
 * em que só duas mudam obriga o cliente a conferir coluna por coluna.
 */
export function montaCenarios(disciplinas: Disciplina[]): Cenario[] {
  const referencia = new Map<string, string>();
  for (const d of disciplinas) referencia.set(d.nome, d.maisBarata.id);

  const cenarios = DEFINICOES.map((def) => {
    const escolhas: EscolhaCenario[] = disciplinas.map((d) => {
      const proposta = def.escolhe(d);
      return { disciplina: d.nome, proposta, destoa: proposta.id !== referencia.get(d.nome) };
    });
    const subtotal = escolhas.reduce((s, e) => s + e.proposta.total, 0);
    const imprevistos = subtotal * TAXA_IMPREVISTOS;
    const contratado = escolhas
      .filter((e) => disciplinas.find((d) => d.nome === e.disciplina)?.contratada)
      .reduce((s, e) => s + e.proposta.total, 0);
    return {
      chave: def.chave,
      nome: def.nome,
      resumo: def.resumo,
      escolhas,
      subtotal,
      imprevistos,
      total: subtotal + imprevistos,
      contratado,
      aContratar: subtotal + imprevistos - contratado,
      deltaReferencia: 0,
    };
  });

  const base = cenarios.find((c) => c.chave === "economico")?.total ?? 0;
  for (const c of cenarios) c.deltaReferencia = c.total - base;
  return cenarios;
}

/* ------------------------------------------------------------------ */
/* Composição do orçamento                                             */
/* ------------------------------------------------------------------ */

export interface Fatia {
  disciplina: string;
  valor: number;
  /** Fração do subtotal, de 0 a 1. */
  fracao: number;
}

/** O que consome o orçamento, da maior fatia para a menor. */
export function fatias(cenario: Cenario): Fatia[] {
  if (cenario.subtotal <= 0) return [];
  return cenario.escolhas
    .map((e) => ({
      disciplina: e.disciplina,
      valor: e.proposta.total,
      fracao: e.proposta.total / cenario.subtotal,
    }))
    .sort((a, b) => b.valor - a.valor);
}

/* ------------------------------------------------------------------ */
/* Validade das propostas                                              */
/* ------------------------------------------------------------------ */

export type SituacaoValidade = "valida" | "vence_hoje" | "vencida" | "sem_prazo";

export interface Validade {
  proposta: Proposta;
  situacao: SituacaoValidade;
  /** Dias corridos até vencer; negativo se já venceu. */
  dias: number | null;
}

/**
 * Situação de cada proposta do cenário em relação à data de hoje.
 *
 * Importa porque orçamento vencido não é orçamento: o cliente que
 * decide com base num preço de três semanas atrás descobre na
 * contratação que o número mudou. A tela avisa antes.
 */
export function validades(cenario: Cenario, hoje: string): Validade[] {
  const vistos = new Set<string>();
  const out: Validade[] = [];
  for (const e of cenario.escolhas) {
    if (vistos.has(e.proposta.id)) continue;
    vistos.add(e.proposta.id);
    out.push({ proposta: e.proposta, ...situacaoDe(e.proposta.validaAte, hoje) });
  }
  const ordem: Record<SituacaoValidade, number> = { vencida: 0, vence_hoje: 1, valida: 2, sem_prazo: 3 };
  return out.sort((a, b) => ordem[a.situacao] - ordem[b.situacao]);
}

function situacaoDe(validaAte: string | null, hoje: string): { situacao: SituacaoValidade; dias: number | null } {
  if (!validaAte) return { situacao: "sem_prazo", dias: null };
  const dias = diasCorridos(hoje, validaAte);
  if (dias < 0) return { situacao: "vencida", dias };
  if (dias === 0) return { situacao: "vence_hoje", dias };
  return { situacao: "valida", dias };
}

/** Dias corridos de `de` até `ate`, em UTC pra não sofrer com fuso. */
export function diasCorridos(de: string, ate: string): number {
  const a = Date.parse(de + "T00:00:00Z");
  const b = Date.parse(ate + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/* ------------------------------------------------------------------ */
/* Desembolso                                                          */
/* ------------------------------------------------------------------ */

export interface Desembolso {
  disciplina: string;
  fornecedor: string;
  condicao: string | null;
  /** O que sai na contratação, quando dá pra deduzir da condição. */
  entrada: number | null;
  total: number;
}

/**
 * Quanto sai do bolso na hora de fechar cada contrato.
 *
 * A condição de pagamento é texto livre ("40% de sinal", "5 parcelas",
 * "à vista"), então a entrada só é calculada quando a frase diz um
 * número que dá pra ler. Quando não diz, a linha aparece com a condição
 * em texto e sem valor — melhor do que chutar uma entrada e o cliente
 * se programar errado.
 */
export function desembolsos(cenario: Cenario): Desembolso[] {
  return cenario.escolhas.map((e) => ({
    disciplina: e.disciplina,
    fornecedor: e.proposta.fornecedor,
    condicao: e.proposta.condicao,
    entrada: entradaDe(e.proposta.condicao, e.proposta.total),
    total: e.proposta.total,
  }));
}

/**
 * Lê a entrada da condição de pagamento.
 *
 * Cobre o que aparece no banco: percentual ("40% de sinal", "30% de
 * entrada"), à vista (entrada = tudo) e parcelamento em N vezes
 * (primeira parcela). Qualquer outra frase devolve null.
 */
export function entradaDe(condicao: string | null, total: number): number | null {
  if (!condicao || total <= 0) return null;
  const t = condicao.toLowerCase();

  const pct = t.match(/(\d{1,3})\s*%/);
  if (pct) {
    const p = Number(pct[1]);
    if (p > 0 && p <= 100) return (total * p) / 100;
  }

  /* Sem `\b` antes do "à": acento não é caractere de palavra em
     JavaScript, então não existe fronteira no começo da string e
     "à vista" nunca casaria. */
  if (/(?:^|[\s,;+])(?:à|a)\s*vista\b/.test(t)) return total;

  const parcelas = t.match(/(\d{1,2})\s*(?:x|parcelas?|vezes)/);
  if (parcelas) {
    const n = Number(parcelas[1]);
    if (n > 0) return total / n;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Montagem                                                            */
/* ------------------------------------------------------------------ */

export interface AnaliseDeCenarios {
  disciplinas: Disciplina[];
  cenarios: Cenario[];
  /** Vazio quando ainda não há cotação nenhuma. */
  vazio: boolean;
}

/** Tudo que a tela de cenários precisa, a partir do payload do portal. */
export function analiseDeCenarios(
  quotes: PortalQuote[] = [],
  escopos: PortalScopeItem[] = [],
): AnaliseDeCenarios {
  const disciplinas = agrupaDisciplinas(propostasValidas(quotes), escopos);
  return {
    disciplinas,
    cenarios: disciplinas.length > 0 ? montaCenarios(disciplinas) : [],
    vazio: disciplinas.length === 0,
  };
}
