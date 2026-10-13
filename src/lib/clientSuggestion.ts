/**
 * Sugestão de cliente para uma obra sem cliente vinculado.
 */
export interface ClientOption {
  id: string;
  name: string;
}

const norm = (s: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Cliente mais provável para a obra: aquele cujo nome aparece no nome da
 * obra ("Projeto Salão Cherie" -> "Salão Cherie"). Com mais de um, o de
 * nome mais longo (mais específico). Sem nenhum, null.
 */
export function suggestClient(projectName: string | undefined, clients: ClientOption[]): ClientOption | null {
  const p = norm(projectName ?? "");
  if (!p) return null;
  const matches = clients.filter((c) => {
    const n = norm(c.name);
    return n.length >= 3 && p.includes(n);
  });
  return matches.sort((a, b) => norm(b.name).length - norm(a.name).length)[0] ?? null;
}
