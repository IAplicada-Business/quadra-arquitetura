import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DuplicateProjectNumberError,
  duplicateCodeMessage,
  findProjectsWithCode,
  normalizeProjectNumber,
  suggestNextProjectNumber,
  type ProjectCodeRow,
} from "@/lib/projectNumber";

export const PROJECT_NUMBERS_QUERY_KEY = ["project_numbers"] as const;

export async function fetchProjectCodes(): Promise<ProjectCodeRow[]> {
  const { data, error } = await supabase.from("projects").select("id, name, project_number");
  if (error) throw error;
  return (data ?? []) as ProjectCodeRow[];
}

/** Próximo código automático, lido do banco na hora (evita sugestão velha). */
export async function nextProjectNumber(): Promise<string> {
  return suggestNextProjectNumber((await fetchProjectCodes()).map((r) => r.project_number));
}

/** Códigos em uso + sugestão do próximo, para o formulário de projeto. */
export function useProjectNumbers(enabled = true) {
  const query = useQuery({
    queryKey: PROJECT_NUMBERS_QUERY_KEY,
    queryFn: fetchProjectCodes,
    enabled,
    staleTime: 0,
  });
  const rows = query.data ?? [];
  return {
    rows,
    suggestion: suggestNextProjectNumber(rows.map((r) => r.project_number)),
    isLoading: query.isLoading,
  };
}

/**
 * Prepara o payload de criação/edição de projeto vindo do ProjectForm:
 * normaliza o código, revalida duplicado direto no banco (outra pessoa
 * pode ter usado o código depois que o formulário abriu) e remove o campo
 * de controle `allow_duplicate_code`. Sem código informado, cai na
 * numeração automática.
 */
export async function prepareProjectNumber(
  data: Record<string, unknown>,
  excludeId?: string | null,
): Promise<Record<string, unknown>> {
  const { allow_duplicate_code, ...rest } = data;
  if (!("project_number" in rest)) return rest;

  const code = normalizeProjectNumber(rest.project_number as string | null | undefined);
  const rows = await fetchProjectCodes();
  if (!code) {
    // Edição que apagou o código: mantém vazio. Criação: numeração automática.
    return { ...rest, project_number: excludeId ? null : suggestNextProjectNumber(rows.map((r) => r.project_number)) };
  }
  const owners = findProjectsWithCode(code, rows, excludeId);
  // Edição que manteve o código atual: não cobra de novo um duplicado que já existia.
  const current = excludeId ? rows.find((r) => r.id === excludeId) : undefined;
  const unchanged = !!current && normalizeProjectNumber(current.project_number) === code;
  if (owners.length > 0 && !unchanged && allow_duplicate_code !== true) {
    throw new DuplicateProjectNumberError(
      `${duplicateCodeMessage(code, owners)} Marque "Reutilizar este código" no formulário para salvar mesmo assim.`,
    );
  }
  return { ...rest, project_number: code };
}
