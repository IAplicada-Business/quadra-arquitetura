import { useMemo } from "react";
import { MultiSelectFilter } from "@/components/construction/MultiSelectFilter";
import { useDisciplineFilter } from "@/hooks/useDisciplineFilter";

/** Filtro multi-seleção de disciplinas (civil, revestimento, elétrica, hidráulica…). */
export function DisciplineFilter({ projectId, available }: { projectId: string; available: string[] }) {
  const { selected, setSelected } = useDisciplineFilter(projectId);
  const options = useMemo(() => [...new Set(available)].sort((a, b) => a.localeCompare(b, "pt-BR")), [available]);
  return <MultiSelectFilter label="Disciplina" options={options} selected={selected} onChange={setSelected} />;
}
