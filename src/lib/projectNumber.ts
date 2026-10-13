// Código do projeto (projects.project_number), ex.: "Q201".
//
// A numeração automática continua sendo o padrão sugerido (maior "Q<n>"
// + 1, nunca abaixo de Q145, como antes), mas o código pode ser editado
// à mão: aceita códigos legados de projetos antigos em qualquer formato
// ("Q12", "2019-03", "P-034"). Duplicado não é bloqueado no banco; o
// formulário avisa e pede confirmação explícita para reutilizar.

/** Primeiro número da série atual: códigos automáticos começam em Q145. */
export const PROJECT_NUMBER_FLOOR = 144;

export interface ProjectCodeRow {
  id: string;
  name?: string | null;
  project_number: string | null;
}

/** Limpa o que foi digitado: sem espaços nas pontas, espaços internos únicos, maiúsculas. */
export function normalizeProjectNumber(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** Chave de comparação: "q 201", "Q201" e " q201 " são o mesmo código. */
function codeKey(raw: string | null | undefined): string {
  return normalizeProjectNumber(raw).replace(/\s+/g, "");
}

/** Próximo código automático a partir dos códigos existentes. */
export function suggestNextProjectNumber(codes: (string | null | undefined)[], floor = PROJECT_NUMBER_FLOOR): string {
  const max = codes.reduce((acc, code) => {
    const m = codeKey(code).match(/^Q(\d+)$/);
    if (!m) return acc;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `Q${Math.max(max, floor) + 1}`;
}

/** Projetos (exceto `excludeId`) que já usam o código. */
export function findProjectsWithCode(code: string | null | undefined, rows: ProjectCodeRow[], excludeId?: string | null): ProjectCodeRow[] {
  const key = codeKey(code);
  if (!key) return [];
  return rows.filter((r) => r.id !== excludeId && codeKey(r.project_number) === key);
}

/** Texto do aviso de duplicado. */
export function duplicateCodeMessage(code: string, owners: ProjectCodeRow[]): string {
  const names = owners.map((o) => o.name?.trim() || "projeto sem nome");
  const list = names.length <= 2 ? names.join(" e ") : `${names.slice(0, 2).join(", ")} e mais ${names.length - 2}`;
  return `O código ${normalizeProjectNumber(code)} já é usado por ${list}.`;
}

export class DuplicateProjectNumberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateProjectNumberError";
  }
}
