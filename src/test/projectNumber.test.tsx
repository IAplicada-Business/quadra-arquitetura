import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  duplicateCodeMessage,
  findProjectsWithCode,
  normalizeProjectNumber,
  suggestNextProjectNumber,
} from "@/lib/projectNumber";

const rows = [
  { id: "p1", name: "Casa Madalena", project_number: "Q201" },
  { id: "p2", name: "Apto João", project_number: "Q199" },
  { id: "p3", name: "Obra antiga", project_number: "2019-03" },
  { id: "p4", name: "Sem código", project_number: null },
];

describe("código do projeto (regras)", () => {
  it("sugere o próximo Q<n> ignorando códigos legados e nunca abaixo de Q145", () => {
    expect(suggestNextProjectNumber(rows.map((r) => r.project_number))).toBe("Q202");
    expect(suggestNextProjectNumber(["Q12", "Q40", "2019-03", null])).toBe("Q145");
    expect(suggestNextProjectNumber(["q 210", "Q12A"])).toBe("Q211");
    expect(suggestNextProjectNumber([])).toBe("Q145");
  });

  it("normaliza o que foi digitado", () => {
    expect(normalizeProjectNumber("  q201 ")).toBe("Q201");
    expect(normalizeProjectNumber("p  - 034")).toBe("P - 034");
    expect(normalizeProjectNumber(null)).toBe("");
  });

  it("encontra duplicado sem diferenciar maiúsculas e espaços, ignorando o próprio projeto", () => {
    expect(findProjectsWithCode(" q 201", rows).map((r) => r.id)).toEqual(["p1"]);
    expect(findProjectsWithCode("Q201", rows, "p1")).toEqual([]);
    expect(findProjectsWithCode("Q12", rows)).toEqual([]); // legado livre
    expect(findProjectsWithCode("", rows)).toEqual([]);
  });

  it("mensagem de duplicado cita os projetos", () => {
    expect(duplicateCodeMessage("q201", [rows[0]])).toBe("O código Q201 já é usado por Casa Madalena.");
  });
});

/* ---------- formulário ---------- */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

vi.mock("@/hooks/useProjectNumbers", () => ({
  useProjectNumbers: () => ({ rows, suggestion: "Q202", isLoading: false }),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectForm } from "@/components/projects/ProjectForm";

const onSubmit = vi.fn();

function renderForm(initialData: Record<string, unknown> | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ProjectForm open onOpenChange={() => {}} onSubmit={onSubmit} initialData={initialData} />
    </QueryClientProvider>,
  );
}

beforeEach(() => onSubmit.mockReset());

describe("ProjectForm → código do projeto", () => {
  it("projeto novo vem com a numeração automática e salva com ela", () => {
    renderForm();
    const code = screen.getByLabelText("Código do projeto") as HTMLInputElement;
    expect(code.value).toBe("Q202");
    fireEvent.change(screen.getByLabelText("Nome do Projeto *"), { target: { value: "Casa nova" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar Projeto" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ project_number: "Q202", allow_duplicate_code: false }));
  });

  it("aceita código legado digitado à mão", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Código do projeto"), { target: { value: " q 087 " } });
    fireEvent.change(screen.getByLabelText("Nome do Projeto *"), { target: { value: "Reforma" } });
    expect(screen.queryByTestId("project-number-duplicate")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar Projeto" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ project_number: "Q 087" }));
  });

  it("avisa duplicado antes de salvar e só libera com confirmação", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Código do projeto"), { target: { value: "q201" } });
    fireEvent.change(screen.getByLabelText("Nome do Projeto *"), { target: { value: "Casa Madalena II" } });
    expect(screen.getByTestId("project-number-duplicate")).toHaveTextContent("já é usado por Casa Madalena");
    const salvar = screen.getByRole("button", { name: "Criar Projeto" });
    expect(salvar).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Reutilizar este código" }));
    expect(salvar).not.toBeDisabled();
    fireEvent.click(salvar);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ project_number: "Q201", allow_duplicate_code: true }));
  });

  it("editar o próprio projeto não acusa duplicado; botão volta à sugestão", () => {
    renderForm({ id: "p1", name: "Casa Madalena", project_number: "Q201" });
    expect((screen.getByLabelText("Código do projeto") as HTMLInputElement).value).toBe("Q201");
    expect(screen.queryByTestId("project-number-duplicate")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Q202/ }));
    expect((screen.getByLabelText("Código do projeto") as HTMLInputElement).value).toBe("Q202");
  });
});
