import { describe, it, expect } from "vitest";
import { cronogramaReverso } from "@/lib/portalSchedule";
import type { PortalActivity } from "@/lib/portal";

/**
 * Cronograma reverso da Q153 (planilha da Camilla), do último marco para o
 * primeiro, como aparece no PDF. Só as linhas em que o PDF traz nome e data
 * juntos; as sem nome e as sem data ficaram de fora.
 */
const PLANILHA: [string, string, string][] = [
  ["2027-02-19", "2027-02-23", "SERVIÇO EXECUTADO"],
  ["2027-02-18", "2027-02-19", "PÓS OBRA - AJUSTES FINOS"],
  ["2027-02-08", "2027-02-12", "Arremates finais/ finalização de pendencias"],
  ["2027-02-04", "2027-02-05", "Instalação TV'S / Instalação Cortinas tecidos"],
  ["2027-01-12", "2027-01-19", "Limpeza Pós obra"],
  ["2026-12-22", "2026-12-24", "Retoque Pintura"],
  ["2026-12-16", "2026-12-21", "Instalação Luminária Decorativa"],
  ["2026-12-03", "2026-12-07", "Instalação marcenaria"],
  ["2026-12-01", "2026-12-01", "Instalação de divisórias"],
  ["2026-12-07", "2026-12-09", "MUDANÇA"],
  ["2026-12-02", "2026-12-03", "Entrega móveis"],
  ["2026-11-30", "2026-12-02", "Limpeza grossa de obra"],
  ["2026-11-20", "2026-12-04", "Medição de cortina"],
  ["2026-11-19", "2026-11-25", "Instalação ar cond"],
  ["2026-11-12", "2026-11-13", "Acabamentos Elétricos"],
  ["2026-11-11", "2026-11-11", "Instalação toldo"],
  ["2026-11-11", "2026-11-25", "Instalação de luminárias técnicas"],
  ["2026-11-10", "2026-11-10", "Pintura e emasseamento"],
  ["2026-11-02", "2026-11-10", "Instalação Bancadas"],
  ["2026-11-12", "2026-11-12", "Louças e metais"],
  ["2026-10-29", "2026-10-29", "Medição de toldo"],
  ["2026-10-28", "2026-11-09", "Revestimentos Cerâmicos"],
  ["2026-10-28", "2026-11-03", "Medição de divisórias"],
  ["2026-10-22", "2026-10-27", "Contrapiso e Impermeabilização"],
  ["2026-10-22", "2026-10-27", "Assinatura Executivo Marcenaria"],
  ["2026-10-20", "2026-11-10", "Medição marcenaria"],
  ["2026-10-15", "2026-11-02", "Instalaçao de piso"],
  ["2026-10-15", "2026-10-29", "fechamento Forro de gesso"],
  ["2026-10-14", "2026-10-16", "Infra itens de segurança"],
  ["2026-10-09", "2026-10-15", "Infra cabeamento estruturado e rede"],
  ["2026-10-08", "2026-10-13", "Instalação Cobertura"],
  ["2026-10-08", "2026-10-08", "Infra Hidráulica"],
  ["2026-09-29", "2026-10-15", "Infra Elétrica"],
  ["2026-09-21", "2026-09-29", "Infra de cobre e elétrica ar cond"],
];

const atividades: PortalActivity[] = PLANILHA.map(([start_date, end_date, name], i) => ({
  id: String(i), name, discipline: "Obra", status: "pendente", progress_percent: 0, start_date, end_date,
}));

describe("Q153", () => {
  const etapas = cronogramaReverso(atividades, "2026-11-04");
  it("sequência cronológica por início, depois término", () => {
    const chaves = etapas.map((e) => `${e.inicio}|${e.termino}`);
    expect(chaves).toEqual([...chaves].sort());
  });
  it("abre na infra de ar condicionado e fecha em Serviço executado, como a planilha de baixo para cima", () => {
    expect(etapas).toHaveLength(PLANILHA.length);
    expect(etapas[0].nome).toBe("Infra de cobre e elétrica ar cond");
    expect(etapas[etapas.length - 1].nome).toBe("SERVIÇO EXECUTADO");
    expect(etapas.slice(9, 11).map((e) => e.nome)).toEqual(["Assinatura Executivo Marcenaria", "Contrapiso e Impermeabilização"]);
  });

  it("o prazo exibido bate com a coluna PRAZO (DIAS ÚTEIS) da planilha, inclusive em feriado", () => {
    const PRAZO_PLANILHA: Record<string, number> = {
      "SERVIÇO EXECUTADO": 2, "PÓS OBRA - AJUSTES FINOS": 1, "Arremates finais/ finalização de pendencias": 4,
      "Instalação TV'S / Instalação Cortinas tecidos": 1, "Limpeza Pós obra": 5, "Retoque Pintura": 2,
      "Instalação Luminária Decorativa": 3, "Instalação marcenaria": 2, "Instalação de divisórias": 0, "MUDANÇA": 2,
      "Entrega móveis": 1, "Limpeza grossa de obra": 2, "Medição de cortina": 10, "Instalação ar cond": 4,
      "Acabamentos Elétricos": 1, "Instalação de luminárias técnicas": 10, "Pintura e emasseamento": 0,
      "Instalação Bancadas": 6, "Louças e metais": 0, "Medição de toldo": 0, "Revestimentos Cerâmicos": 8,
      "Medição de divisórias": 4, "Assinatura Executivo Marcenaria": 3, "Medição marcenaria": 15,
      "Instalaçao de piso": 12, "fechamento Forro de gesso": 10, "Infra itens de segurança": 2,
      "Infra cabeamento estruturado e rede": 4, "Instalação Cobertura": 3, "Infra Hidráulica": 0,
      "Infra Elétrica": 12, "Infra de cobre e elétrica ar cond": 6,
    };
    const comPrazo = etapas.filter((e) => e.nome in PRAZO_PLANILHA);
    expect(comPrazo.length).toBeGreaterThanOrEqual(30);
    expect(comPrazo.filter((e) => e.prazoPlanilha !== PRAZO_PLANILHA[e.nome]).map((e) => e.nome)).toEqual([]);
    // O cálculo interno continua respeitando feriados (recesso de fim de ano).
    expect(etapas.find((e) => e.nome === "Retoque Pintura")?.metricas.totalDays).toBe(1);
  });
});
