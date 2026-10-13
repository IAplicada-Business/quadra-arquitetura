import { describe, it, expect } from "vitest";
import type { PortalData } from "@/lib/portal";
import {
  buildPortalTrail,
  clientAdoption,
  constructionBlocks,
  deliveredScopes,
  projectHealth,
  trailActivities,
  upcomingDeliveries,
} from "@/lib/portalTrail";

const HOJE = "2026-10-13";

const base: PortalData = {
  project: { name: "Apto Sion", address: null, city: null, estimated_budget: null, ideal_budget: null, client_move_in_date: "2026-12-15" },
  tasks: [],
  payments: [],
  invoices: [],
  photos: [],
  weekly_reports: [],
  pending_responses: [],
  activities: [
    { id: "a1", name: "Demolição", discipline: "Civil", status: "concluida", progress_percent: 100, start_date: "2026-08-01", end_date: "2026-08-10" },
    { id: "a2", name: "Alvenaria", discipline: "Civil", status: "concluida", progress_percent: 100, start_date: "2026-08-11", end_date: "2026-09-05" },
    { id: "a3", name: "Pontos", discipline: "Elétrica", status: "em_andamento", progress_percent: 40, start_date: "2026-10-01", end_date: "2026-10-30" },
    { id: "a4", name: "Pintura geral", discipline: "Pintura", status: "pendente", progress_percent: 0, start_date: "2026-11-03", end_date: "2026-11-20" },
  ],
  closing_items: [],
  visits: [],
};

describe("blocos de construção e escopos entregues", () => {
  it("agrupa por disciplina em ordem cronológica, com estado e progresso", () => {
    const blocks = constructionBlocks(base.activities!, HOJE);
    expect(blocks.map((b) => [b.name, b.state, b.progress, b.start, b.end])).toEqual([
      ["Civil", "concluido", 100, "2026-08-01", "2026-09-05"],
      ["Elétrica", "em_andamento", 40, "2026-10-01", "2026-10-30"],
      ["Pintura", "a_iniciar", 0, "2026-11-03", "2026-11-20"],
    ]);
    expect(deliveredScopes(blocks).map((b) => b.name)).toEqual(["Civil"]);
  });

  it("bloco com término vencido e não concluído fica atrasado", () => {
    const [b] = constructionBlocks([{ id: "x", name: "Gesso", discipline: "Gesso", status: "em_andamento", progress_percent: 80, start_date: "2026-09-01", end_date: "2026-10-01" }], HOJE);
    expect(b.late).toBe(true);
  });

  it("obra sem atividades usa as etapas antigas do portal", () => {
    const acts = trailActivities({ activities: [], tasks: [{ id: "t1", task_name: "Fundação", start_date: "2026-08-01", end_date: "2026-08-10", status: "executado", discipline: null, color: null, progress_percentage: 100 }] });
    expect(constructionBlocks(acts, HOJE)).toEqual([expect.objectContaining({ name: "Fundação", state: "concluido" })]);
  });
});

describe("saúde do projeto", () => {
  it("no ritmo quando nada atrasa e não há pendências", () => {
    const blocks = constructionBlocks(base.activities!, HOJE);
    expect(projectHealth(base, blocks, HOJE)).toMatchObject({ level: "ok", label: "No ritmo" });
  });

  it("em risco quando o término passa da mudança; atenção com uma decisão aberta e parcela vencida", () => {
    const late: PortalData = { ...base, project: { ...base.project, client_move_in_date: "2026-11-10" } };
    expect(projectHealth(late, constructionBlocks(late.activities!, HOJE), HOJE).level).toBe("risco");

    const withPending: PortalData = {
      ...base,
      weekly_reports: [{ id: "r1", week_start: "2026-10-05", summary: "", next_steps: "", completion_percent: 30, photo_urls: [], client_pending: "Escolher o porcelanato", created_at: "2026-10-09" }],
      payments: [{ id: "p1", value: 1000, due_date: "2026-10-01", paid_date: null, status: "pendente", description: null, payment_method: null }],
    };
    const h = projectHealth(withPending, constructionBlocks(withPending.activities!, HOJE), HOJE);
    expect(h.level).toBe("atencao");
    expect(h.signals.find((s) => s.key === "decisoes")?.detail).toMatch(/1 decisão aguardando/);
    expect(h.signals.find((s) => s.key === "pagamentos")?.detail).toBe("1 parcela vencida.");
  });
});

describe("adoção", () => {
  it("mede decisões respondidas, fechamentos resolvidos e tempo médio de resposta", () => {
    const data: PortalData = {
      ...base,
      weekly_reports: [
        { id: "r1", week_start: "2026-09-01", summary: "", next_steps: "", completion_percent: 10, photo_urls: [], client_pending: "Cor da parede", created_at: "2026-09-01T10:00:00Z" },
        { id: "r2", week_start: "2026-09-08", summary: "", next_steps: "", completion_percent: 20, photo_urls: [], client_pending: "Metais", created_at: "2026-09-08T10:00:00Z" },
      ],
      pending_responses: [
        { id: "x1", weekly_report_id: "r1", pending_item: "Cor da parede", response_text: null, status: "aprovado", responded_at: "2026-09-03T10:00:00Z", client_name: "Ana", created_at: "2026-09-03" },
      ],
      closing_items: [
        { id: "c1", description: "Marcenaria", closing_date: "2026-10-01", delivery_date: null, status: "entregue" },
        { id: "c2", description: "Mármore", closing_date: "2026-10-20", delivery_date: null, status: "em_cotacao" },
      ],
    };
    expect(clientAdoption(data)).toEqual({
      score: 50,
      avgResponseDays: 2,
      metrics: [
        { key: "decisoes", label: "Decisões respondidas", done: 1, total: 2 },
        { key: "fechamento", label: "Itens de fechamento resolvidos", done: 1, total: 2 },
      ],
    });
  });

  it("sem nada a medir, score nulo", () => {
    expect(clientAdoption(base).score).toBeNull();
  });
});

describe("próximas entregas", () => {
  it("lista marcos da obra e do cliente em ordem, destacando o que depende do cliente", () => {
    const data: PortalData = {
      ...base,
      closing_items: [
        { id: "c1", description: "Mármore da bancada", closing_date: "2026-10-20", delivery_date: "2026-11-15", status: "em_cotacao" },
        { id: "c2", description: "Geladeira", closing_date: "2026-09-01", delivery_date: "2026-10-25", status: "entregue" },
      ],
      visits: [{ id: "v1", visit_date: "2026-10-28T09:00:00Z", visit_type: "vistoria" }],
    };
    const items = upcomingDeliveries(data, constructionBlocks(data.activities!, HOJE), HOJE, { limit: 10 });
    expect(items.map((i) => [i.date, i.title, i.clientAction])).toEqual([
      ["2026-10-20", "Fechar: Mármore da bancada", true],
      ["2026-10-28", "Vistoria", false],
      ["2026-10-30", "Conclusão: Elétrica", false],
      ["2026-11-03", "Início: Pintura", false],
      ["2026-11-15", "Chega na obra: Mármore da bancada", false],
      ["2026-11-20", "Conclusão: Pintura", false],
      ["2026-12-15", "Mudança", false],
    ]);
  });

  it("buildPortalTrail junta os cinco blocos", () => {
    const t = buildPortalTrail(base, new Date(2026, 9, 13));
    expect(t.delivered).toHaveLength(1);
    expect(t.blocks).toHaveLength(3);
    expect(t.health.level).toBe("ok");
    expect(t.upcoming.length).toBeGreaterThan(0);
  });
});
