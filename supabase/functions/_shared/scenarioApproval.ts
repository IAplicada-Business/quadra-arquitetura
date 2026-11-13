/**
 * Regras puras da aprovação de cenário pelo cliente (portal, por token).
 * Sem Deno nem Supabase aqui, para a edge function `submit-scenario-action`
 * e os testes do vitest (`src/lib/portalScenarioApproval.ts`) usarem o mesmo código.
 */

export interface ApprovalScenario {
  id: string;
  project_id: string;
  is_locked: boolean | null;
  approved_at: string | null;
}

export interface ApprovalItem {
  id: string;
  scenario_id: string;
  estimated_value: number | null;
  is_included: boolean | null;
}

export type ApprovalCheck = { ok: true } | { ok: false; status: number; error: string };

const NAME_MIN = 2;
const NAME_MAX = 80;

/** Nome de quem aprova: o cliente não tem login, então o nome digitado é o registro. */
export function validateClientName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (name.length < NAME_MIN) return { ok: false, error: "Informe seu nome para registrar a aprovação" };
  if (name.length > NAME_MAX) return { ok: false, error: "Nome muito longo" };
  // Sem caracteres de controle nem de marcação: o nome vai para notificações e histórico.
  if (/[\u0000-\u001f<>]/.test(name)) return { ok: false, error: "Nome inválido" };
  return { ok: true, name };
}

/** Cenário só aceita ação do cliente se for do projeto do token e ainda estiver aberto. */
export function checkScenarioOpen(scenario: ApprovalScenario | null | undefined, projectId: string): ApprovalCheck {
  if (!scenario || scenario.project_id !== projectId) {
    return { ok: false, status: 404, error: "Cenário não encontrado" };
  }
  if (scenario.is_locked || scenario.approved_at) {
    return { ok: false, status: 409, error: "Orçamento já aprovado: peça à equipe para reabrir" };
  }
  return { ok: true };
}

/** Item precisa pertencer ao cenário informado (o id vem do cliente, não se confia nele). */
export function checkItemInScenario(item: ApprovalItem | null | undefined, scenarioId: string): ApprovalCheck {
  if (!item || item.scenario_id !== scenarioId) {
    return { ok: false, status: 404, error: "Item não encontrado neste cenário" };
  }
  return { ok: true };
}

/** Total do cenário: só itens incluídos, sempre recalculado no servidor. */
export function scenarioTotal(items: Pick<ApprovalItem, "estimated_value" | "is_included">[]): number {
  return items.reduce((sum, i) => (i.is_included ? sum + (Number(i.estimated_value) || 0) : sum), 0);
}

/** Não dá para aprovar um orçamento sem nenhum item marcado. */
export function checkCanApprove(items: Pick<ApprovalItem, "estimated_value" | "is_included">[]): ApprovalCheck {
  if (!items.some((i) => i.is_included)) {
    return { ok: false, status: 422, error: "Selecione ao menos um item para aprovar" };
  }
  return { ok: true };
}

export type ScenarioAction = "toggle_item" | "approve";

export function isScenarioAction(a: unknown): a is ScenarioAction {
  return a === "toggle_item" || a === "approve";
}
