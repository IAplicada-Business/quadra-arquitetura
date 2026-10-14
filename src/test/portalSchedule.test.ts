import { describe, it, expect } from "vitest";
import {
  cronogramaDeCompras,
  cronogramaReverso,
  diasDeEntrega,
  etapaConcluida,
  inicioPorDisciplina,
  linhasDeCompra,
  linhasDeContratacao,
  recuaDiasUteis,
  resumoDoCronograma,
} from "@/lib/portalSchedule";
import { agrupaDisciplinas, propostasValidas } from "@/lib/portalScenarios";
import type { PortalActivity, PortalPurchase, PortalQuote } from "@/lib/portal";

const ativ = (over: Partial<PortalActivity> & { id: string; name: string }): PortalActivity => ({
  discipline: "Obra",
  status: "pendente",
  progress_percent: 0,
  start_date: "2026-06-15",
  end_date: "2026-06-19",
  ...over,
});

describe("Quando uma etapa está concluída", () => {
  /*
   * Caso real do banco: "Preparação e Proteção de Obra" está com
   * progress_percent 100 e status 'pendente', porque o status só é
   * mexido quando alguém lembra e o progresso vem da medição. Ler o
   * status mostraria obra pronta como pendente.
   */
  it("o progresso manda, não o status", () => {
    expect(etapaConcluida(ativ({ id: "a", name: "Preparação", status: "pendente", progress_percent: 100 }))).toBe(true);
  });

  it("status explícito de concluída também vale", () => {
    expect(etapaConcluida(ativ({ id: "a", name: "x", status: "concluida", progress_percent: 0 }))).toBe(true);
  });

  it("progresso parcial não é conclusão", () => {
    expect(etapaConcluida(ativ({ id: "a", name: "x", progress_percent: 80 }))).toBe(false);
  });
});

describe("Cronograma reverso", () => {
  const hoje = "2026-06-18";
  const etapas = cronogramaReverso(
    [
      ativ({ id: "c", name: "Elétrica", start_date: "2026-06-22", end_date: "2026-06-26", discipline: "Elétrica" }),
      ativ({ id: "a", name: "Demolição", start_date: "2026-06-15", end_date: "2026-06-16", discipline: "Demolição" }),
      ativ({ id: "b", name: "Preparação", start_date: "2026-06-15", end_date: "2026-06-17", progress_percent: 100 }),
    ],
    hoje,
  );

  it("ordena pela data em que acontecem", () => {
    expect(etapas.map((e) => e.nome)).toEqual(["Demolição", "Preparação", "Elétrica"]);
  });

  it("classifica concluída, atrasada e a iniciar", () => {
    const por = Object.fromEntries(etapas.map((e) => [e.nome, e.situacao]));
    expect(por["Preparação"]).toBe("concluida");
    expect(por["Demolição"]).toBe("atrasada");
    expect(por["Elétrica"]).toBe("a_iniciar");
  });

  it("a disciplina chega normalizada", () => {
    const [e] = cronogramaReverso([ativ({ id: "a", name: "x", discipline: "  elétrica " })], hoje);
    expect(e.disciplina).toBe("Elétrica");
  });

  it("etapa sem data não derruba a ordenação", () => {
    const r = cronogramaReverso([ativ({ id: "s", name: "Sem data", start_date: null, end_date: null })], hoje);
    expect(r).toHaveLength(1);
    expect(r[0].situacao).toBe("a_iniciar");
  });

  it("o progresso é limitado à faixa de 0 a 100", () => {
    const [e] = cronogramaReverso([ativ({ id: "a", name: "x", progress_percent: 160 })], hoje);
    expect(e.progresso).toBe(100);
  });

  it("o resumo conta cada situação e o maior atraso", () => {
    const r = resumoDoCronograma(etapas);
    expect(r.total).toBe(3);
    expect(r.concluidas).toBe(1);
    expect(r.atrasadas).toBe(1);
    expect(r.aIniciar).toBe(1);
    expect(r.maiorAtraso).toBeGreaterThan(0);
    expect(r.primeiroInicio).toBe("2026-06-15");
    expect(r.ultimoTermino).toBe("2026-06-26");
  });

  it("cronograma vazio não quebra o resumo", () => {
    const r = resumoDoCronograma([]);
    expect(r.total).toBe(0);
    expect(r.avanco).toBe(0);
    expect(r.primeiroInicio).toBeNull();
  });
});

describe("Prazo de entrega escrito à mão", () => {
  it("lê dias", () => {
    expect(diasDeEntrega("15 dias")).toBe(15);
    expect(diasDeEntrega("30")).toBe(30);
  });

  it("semana vira cinco dias úteis", () => {
    expect(diasDeEntrega("3 semanas")).toBe(15);
  });

  /* O cronograma inteiro corre em dias úteis; somar dias corridos
     adiantaria a data de compra e o item chegaria depois da obra. */
  it("dias corridos viram o equivalente em úteis", () => {
    expect(diasDeEntrega("45 dias corridos")).toBe(32);
  });

  it("mês vira 21 dias úteis", () => {
    expect(diasDeEntrega("2 meses")).toBe(42);
  });

  it("texto sem número nenhum não inventa prazo", () => {
    expect(diasDeEntrega("a combinar")).toBeNull();
    expect(diasDeEntrega(null)).toBeNull();
    expect(diasDeEntrega("")).toBeNull();
  });
});

describe("Recuo em dias úteis", () => {
  /* O addBusinessDays do calendário só anda para a frente; o cronograma
     de compras é todo para trás. */
  it("pula o fim de semana ao recuar", () => {
    // 2026-06-15 é segunda; 3 dias úteis antes é a quarta anterior
    expect(recuaDiasUteis("2026-06-15", 3)).toBe("2026-06-10");
  });

  it("recuar zero fica no lugar", () => {
    expect(recuaDiasUteis("2026-06-15", 0)).toBe("2026-06-15");
  });
});

describe("Compra e contratação", () => {
  const hoje = "2026-06-01";
  const etapas = cronogramaReverso(
    [
      ativ({ id: "m", name: "Montagem de marcenaria", discipline: "Marcenaria", start_date: "2026-07-20", end_date: "2026-07-31" }),
      ativ({ id: "r", name: "Assentamento", discipline: "Revestimentos", start_date: "2026-06-22", end_date: "2026-06-30" }),
    ],
    hoje,
  );
  const inicios = inicioPorDisciplina(etapas);

  it("acha a primeira data de obra de cada disciplina", () => {
    expect(inicios.get("Marcenaria")).toBe("2026-07-20");
    expect(inicios.get("Revestimentos")).toBe("2026-06-22");
  });

  const quotes: PortalQuote[] = [
    {
      id: "q1",
      discipline: "Marcenaria",
      supplier: "Partum",
      value: 162730,
      material: 0,
      deliveryTime: "30 dias",
      paymentTerms: "50% de entrada",
      status: "pendente",
      revision: "Rev 1",
      isCurrentRevision: true,
      quotedAt: "2026-05-20",
      validUntil: null,
    },
  ];
  const disciplinas = agrupaDisciplinas(propostasValidas(quotes));

  /*
   * É o coração da dobra: a data limite não é digitada por ninguém, ela
   * recua o prazo do fornecedor a partir do dia em que a obra precisa
   * do item. Quando a obra anda, a data de compra anda junto.
   */
  it("a data de fechar recua o prazo de entrega a partir do início da obra", () => {
    const [l] = linhasDeContratacao(disciplinas, inicios, hoje);
    expect(l.precisaEm).toBe("2026-07-20");
    expect(l.entregaDias).toBe(30);
    expect(l.fecharAte).toBe(recuaDiasUteis("2026-07-20", 30));
    expect(l.fecharAte! < l.precisaEm!).toBe(true);
  });

  it("sem prazo de entrega a data limite é o próprio início da obra", () => {
    const semPrazo = agrupaDisciplinas(propostasValidas([{ ...quotes[0], id: "q2", deliveryTime: null }]));
    const [l] = linhasDeContratacao(semPrazo, inicios, hoje);
    expect(l.fecharAte).toBe("2026-07-20");
    expect(l.entregaDias).toBeNull();
  });

  it("disciplina fora do cronograma fica sem data em vez de com data inventada", () => {
    const [l] = linhasDeContratacao(disciplinas, new Map(), hoje);
    expect(l.fecharAte).toBeNull();
    expect(l.urgencia).toBe("sem_data");
  });

  it("o que já foi contratado não é cobrado por prazo", () => {
    const contratada = disciplinas.map((d) => ({ ...d, contratada: true }));
    const [l] = linhasDeContratacao(contratada, inicios, hoje);
    expect(l.urgencia).toBe("fechado");
    expect(l.diasAteLimite).toBeNull();
    expect(l.status).toBe("Contratado");
  });

  const compras: PortalPurchase[] = [
    {
      id: "c1",
      name: "Porcelanato",
      category: "Revestimentos",
      supplier_name: "Portobello",
      value: 4705.6,
      deadline: null,
      status: "pendente",
      payment_info: null,
      product_link: null,
    },
    {
      id: "c2",
      name: "Cooktop",
      category: "Diversos",
      supplier_name: null,
      value: 487.82,
      deadline: "2026-05-20",
      status: "comprado",
      payment_info: null,
      product_link: "https://exemplo",
    },
  ];

  it("a compra sem prazo próprio herda a data da disciplina no cronograma", () => {
    const [porcelanato] = linhasDeCompra(compras, inicios, hoje);
    expect(porcelanato.precisaEm).toBe("2026-06-22");
    expect(porcelanato.fecharAte).toBe("2026-06-22");
  });

  /* Prazo cadastrado à mão foi alguém olhando o caso: ele manda. */
  it("o prazo cadastrado na compra tem precedência", () => {
    const [, cooktop] = linhasDeCompra(compras, inicios, hoje);
    expect(cooktop.fecharAte).toBe("2026-05-20");
  });

  it("compra já feita aparece fechada", () => {
    const [, cooktop] = linhasDeCompra(compras, inicios, hoje);
    expect(cooktop.urgencia).toBe("fechado");
    expect(cooktop.status).toBe("Comprado");
  });

  it("o link do produto chega à linha", () => {
    const [, cooktop] = linhasDeCompra(compras, inicios, hoje);
    expect(cooktop.link).toBe("https://exemplo");
  });

  it("junta contratação e compra numa lista só, pela cobrança", () => {
    const r = cronogramaDeCompras([
      ...linhasDeContratacao(disciplinas, inicios, hoje),
      ...linhasDeCompra(compras, inicios, hoje),
    ]);
    expect(r.linhas).toHaveLength(3);
    // o fechado vai para o fim
    expect(r.linhas[r.linhas.length - 1].urgencia).toBe("fechado");
  });

  it("o que está atrasado abre a lista", () => {
    const atrasadoHoje = "2026-08-01";
    const r = cronogramaDeCompras([
      ...linhasDeContratacao(disciplinas, inicios, atrasadoHoje),
      ...linhasDeCompra(compras, inicios, atrasadoHoje),
    ]);
    expect(r.linhas[0].urgencia).toBe("atrasado");
    expect(r.atrasadas).toBeGreaterThan(0);
  });

  it("o total a desembolsar ignora o que já foi fechado", () => {
    const r = cronogramaDeCompras(linhasDeCompra(compras, inicios, hoje));
    expect(r.aDesembolsar).toBeCloseTo(4705.6, 2);
    expect(r.pendentes).toBe(1);
  });
});
