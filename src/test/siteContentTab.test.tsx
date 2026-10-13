import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SITE_DEFAULTS, resolveSiteContent, type SiteContent, type SiteContentChanges, type SiteContentRow } from "@/lib/siteContent";

const mocks = vi.hoisted(() => ({
  rows: [] as SiteContentRow[],
  // Estável entre renders, como o useMemo do hook real.
  content: null as unknown as SiteContent,
  publishMutate: vi.fn<(changes: SiteContentChanges) => void>(),
  uploadSiteImage: vi.fn<(file: File, folder: string, maxWidth?: number) => Promise<string>>(),
}));

vi.mock("@/hooks/useSiteContent", () => ({
  useSiteContentAdmin: () => ({
    rows: mocks.rows,
    content: mocks.content,
    lastUpdatedAt: null,
    isLoading: false,
    isFetched: true,
    dataUpdatedAt: 1,
    publish: { mutate: mocks.publishMutate, isPending: false },
  }),
  uploadSiteImage: mocks.uploadSiteImage,
}));

// O formulário de contato do site usa react-query; no preview ele não envia.
vi.mock("@/hooks/useSiteLead", () => ({
  useSiteLead: () => ({ mutate: vi.fn(), isPending: false }),
}));

import SiteContentTab from "@/components/settings/site/SiteContentTab";

beforeAll(() => {
  // framer-motion (whileInView) e o preview usam APIs que o jsdom não tem.
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", IO);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

const setServidor = (rows: SiteContentRow[]) => {
  mocks.rows = rows;
  mocks.content = resolveSiteContent(rows);
};
const { publishMutate, uploadSiteImage } = mocks;

beforeEach(() => {
  setServidor([]);
  publishMutate.mockReset();
  uploadSiteImage.mockReset();
});

const publicar = () => screen.getByRole("button", { name: /Publicar/ });
const preview = () => screen.getByTestId("site-preview");

describe("aba Site", () => {
  it("abre no Hero, com as catorze dobras e sem alterações pendentes", () => {
    render(<SiteContentTab />);
    const tabs = within(screen.getByRole("tablist", { name: "Seções do site" })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Hero",
      "Por que a Quadra",
      "Serviços",
      "Jornada",
      "Trilha do Cliente",
      "Cases",
      "Para arquitetos",
      "Sobre",
      "Prova social",
      "Material gratuito",
      "Perguntas frequentes",
      "Blog",
      "Contato",
      "Rodapé",
    ]);
    expect(publicar()).toBeDisabled();
    expect(within(preview()).getByText(/do número ao tijolo/)).toBeInTheDocument();
  });

  it("Camilla edita o texto do Sobre: preview atualiza e Publicar grava about.body", () => {
    render(<SiteContentTab />);
    fireEvent.click(screen.getByRole("tab", { name: "Sobre" }));
    expect(within(preview()).getByText(/A Quadra nasceu de uma dúvida/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Texto"), {
      target: { value: "Somos a Quadra.\n\nFazemos obra **sem surpresa**." },
    });

    expect(screen.getByText("Alterações não publicadas")).toBeInTheDocument();
    expect(within(preview()).getByText("Somos a Quadra.")).toBeInTheDocument();
    expect(within(preview()).getByText("sem surpresa").tagName).toBe("STRONG");
    expect(within(preview()).queryByText(/A Quadra nasceu de uma dúvida/)).not.toBeInTheDocument();

    fireEvent.click(publicar());
    expect(publishMutate).toHaveBeenCalledWith({
      upserts: [{ key: "about.body", type: "richtext", value_json: "Somos a Quadra.\n\nFazemos obra **sem surpresa**." }],
      deletes: [],
    });
  });

  it("troca da foto do hero: mostra no preview antes de publicar e publica a URL enviada", async () => {
    uploadSiteImage.mockResolvedValue("https://cdn.test/site-media/hero/nova.jpg");
    render(<SiteContentTab />);

    const file = new File(["x"], "obra.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Enviar Foto"), { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByTestId("site-hero-image-thumb")).toHaveAttribute("src", "https://cdn.test/site-media/hero/nova.jpg"),
    );
    expect(uploadSiteImage).toHaveBeenCalledWith(file, "hero", 2400);
    expect(within(preview()).getByAltText("Quadra Arquitetura")).toHaveAttribute("src", "https://cdn.test/site-media/hero/nova.jpg");
    expect(publishMutate).not.toHaveBeenCalled();

    fireEvent.click(publicar());
    expect(publishMutate).toHaveBeenCalledWith({
      upserts: [{ key: "hero.image", type: "image", value_json: "https://cdn.test/site-media/hero/nova.jpg" }],
      deletes: [],
    });
  });

  it("Descartar volta ao publicado", () => {
    render(<SiteContentTab />);
    fireEvent.change(screen.getByLabelText("Botão principal"), { target: { value: "Orçamento" } });
    expect(publicar()).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Descartar/ }));
    expect(screen.getByLabelText("Botão principal")).toHaveValue(SITE_DEFAULTS.hero.ctaPrimary);
    expect(publicar()).toBeDisabled();
  });

  it("Restaurar padrão numa seção salva apaga as linhas dela", () => {
    setServidor([{ key: "footer.email", type: "text", value_json: "oi@quadra.com" }]);
    render(<SiteContentTab />);
    fireEvent.click(screen.getByRole("tab", { name: /Rodapé/ }));
    expect(screen.getByLabelText("E-mail")).toHaveValue("oi@quadra.com");

    fireEvent.click(screen.getByRole("button", { name: /Restaurar padrão/ }));
    fireEvent.click(publicar());
    expect(publishMutate).toHaveBeenCalledWith({ upserts: [], deletes: ["footer.email"] });
  });
});
