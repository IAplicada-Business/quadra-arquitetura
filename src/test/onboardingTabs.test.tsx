import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { emptySection, type OnboardingSection, type OnboardingTemplateRow } from "@/lib/onboarding";

/* ---------- mocks ---------- */
const tpl = (id: string, name: string, is_default = false): OnboardingTemplateRow => ({
  id, name, is_default, team_id: "team", user_id: "u1", description: null, created_at: "2026-09-29T00:00:00Z", updated_at: "2026-09-29T00:00:00Z",
});

const mocks = vi.hoisted(() => ({
  templates: [] as OnboardingTemplateRow[],
  sectionsByTemplate: {} as Record<string, OnboardingSection[]>,
  templateSave: vi.fn(),
  createTpl: vi.fn(),
  renameTpl: vi.fn(),
  setDefaultTpl: vi.fn(),
  removeTpl: vi.fn(),
  saveOverride: vi.fn(),
  setTemplate: vi.fn(),
  setEnabled: vi.fn(),
  resetToTemplate: vi.fn(),
  // Estado da obra no mock de useProjectOnboarding
  overrideSections: null as OnboardingSection[] | null,
  followedTemplateId: null as string | null,
}));

// Arrays estáveis entre renders, como o useMemo dos hooks reais.
const EMPTY: OnboardingSection[] = [];
const defaultTemplate = () => mocks.templates.find((t) => t.is_default) ?? mocks.templates[0] ?? null;
const resolveTemplate = (id?: string | null) => (id ? mocks.templates.find((t) => t.id === id) ?? null : defaultTemplate());
const sectionsOf = (t: OnboardingTemplateRow | null) => (t ? mocks.sectionsByTemplate[t.id] ?? EMPTY : EMPTY);

vi.mock("@/hooks/useOnboardingTemplate", () => ({
  uploadOnboardingMedia: vi.fn(),
  useOnboardingTemplates: () => ({
    templates: mocks.templates,
    defaultTemplate: defaultTemplate(),
    isLoading: false,
    isFetched: true,
    dataUpdatedAt: 1,
    create: { mutate: mocks.createTpl, isPending: false },
    rename: { mutate: mocks.renameTpl, isPending: false },
    setDefault: { mutate: mocks.setDefaultTpl, isPending: false },
    remove: { mutate: mocks.removeTpl, isPending: false },
  }),
  useOnboardingTemplate: (id?: string | null) => {
    const template = resolveTemplate(id);
    return {
      template,
      templates: mocks.templates,
      defaultTemplate: defaultTemplate(),
      sections: sectionsOf(template),
      isLoading: false,
      isFetched: true,
      dataUpdatedAt: 1,
      save: { mutate: mocks.templateSave, isPending: false },
    };
  },
}));

vi.mock("@/hooks/useProjectOnboarding", () => ({
  useProjectOnboarding: () => {
    const template = resolveTemplate(mocks.followedTemplateId);
    const templateSections = sectionsOf(template);
    return {
      override: mocks.overrideSections || mocks.followedTemplateId ? { id: "ov", is_enabled: true } : null,
      mode: mocks.overrideSections ? "custom" : "template",
      customSections: mocks.overrideSections,
      templateSections,
      template,
      templates: mocks.templates,
      defaultTemplate: defaultTemplate(),
      followedTemplateId: mocks.followedTemplateId,
      effectiveSections: mocks.overrideSections ?? templateSections,
      usesTemplate: mocks.overrideSections == null,
      isEnabled: true,
      isLoading: false,
      isFetched: true,
      dataUpdatedAt: 1,
      saveOverride: { mutate: mocks.saveOverride, isPending: false },
      setTemplate: { mutate: mocks.setTemplate, isPending: false },
      setEnabled: { mutate: mocks.setEnabled, isPending: false },
      resetToTemplate: { mutate: mocks.resetToTemplate, isPending: false },
    };
  },
}));

vi.mock("@/hooks/useClientPortalToken", () => ({
  useClientPortalToken: () => ({ activeToken: { token: "tok123" }, isLoading: false }),
}));

import OnboardingTemplateTab from "@/components/settings/OnboardingTemplateTab";
import { ProjectOnboardingTab } from "@/components/projects/ProjectOnboardingTab";

beforeEach(() => {
  for (const fn of [mocks.templateSave, mocks.createTpl, mocks.renameTpl, mocks.setDefaultTpl, mocks.removeTpl, mocks.saveOverride, mocks.setTemplate, mocks.setEnabled, mocks.resetToTemplate]) fn.mockReset();
  mocks.templates = [tpl("tpl", "Residencial", true), tpl("tpl2", "Comercial")];
  mocks.sectionsByTemplate = {
    tpl: [
      emptySection({ id: "t1", title: "Boas-vindas", body: "Olá" }),
      emptySection({ id: "t2", title: "Vídeo de apresentação", video_url: "https://youtu.be/tPLtPLtPLtP" }),
    ],
    tpl2: [emptySection({ id: "c1", title: "Bem-vindo à sua loja" })],
  };
  mocks.overrideSections = null;
  mocks.followedTemplateId = null;
});

describe("Configurações → Onboarding (modelos)", () => {
  it("lista os modelos existentes, marca o padrão e abre o padrão selecionado", () => {
    render(<OnboardingTemplateTab />);
    const tabs = within(screen.getByRole("tablist", { name: "Modelos de onboarding" })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Residencialpadrão", "Comercial"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText("Boas-vindas").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Salvar modelo/ })).toBeDisabled();
  });

  it("trocar de modelo mostra as seções dele", () => {
    render(<OnboardingTemplateTab />);
    fireEvent.click(screen.getByRole("tab", { name: "Comercial" }));
    expect(screen.getAllByText("Bem-vindo à sua loja").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Boas-vindas")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Definir como padrão/ })).toBeInTheDocument();
  });

  it("'Novo modelo' pede nome e cria", () => {
    render(<OnboardingTemplateTab />);
    fireEvent.click(screen.getByRole("button", { name: /Novo modelo/ }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Reforma" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar modelo" }));
    expect(mocks.createTpl).toHaveBeenCalledTimes(1);
    expect(mocks.createTpl.mock.calls[0][0]).toMatchObject({ name: "Reforma", copyFromId: null });
  });

  it("'Duplicar' cria copiando as seções do modelo aberto", () => {
    render(<OnboardingTemplateTab />);
    fireEvent.click(screen.getByRole("button", { name: /Duplicar/ }));
    expect(screen.getByLabelText("Nome")).toHaveValue("Residencial (cópia)");
    fireEvent.click(screen.getByRole("button", { name: "Criar modelo" }));
    expect(mocks.createTpl.mock.calls[0][0]).toMatchObject({ name: "Residencial (cópia)", copyFromId: "tpl" });
  });

  it("'Definir como padrão' e 'Excluir' agem no modelo aberto; o padrão não pode ser excluído enquanto houver outro", () => {
    render(<OnboardingTemplateTab />);
    expect(screen.getByRole("button", { name: /Excluir/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "Comercial" }));
    fireEvent.click(screen.getByRole("button", { name: /Definir como padrão/ }));
    expect(mocks.setDefaultTpl).toHaveBeenCalledWith("tpl2");
    fireEvent.click(screen.getByRole("button", { name: /Excluir/ }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir modelo" }));
    expect(mocks.removeTpl).toHaveBeenCalledWith("tpl2");
  });

  it("sem nenhum modelo, oferece a sugestão e salvar cria o primeiro", () => {
    mocks.templates = [];
    render(<OnboardingTemplateTab />);
    fireEvent.click(screen.getByRole("button", { name: /Começar com a sugestão/ }));
    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Salvar modelo/ }));
    expect(mocks.templateSave).toHaveBeenCalledTimes(1);
    expect(mocks.templateSave.mock.calls[0][0]).toHaveLength(4); // capa + 3 passos
  });

  it("adicionar seções e salvar manda a lista completa em ordem", () => {
    render(<OnboardingTemplateTab />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar seção" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar seção" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar seção" }));
    fireEvent.click(screen.getByRole("button", { name: /Salvar modelo/ }));
    const salvo = mocks.templateSave.mock.calls[0][0] as OnboardingSection[];
    expect(salvo).toHaveLength(5);
    expect(salvo.slice(0, 2).map((s) => s.id)).toEqual(["t1", "t2"]);
  });
});

describe("Projeto → Onboarding (modelo por obra)", () => {
  it("obra nova segue o modelo padrão, com as seções dele preenchidas", () => {
    render(<ProjectOnboardingTab projectId="p1" projectName="Apto 101" />);
    expect(screen.getByText("Modelo: Residencial")).toBeInTheDocument();
    const radios = within(screen.getByRole("radiogroup", { name: "Modelo de onboarding" })).getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["Residencialpadrão", "Comercial"]);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    // Aparece na lista do editor e no preview.
    expect(screen.getAllByText("Boas-vindas").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Vídeo de apresentação").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /Salvar para esta obra/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Abrir portal/ })).toHaveAttribute("href", expect.stringContaining("/client/tok123"));
  });

  it("escolher outro modelo associa a obra a ele", () => {
    render(<ProjectOnboardingTab projectId="p1" />);
    fireEvent.click(screen.getByRole("radio", { name: "Comercial" }));
    expect(mocks.setTemplate).toHaveBeenCalledWith("tpl2");
  });

  it("obra que segue o Comercial mostra as seções dele", () => {
    mocks.followedTemplateId = "tpl2";
    render(<ProjectOnboardingTab projectId="p1" />);
    expect(screen.getByText("Modelo: Comercial")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Comercial" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByText("Bem-vindo à sua loja").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Boas-vindas")).not.toBeInTheDocument();
  });

  it("trocar o vídeo de uma seção salva uma cópia só da obra, sem tocar no modelo", () => {
    render(<ProjectOnboardingTab projectId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Vídeo de apresentação" }));
    fireEvent.change(screen.getByLabelText("Vídeo (YouTube não listado ou Google Drive)"), { target: { value: "https://youtu.be/0bRa0bRa0bR" } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar para esta obra/ }));

    expect(mocks.saveOverride).toHaveBeenCalledTimes(1);
    const { sections } = mocks.saveOverride.mock.calls[0][0] as { sections: OnboardingSection[] };
    expect(sections).toHaveLength(2);
    // ids novos (cópia), com a origem registrada
    expect(sections.map((s) => s.id)).not.toContain("t1");
    expect(sections[1].source_section_id).toBe("t2");
    expect(sections[1].video_url).toBe("https://youtu.be/0bRa0bRa0bR");
    expect(sections[0].video_url).toBeNull();
    // modelo continua com o vídeo original
    expect(mocks.sectionsByTemplate.tpl[1].video_url).toBe("https://youtu.be/tPLtPLtPLtP");
    expect(mocks.templateSave).not.toHaveBeenCalled();
  });

  it("link de vídeo inválido bloqueia o salvar e diz onde corrigir", () => {
    render(<ProjectOnboardingTab projectId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Editar Vídeo de apresentação" }));
    fireEvent.change(screen.getByLabelText("Vídeo (YouTube não listado ou Google Drive)"), { target: { value: "https://example.com/video" } });
    expect(screen.getByTestId("invalid-videos")).toHaveTextContent("Vídeo de apresentação");
    expect(screen.getByRole("button", { name: /Salvar para esta obra/ })).toBeDisabled();
  });

  it("obra personalizada mostra o badge e permite voltar ao modelo com confirmação", () => {
    mocks.overrideSections = [emptySection({ id: "o1", title: "Só desta obra" })];
    render(<ProjectOnboardingTab projectId="p1" />);
    expect(screen.getByText("Personalizado para esta obra")).toBeInTheDocument();
    expect(screen.getAllByText("Só desta obra").length).toBeGreaterThanOrEqual(1);
    // nenhum modelo aparece marcado enquanto a cópia vale
    expect(screen.getByRole("radio", { name: /Residencial/ })).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("button", { name: /Voltar a seguir o modelo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao modelo" }));
    expect(mocks.resetToTemplate).toHaveBeenCalledTimes(1);
  });

  it("obra personalizada só troca de modelo depois de confirmar (descarta a cópia)", () => {
    mocks.overrideSections = [emptySection({ id: "o1", title: "Só desta obra" })];
    render(<ProjectOnboardingTab projectId="p1" />);
    fireEvent.click(screen.getByRole("radio", { name: "Comercial" }));
    expect(mocks.setTemplate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Trocar modelo" }));
    expect(mocks.setTemplate).toHaveBeenCalledWith("tpl2");
  });

  it("'Copiar do modelo' puxa as seções do modelo para personalizar em cima", () => {
    mocks.overrideSections = [emptySection({ id: "o1", title: "Só desta obra" })];
    render(<ProjectOnboardingTab projectId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: /Copiar do modelo/ }));
    expect(screen.queryByText("Só desta obra")).not.toBeInTheDocument();
    expect(screen.getAllByText("Boas-vindas").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Salvar para esta obra/ }));
    const { sections } = mocks.saveOverride.mock.calls[0][0] as { sections: OnboardingSection[] };
    expect(sections.map((s) => s.source_section_id)).toEqual(["t1", "t2"]);
  });

  it("reordenar persiste a nova ordem", () => {
    render(<ProjectOnboardingTab projectId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: "Descer Boas-vindas" }));
    fireEvent.click(screen.getByRole("button", { name: /Salvar para esta obra/ }));
    const { sections } = mocks.saveOverride.mock.calls[0][0] as { sections: OnboardingSection[] };
    expect(sections.map((s) => s.title)).toEqual(["Vídeo de apresentação", "Boas-vindas"]);
  });

  it("interruptor de visibilidade chama setEnabled", () => {
    render(<ProjectOnboardingTab projectId="p1" />);
    fireEvent.click(screen.getByRole("switch", { name: "Mostrar onboarding no portal desta obra" }));
    expect(mocks.setEnabled).toHaveBeenCalledWith(false);
  });
});
