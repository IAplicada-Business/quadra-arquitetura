import { describe, it, expect } from "vitest";
import {
  agrupaDisciplinas,
  analiseDeCenarios,
  desembolsos,
  diasCorridos,
  ehPlaceholder,
  entradaDe,
  fatias,
  montaCenarios,
  normalizaDisciplina,
  propostasValidas,
  validades,
  TAXA_IMPREVISTOS,
} from "@/lib/portalScenarios";
import type { PortalQuote, PortalScopeItem } from "@/lib/portal";

/*
 * Os casos abaixo são o que está no banco da Quadra hoje, não exemplos
 * inventados: a marcenaria com espaço sobrando no nome, as linhas
 * zeradas que o sistema cria ao abrir a disciplina, as três cotações da
 * mesma loja de iluminação com valores diferentes. Testar com dados
 * fabricados deixaria passar justamente o que quebra na tela real.
 */

const q = (over: Partial<PortalQuote> & { id: string }): PortalQuote => ({
  discipline: "Alvenaria",
  supplier: "Fornecedor",
  value: 1000,
  material: 0,
  deliveryTime: null,
  paymentTerms: null,
  status: "pendente",
  revision: "Rev 1",
  isCurrentRevision: true,
  quotedAt: "2026-09-01",
  validUntil: null,
  ...over,
});

/* Alvenaria do projeto Julia e Matheus, valores reais. */
const ALVENARIA: PortalQuote[] = [
  q({ id: "alv-0", supplier: null, value: 0, material: 0 }),
  q({ id: "alv-roma", supplier: "Construtora Roma", value: 173102, material: 26000, status: "aprovado", paymentTerms: "5 parcelas" }),
  q({ id: "alv-fredh", supplier: "Fredh Alve", value: 189600, material: 25000 }),
  q({ id: "alv-nexo", supplier: "Nexo", value: 225343, material: 19204 }),
];

const MARCENARIA: PortalQuote[] = [
  q({ id: "mar-0", discipline: "Marcenaria ", supplier: null, value: 0, material: 0 }),
  q({ id: "mar-partum", discipline: "Marcenaria ", supplier: "Partum Planejados", value: 162730, material: 0 }),
  q({ id: "mar-dal", discipline: "Marcenaria ", supplier: "DAL MOBILE", value: 185450, material: 0 }),
];

describe("Normalização das disciplinas", () => {
  /* O banco tem "Marcenaria " com espaço no fim. Sem aparar, o cliente
     vê a marcenaria duas vezes na tabela comparativa. */
  it("apara o espaço sobrando do nome cadastrado", () => {
    expect(normalizaDisciplina("Marcenaria ")).toBe("Marcenaria");
    expect(normalizaDisciplina("  ar-condicionado  ")).toBe("Ar-condicionado");
  });

  it("disciplina vazia não vira string vazia na tela", () => {
    expect(normalizaDisciplina(null)).toBe("Sem disciplina");
    expect(normalizaDisciplina("   ")).toBe("Sem disciplina");
  });

  it("não junta disciplinas de verdade diferentes", () => {
    expect(normalizaDisciplina("Marmoraria")).not.toBe(normalizaDisciplina("Marcenaria"));
  });
});

describe("O que não é proposta", () => {
  /* O sistema cria uma linha zerada quando a disciplina é aberta. */
  it("linha zerada sem fornecedor fica de fora", () => {
    expect(ehPlaceholder(q({ id: "x", supplier: null, value: 0, material: 0 }))).toBe(true);
  });

  it("prévia automática de preço unitário fica de fora", () => {
    expect(ehPlaceholder(q({ id: "x", supplier: "Prévia automática", value: 105 }))).toBe(true);
  });

  it("proposta de verdade entra", () => {
    expect(ehPlaceholder(q({ id: "x", supplier: "Construtora Roma", value: 173102 }))).toBe(false);
  });

  /* Sem isso o cenário econômico desabaria para perto de zero, porque a
     linha zerada é sempre a mais barata da disciplina. */
  it("o econômico não cai na linha zerada", () => {
    const d = agrupaDisciplinas(propostasValidas(ALVENARIA));
    expect(d[0].maisBarata.fornecedor).toBe("Construtora Roma");
    expect(d[0].maisBarata.total).toBe(199102);
  });

  it("revisão antiga não concorre com a atual", () => {
    const quotes = [
      q({ id: "velha", supplier: "Nexo", value: 225343, isCurrentRevision: false }),
      q({ id: "nova", supplier: "Nexo", value: 248500, isCurrentRevision: true }),
    ];
    const p = propostasValidas(quotes);
    expect(p).toHaveLength(1);
    expect(p[0].id).toBe("nova");
  });

  it("proposta rejeitada não concorre", () => {
    const p = propostasValidas([q({ id: "r", supplier: "X", value: 10, status: "rejeitado" })]);
    expect(p).toHaveLength(0);
  });
});

describe("Propostas e disciplinas", () => {
  it("o total soma serviço e material", () => {
    const [p] = propostasValidas([q({ id: "a", supplier: "Roma", value: 173102, material: 26000 })]);
    expect(p.servico).toBe(173102);
    expect(p.material).toBe(26000);
    expect(p.total).toBe(199102);
  });

  it("a aprovada pelo escritório é identificada", () => {
    const [d] = agrupaDisciplinas(propostasValidas(ALVENARIA));
    expect(d.aprovada?.fornecedor).toBe("Construtora Roma");
    expect(d.contratada).toBe(true);
  });

  it("disciplina sem aprovação nenhuma não se diz contratada", () => {
    const [d] = agrupaDisciplinas(propostasValidas(MARCENARIA));
    expect(d.aprovada).toBeNull();
    expect(d.contratada).toBe(false);
  });

  it("a amplitude mostra o que há para negociar", () => {
    const [d] = agrupaDisciplinas(propostasValidas(MARCENARIA));
    expect(d.amplitude).toBe(185450 - 162730);
  });

  /* O cliente decide onde o dinheiro está: a disciplina de R$ 200 mil
     tem que abrir a lista, não a de R$ 5 mil. */
  it("as disciplinas vêm da mais pesada para a mais leve", () => {
    const d = agrupaDisciplinas(propostasValidas([...MARCENARIA, ...ALVENARIA]));
    expect(d.map((x) => x.nome)).toEqual(["Alvenaria", "Marcenaria"]);
  });

  it("o escopo contratado marca a disciplina mesmo sem cotação aprovada", () => {
    const escopos: PortalScopeItem[] = [
      { id: "e1", discipline: "Marcenaria ", status: "contratado", paymentTerms: null, note: null },
    ];
    const [d] = agrupaDisciplinas(propostasValidas(MARCENARIA), escopos);
    expect(d.contratada).toBe(true);
  });

  it("a nota da equipe chega à disciplina", () => {
    const escopos: PortalScopeItem[] = [
      { id: "e1", discipline: "Marcenaria", status: "planejado", paymentTerms: null, note: "Montagem não inclusa." },
    ];
    const [d] = agrupaDisciplinas(propostasValidas(MARCENARIA), escopos);
    expect(d.nota).toBe("Montagem não inclusa.");
  });
});

describe("Os três cenários", () => {
  const disciplinas = agrupaDisciplinas(propostasValidas([...ALVENARIA, ...MARCENARIA]));
  const cenarios = montaCenarios(disciplinas);
  const [eco, rec, max] = cenarios;

  it("econômico pega a mais barata de cada disciplina", () => {
    expect(eco.escolhas.map((e) => e.proposta.fornecedor)).toEqual(["Construtora Roma", "Partum Planejados"]);
  });

  it("recomendado segue o que o escritório aprovou", () => {
    const alv = rec.escolhas.find((e) => e.disciplina === "Alvenaria");
    expect(alv?.proposta.fornecedor).toBe("Construtora Roma");
  });

  it("onde não há aprovação, o recomendado cai na mais barata", () => {
    const marc = rec.escolhas.find((e) => e.disciplina === "Marcenaria");
    expect(marc?.proposta.fornecedor).toBe("Partum Planejados");
  });

  it("máximo pega a mais cara", () => {
    expect(max.escolhas.map((e) => e.proposta.fornecedor)).toEqual(["Nexo", "DAL MOBILE"]);
  });

  it("o total inclui a reserva de imprevistos", () => {
    expect(eco.imprevistos).toBeCloseTo(eco.subtotal * TAXA_IMPREVISTOS, 6);
    expect(eco.total).toBeCloseTo(eco.subtotal * (1 + TAXA_IMPREVISTOS), 6);
  });

  it("o econômico é a referência e os outros medem a partir dele", () => {
    expect(eco.deltaReferencia).toBe(0);
    expect(max.deltaReferencia).toBeGreaterThan(0);
  });

  /* É o negrito da tabela: numa lista de doze disciplinas costumam ser
     duas ou três que mudam, e sem a marca o cliente confere coluna por
     coluna. */
  it("marca só a escolha que difere do econômico", () => {
    expect(eco.escolhas.every((e) => !e.destoa)).toBe(true);
    expect(max.escolhas.every((e) => e.destoa)).toBe(true);
  });

  it("o contratado sai do que falta contratar", () => {
    expect(rec.contratado).toBe(199102);
    expect(rec.contratado + rec.aContratar).toBeCloseTo(rec.total, 6);
  });
});

describe("O que consome o orçamento", () => {
  it("as fatias somam o todo e vêm da maior para a menor", () => {
    const [cenario] = montaCenarios(agrupaDisciplinas(propostasValidas([...ALVENARIA, ...MARCENARIA])));
    const f = fatias(cenario);
    expect(f[0].disciplina).toBe("Alvenaria");
    expect(f.reduce((s, x) => s + x.fracao, 0)).toBeCloseTo(1, 6);
  });

  it("cenário sem valor não divide por zero", () => {
    expect(fatias({ subtotal: 0, escolhas: [] } as never)).toEqual([]);
  });
});

describe("Validade das propostas", () => {
  const comPrazo = agrupaDisciplinas(
    propostasValidas([
      q({ id: "a", supplier: "Partum", value: 100, validUntil: "2026-10-20" }),
      q({ id: "b", discipline: "Vidraçaria", supplier: "Neovidros", value: 200, validUntil: "2026-09-28" }),
    ]),
  );
  const [cenario] = montaCenarios(comPrazo);

  it("separa vencida, vence hoje e válida", () => {
    const v = validades(cenario, "2026-10-14");
    const por = Object.fromEntries(v.map((x) => [x.proposta.fornecedor, x.situacao]));
    expect(por["Neovidros"]).toBe("vencida");
    expect(por["Partum"]).toBe("valida");
  });

  it("vencer hoje não conta como vencida", () => {
    const v = validades(cenario, "2026-10-20");
    expect(v.find((x) => x.proposta.fornecedor === "Partum")?.situacao).toBe("vence_hoje");
  });

  /* O que venceu abre a lista: é o que exige ação. */
  it("as vencidas aparecem primeiro", () => {
    const v = validades(cenario, "2026-10-14");
    expect(v[0].situacao).toBe("vencida");
  });

  it("sem data informada não inventa prazo", () => {
    const [c] = montaCenarios(agrupaDisciplinas(propostasValidas([q({ id: "s", supplier: "X", value: 1 })])));
    expect(validades(c, "2026-10-14")[0].situacao).toBe("sem_prazo");
  });

  it("conta os dias em UTC, sem escorregar de fuso", () => {
    expect(diasCorridos("2026-10-14", "2026-10-20")).toBe(6);
    expect(diasCorridos("2026-10-20", "2026-10-14")).toBe(-6);
  });
});

describe("Desembolso na contratação", () => {
  it("lê percentual de sinal", () => {
    expect(entradaDe("40% de sinal + 30/60/90 dias", 1000)).toBe(400);
    expect(entradaDe("30% de entrada", 1000)).toBe(300);
  });

  it("à vista é o total", () => {
    expect(entradaDe("à vista", 1000)).toBe(1000);
    expect(entradaDe("Pagamento a vista", 1000)).toBe(1000);
  });

  it("parcelamento é a primeira parcela", () => {
    expect(entradaDe("5 parcelas", 1000)).toBe(200);
    expect(entradaDe("10x no cartão", 1000)).toBe(100);
  });

  /* Chutar uma entrada faria o cliente se programar errado; melhor a
     linha aparecer com a condição em texto e sem valor. */
  it("condição que não diz número devolve nulo", () => {
    expect(entradaDe("a combinar", 1000)).toBeNull();
    expect(entradaDe(null, 1000)).toBeNull();
  });

  it("percentual fora da faixa não é lido como entrada", () => {
    expect(entradaDe("120% de sinal", 1000)).toBeNull();
  });

  it("só as propostas com condição entram na soma", () => {
    const [c] = montaCenarios(
      agrupaDisciplinas(
        propostasValidas([
          q({ id: "a", supplier: "A", value: 1000, paymentTerms: "50% de entrada" }),
          q({ id: "b", discipline: "Serralheria", supplier: "B", value: 2000 }),
        ]),
      ),
    );
    const d = desembolsos(c);
    expect(d.filter((x) => x.entrada !== null)).toHaveLength(1);
  });
});

describe("Montagem completa", () => {
  it("sem cotação nenhuma a tela se declara vazia", () => {
    expect(analiseDeCenarios([], []).vazio).toBe(true);
    expect(analiseDeCenarios(undefined, undefined).vazio).toBe(true);
  });

  it("só placeholders também conta como vazio", () => {
    const r = analiseDeCenarios([q({ id: "z", supplier: null, value: 0, material: 0 })], []);
    expect(r.vazio).toBe(true);
    expect(r.cenarios).toHaveLength(0);
  });

  it("com propostas de verdade entrega os três cenários", () => {
    const r = analiseDeCenarios([...ALVENARIA, ...MARCENARIA], []);
    expect(r.vazio).toBe(false);
    expect(r.cenarios.map((c) => c.chave)).toEqual(["economico", "recomendado", "maximo"]);
  });
});

describe("Rótulo do cartão de cenário", () => {
  /*
   * Quando o escritório aprova justamente a proposta mais barata, o
   * recomendado empata com o econômico. Dois cartões idênticos dizendo
   * "referência" faziam o cliente procurar uma diferença que não
   * existe; a tela precisa dizer que são iguais.
   */
  it("o recomendado empata com o econômico quando a aprovada é a mais barata", () => {
    const r = analiseDeCenarios(ALVENARIA, []);
    const eco = r.cenarios.find((c) => c.chave === "economico")!;
    const rec = r.cenarios.find((c) => c.chave === "recomendado")!;
    expect(rec.total).toBe(eco.total);
    expect(rec.deltaReferencia).toBe(0);
    expect(rec.chave).not.toBe("economico");
  });
});
