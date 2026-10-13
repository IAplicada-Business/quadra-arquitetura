import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeFunnel, funnelWidths, lastSixMonths, periodBounds, inPeriod } from "@/lib/funnel";
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
