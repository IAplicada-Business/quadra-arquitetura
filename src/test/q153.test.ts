import { describe, it, expect } from "vitest";
import { cronogramaReverso } from "@/lib/portalSchedule";
import type { PortalActivity } from "@/lib/portal";

/**
 * Cronograma reverso da Q153 (planilha da Camilla), transcrito do print, na
 * ordem em que a planilha lista (do último marco para o primeiro).
 * [começo, término, serviço, prazo (dias úteis) ou null quando em branco]
 */
const PLANILHA: [string, string, string, number | null][] = [
  ["2027-02-19", "2027-02-23", "Arremates finais/ finalização de pendencias", 2],
  ["2027-02-18", "2027-02-19", "Instalação TV'S / Instalação Cortinas tecidos", 1],
  ["2027-02-15", "2027-02-17", "Limpeza Pós obra", 2],
  ["2027-02-08", "2027-02-12", "Retoque Pintura", 4],
  ["2027-02-04", "2027-02-05", "Instalação Luminária Decorativa", 1],
  ["2027-01-21", "2027-02-04", "Instalação marcenaria", 10],
  ["2027-01-12", "2027-01-19", "Instalação de divisórias", 5],
  ["2026-12-22", "2026-12-24", "MUDANÇA", 2],
  ["2026-12-16", "2026-12-21", "Entrega móveis", 3],
  ["2026-12-03", "2026-12-07", "Limpeza grossa de obra", 2],
  ["2026-12-01", "2026-12-01", "Medição de cortina", 0],
  ["2026-12-08", "2026-12-11", "Instalação ar cond", 3],
  ["2026-12-07", "2026-12-09", "Acabamentos Elétricos", 2],
  ["2026-12-02", "2026-12-03", "Instalação toldo", 1],
  ["2026-11-30", "2026-12-02", "Instalação de luminárias técnicas", 2],
  ["2026-11-20", "2026-12-04", "Pintura e emasseamento", 10],
  ["2026-11-19", "2026-11-25", "Instalação Bancadas", 4],
  ["2026-11-12", "2026-11-13", "Louças e metais", 1],
  ["2026-11-11", "2026-11-11", "Medição de toldo", null],
  ["2026-11-11", "2026-11-25", "Revestimentos Cerâmicos", 10],
  ["2026-11-10", "2026-11-10", "Medição de divisórias", 0],
  ["2026-11-02", "2026-11-10", "Contrapiso e Impermeabilização", 6],
  ["2026-11-12", "2026-11-12", "Assinatura Executivo Marcenaria", 0],
  ["2026-10-29", "2026-10-29", "Medição marcenaria", 0],
  ["2026-10-28", "2026-11-09", "Instalação de piso", 8],
  ["2026-10-28", "2026-11-03", "fechamento Forro de gesso", 4],
  ["2026-10-22", "2026-10-27", "Infra itens de segurança", null],
  ["2026-10-22", "2026-10-27", "Infra cabeamento estruturado e rede", 3],
  ["2026-10-20", "2026-11-10", "Instalação Cobertura", 15],
  ["2026-10-15", "2026-11-02", "Infra Hidráulica", 12],
  ["2026-10-15", "2026-10-29", "Infra Elétrica", 10],
  ["2026-10-14", "2026-10-16", "Infra de cobre e elétrica ar cond", 2],
  ["2026-10-09", "2026-10-15", "Construção de paredes de drywall", 4],
  ["2026-10-08", "2026-10-13", "Estruturação do forro de gesso", 3],
  ["2026-10-08", "2026-10-08", "Medição bancadas", 0],
  ["2026-10-07", "2026-10-07", "Compra dos móveis", 0],
  ["2026-09-29", "2026-10-15", "Demolição", 12],
  ["2026-09-21", "2026-09-29", "Início Obra - mobilização obra", 6],
];

const atividades: PortalActivity[] = PLANILHA.map(([start_date, end_date, name], i) => ({
  id: String(i), name, discipline: "Obra", status: "pendente", progress_percent: 0, start_date, end_date,
}));

describe("Q153", () => {
  const etapas = cronogramaReverso(atividades, "2026-11-04");

  it("traz todas as linhas da planilha", () => {
    expect(etapas).toHaveLength(PLANILHA.length);
  });

  it("a sequência cronológica começa na mobilização e termina nos arremates", () => {
    expect(etapas[0].nome).toBe("Início Obra - mobilização obra");
    expect(etapas[etapas.length - 1].nome).toBe("Arremates finais/ finalização de pendencias");
    const chaves = etapas.map((e) => `${e.inicio}|${e.termino}`);
    expect(chaves).toEqual([...chaves].sort());
  });

  it("o prazo exibido bate com a coluna PRAZO (DIAS ÚTEIS) da planilha, inclusive em feriado", () => {
    const divergentes = PLANILHA.filter(([, , nome, prazo]) => prazo !== null &&
      etapas.find((e) => e.nome === nome)?.prazoPlanilha !== prazo).map(([, , nome]) => nome);
    expect(divergentes).toEqual([]);
    // O cálculo interno continua respeitando feriados (Carnaval de 2027).
    expect(etapas.find((e) => e.nome === "Retoque Pintura")?.prazoPlanilha).toBe(4);
    expect(etapas.find((e) => e.nome === "Retoque Pintura")?.metricas.totalDays).toBe(2);
  });
});
