import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeFunnel, computeFunnelByPeriod, conversionBy, funnelWidths, lastSixMonths, lostReasons, periodBounds, inPeriod, pipelineByMonth } from "@/lib/funnel";
import { buildPartnerMetrics } from "@/hooks/usePartnerMetrics";
import { FunnelChart } from "@/components/dashboard/FunnelChart";

const lead = (status: string) => ({ status });

describe("computeFunnel", () => {
  it("conta quem chegou pelo menos até cada etapa e as conversões", () => {
    const f = computeFunnel([
      lead("novo"), lead("novo"), lead("contato_feito"), lead("reuniao_agendada"),
      lead("proposta_enviada"), lead("fechado"), lead("perdido"), lead("em_contato"),
    ]);
    expect(f.stages.map((s) => s.count)).toEqual([8, 5, 3, 2, 1]);
    expect(f.rates).toEqual([63, 60, 67, 50]);
    expect(f.total).toBe(13);
  });

  it("funil vazio não divide por zero", () => {
    const f = computeFunnel([], "Indicações");
    expect(f.stages[0]).toEqual({ label: "Indicações", count: 0 });
    expect(f.rates).toEqual([0, 0, 0, 0]);
    expect(f.total).toBe(0);
  });
});

describe("funnelWidths", () => {
  it("topo ocupa 100% e etapa zerada ainda tem bico mínimo", () => {
    const w = funnelWidths([10, 5, 0]);
    expect(w[0]).toBe(100);
    expect(w[1]).toBeCloseTo(62);
    expect(w[2]).toBe(24);
  });
});

describe("períodos", () => {
  const today = new Date(2026, 9, 13);
  it("mês passado é [01/09, 01/10)", () => {
    const b = periodBounds("mes_passado", today);
    expect(inPeriod("2026-09-30T12:00:00", b)).toBe(true);
    expect(inPeriod("2026-10-01T12:00:00", b)).toBe(false);
  });
  it("últimos 6 meses terminam no mês atual", () => {
    const m = lastSixMonths(today);
    expect(m.map((x) => x.key)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(m[5].label).toBe("Out");
  });
});

describe("buildPartnerMetrics", () => {
  const today = new Date(2026, 9, 13);
  const partners = [
    { id: "p1", name: "Ana", partner_stage: "parceria_ativa" as const },
    { id: "p2", name: "Bia", partner_stage: "novo" as const },
  ];
  const referred = [
    { id: "l1", status: "fechado", created_at: "2026-10-02T10:00:00", referred_by_partner_id: "p1" },
    { id: "l2", status: "contato_feito", created_at: "2026-10-05T10:00:00", referred_by_partner_id: "p1" },
    { id: "l3", status: "proposta_enviada", created_at: "2026-10-06T10:00:00", referred_by_partner_id: "p2" },
    { id: "l4", status: "novo", created_at: "2026-08-01T10:00:00", referred_by_partner_id: "p2" },
  ];

  it("filtra as indicações pelo período", () => {
    const m = buildPartnerMetrics(partners, referred, "mes_atual", today);
    expect(m.indicacoesNoPeriodo).toBe(3);
    expect(m.indicacoesFechadas).toBe(1);
    expect(m.taxaConversaoIndicacoes).toBe(33);
    expect(m.parceirosQueIndicaram).toBe(2);
    expect(m.topParceiros[0]).toEqual({ partnerId: "p1", name: "Ana", count: 2 });
    expect(m.funil.stages.map((s) => s.count)).toEqual([3, 3, 2, 2, 1]);
    expect(m.parceirosAtivos).toBe(1);
  });

  it("série de 6 meses usa todas as indicações", () => {
    const m = buildPartnerMetrics(partners, referred, "mes_atual", today);
    const out = m.indicacoes6m[5];
    expect(out).toEqual({ month: "Out", fechados: 1, propostas: 1, em_andamento: 1 });
    expect(m.indicacoes6m[3].em_andamento).toBe(1);
    expect(m.porEtapa.find((e) => e.stage === "novo")?.count).toBe(1);
  });
});

describe("FunnelChart", () => {
  it("mostra quantidade e conversão de cada etapa", () => {
    render(<FunnelChart funnel={computeFunnel([lead("fechado"), lead("novo")])} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getAllByText("da etapa anterior")).toHaveLength(4);
    expect(screen.getByText("entrada")).toBeTruthy();
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
  });
});

describe("computeFunnelByPeriod", () => {
  const today = new Date(2026, 10, 4); // 04/11/2026
  const L = (id: string, status: string, created_at: string, converted_at: string | null = null, updated_at: string | null = null) =>
    ({ id, status, created_at, converted_at, updated_at });
  const leads = [
    L("paula", "fechado", "2026-10-10T10:00:00", "2026-11-03T10:00:00"), // criado mês passado, fechou este mês
    L("novo", "novo", "2026-11-02T10:00:00"),
    L("parado", "contato_feito", "2026-10-15T10:00:00"), // não avançou
    L("antigo", "fechado", "2026-08-01T10:00:00", null, "2026-10-20T10:00:00"), // sem converted_at: usa updated_at
    L("mesmo", "fechado", "2026-11-01T10:00:00", "2026-11-02T10:00:00"),
  ];

  it("mês atual: lead criado antes e fechado agora conta como fechado (não zera)", () => {
    const f = computeFunnelByPeriod(leads, periodBounds("mes_atual", today));
    expect(f.stages.map((s) => s.count)).toEqual([2, 2, 2, 2, 2]);
    expect(f.total).toBe(100);
  });

  it("mês passado: fechamento por updated_at quando falta converted_at", () => {
    const f = computeFunnelByPeriod(leads, periodBounds("mes_passado", today));
    expect(f.closed.map((l) => l.id)).toEqual(["antigo"]);
    expect(f.created.map((l) => l.id)).toEqual(["paula", "parado"]);
    expect(f.stages[4].count).toBe(1);
    expect(f.total).toBe(50);
  });

  it("todos: tudo que fechou, sobre todos os leads", () => {
    const f = computeFunnelByPeriod(leads, periodBounds("tudo", today));
    expect(f.stages.map((s) => s.count)).toEqual([5, 4, 3, 3, 3]);
    expect(f.total).toBe(60);
  });

  it("lead que não avançou não vira fechado e período vazio não divide por zero", () => {
    expect(computeFunnelByPeriod(leads, periodBounds("mes_atual", today)).closed.some((l) => l.id === "parado")).toBe(false);
    const f = computeFunnelByPeriod([], periodBounds("mes_atual", today));
    expect(f.total).toBe(0);
  });

  it("pipeline de 6 meses põe o fechado no mesmo mês que o funil, mesmo com updated_at em outro mês", () => {
    const comEdicaoDepois = [
      ...leads,
      L("editado", "fechado", "2026-09-05T10:00:00", "2026-10-28T10:00:00", "2026-11-02T10:00:00"),
    ];
    const meses = pipelineByMonth(comEdicaoDepois, today);
    expect(meses.map((m) => m.month)).toEqual(["Jun", "Jul", "Ago", "Set", "Out", "Nov"]);
    const out = meses[4];
    const nov = meses[5];
    // Out: antigo (updated_at) + editado (converted_at). Nov: paula + mesmo.
    expect(out.fechados).toBe(2);
    expect(nov.fechados).toBe(2);
    expect(out.em_andamento).toBe(1); // parado
    expect(out.fechados).toBe(computeFunnelByPeriod(comEdicaoDepois, periodBounds("mes_passado", today)).closed.length);
    expect(nov.fechados).toBe(computeFunnelByPeriod(comEdicaoDepois, periodBounds("mes_atual", today)).closed.length);
  });
});

describe("conversionBy e lostReasons", () => {
  const today = new Date(2026, 10, 4);
  const L = (id: string, status: string, origin: string, created_at: string, converted_at: string | null = null, lost_reason: string | null = null) =>
    ({ id, status, origin, created_at, converted_at, updated_at: null, lost_reason });
  const leads = [
    L("paula", "fechado", "indicacao", "2026-10-10T10:00:00", "2026-11-03T10:00:00"),
    L("ana", "novo", "indicacao", "2026-11-02T10:00:00"),
    L("bia", "fechado", "instagram", "2026-11-01T10:00:00", "2026-11-02T10:00:00"),
    L("caio", "perdido", "instagram", "2026-11-03T10:00:00", null, "Preço"),
    L("davi", "perdido_definitivo", "google", "2026-11-03T10:00:00", null, "Preço"),
    L("eva", "perdido", "google", "2026-11-03T10:00:00", null, "Prazo"),
    L("velho", "perdido", "google", "2026-09-01T10:00:00", null, "Prazo"),
    L("sem", "perdido", "site", "2026-11-03T10:00:00"),
  ];

  it("conversão por origem usa a régua do funil: criados no período e fechados no período", () => {
    const rows = conversionBy(leads, (l) => l.origin, periodBounds("mes_atual", today));
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    // Paula foi criada em outubro e fechou em novembro: conta como fechado, não como lead do mês.
    expect(by.indicacao).toMatchObject({ total: 1, fechados: 1, rate: 100 });
    expect(by.instagram).toMatchObject({ total: 2, fechados: 1, rate: 50 });
    expect(by.google).toMatchObject({ total: 2, fechados: 0, rate: 0 });
    expect(rows.map((r) => r.key).slice(0, 2)).toEqual(["indicacao", "instagram"]);
  });

  it("em todo o período bate com a conta simples fechados / total por origem", () => {
    const by = Object.fromEntries(conversionBy(leads, (l) => l.origin, periodBounds("tudo", today)).map((r) => [r.key, r]));
    expect(by.indicacao).toMatchObject({ total: 2, fechados: 1, rate: 50 });
    expect(by.google).toMatchObject({ total: 3, fechados: 0 });
  });

  it("motivos de perda: só perdidos criados no período e com motivo", () => {
    expect(lostReasons(leads, periodBounds("mes_atual", today))).toEqual([
      { reason: "Preço", count: 2 },
      { reason: "Prazo", count: 1 },
    ]);
    expect(lostReasons(leads, periodBounds("tudo", today))).toEqual([
      { reason: "Prazo", count: 2 },
      { reason: "Preço", count: 2 },
    ]);
  });
});
