/** Intervalo [from, to) do filtro de ano/mês, ou null para "todos". */
export function monthRange(year: string, month: string): { from: string; to: string } | null {
  if (year === "all") return null;
  const y = Number(year);
  if (month === "all") return { from: `${y}-01-01`, to: `${y + 1}-01-01` };
  const m = Number(month);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { from: `${y}-${String(m).padStart(2, "0")}-01`, to: next };
}
