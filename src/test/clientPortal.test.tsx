import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ClientPortal from "@/pages/ClientPortal";

/** Canal Realtime simulado: guarda os avisos que o portal escuta. */
const live = vi.hoisted(() => ({ handlers: [] as (() => void)[], topics: [] as string[], removed: 0 }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: (topic: string) => {
      live.topics.push(topic);
      const ch = {
        on: (_type: string, _filter: unknown, cb: () => void) => {
          live.handlers.push(cb);
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: async () => {
      live.removed++;
    },
  },
}));

const fixture = {
  project: { name: "Apartamento Sion", address: "Rua X", city: "BH", estimated_budget: 100000, ideal_budget: null, client_move_in_date: "2026-12-15", client_name: "Madalena & João" },
  tasks: [
    { id: "t1", task_name: "Fundação", start_date: "2026-08-01", end_date: "2026-08-20", status: "executado", discipline: "Fundação", color: null, progress_percentage: 100 },
    { id: "t2", task_name: "Estrutura", start_date: "2026-09-01", end_date: "2026-10-15", status: "em_execucao", discipline: "Estrutura", color: null, progress_percentage: 40 },
  ],
  payments: [{ id: "p1", value: 60000, due_date: "2026-07-15", paid_date: "2026-07-15", status: "pago", description: "Parcela 1", payment_method: null }],
  invoices: [],
  photos: [{ url: "https://cdn/foto1.jpg", date: "2026-06-28" }],
  weekly_reports: [
    { id: "r1", week_start: "2026-08-10", summary: "Forro de gesso concluído", next_steps: "Pintura", completion_percent: 64, photo_urls: [], client_pending: "Liberar o desenho da marmoraria", created_at: "2026-08-14" },
  ],
  pending_responses: [],
  onboarding: {
    sections: [
      { id: "s1", title: "{cliente} — esse é o acompanhamento do projeto de vocês", body: "Um vídeo rápido da Mariana.", video_url: "https://youtu.be/abc", image_urls: [], cta_label: null, cta_url: null, is_active: true },
      { id: "s2", title: "Veja em que etapa está", body: "Linha do tempo.", video_url: null, image_urls: [], cta_label: null, cta_url: null, is_active: true },
    ],
  },
};

function mockFetch(payload: unknown = fixture) {
  const f = vi.fn(async () => ({ ok: true, json: async () => payload }));
  vi.stubGlobal("fetch", f);
  return f;
}

function renderPortal(hash = "") {
  return render(
    <MemoryRouter initialEntries={[`/client/tok123${hash}`]}>
      <Routes>
        <Route path="/client/:token" element={<ClientPortal />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  live.handlers = [];
  live.topics = [];
  live.removed = 0;
  localStorage.clear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://x.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "key");
  window.scrollTo = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

describe("Trilha do Cliente (/client/:token)", () => {
  it("primeira visita mostra a Tela 0 de boas-vindas com o nome do cliente; 'Entrar' leva ao painel e persiste", async () => {
    mockFetch();
    renderPortal();
    const gate = await screen.findByTestId("welcome-gate");
    expect(within(gate).getByText("Madalena & João")).toBeInTheDocument();
    expect(within(gate).getByText(/esse é o acompanhamento do projeto de vocês/)).toBeInTheDocument();
    expect(within(gate).getByText("Veja em que etapa está")).toBeInTheDocument();
    expect(within(gate).getByText("01")).toBeInTheDocument();
    // vídeo do YouTube vira embed
    expect((within(gate).getByTitle(/Madalena & João/) as HTMLIFrameElement).src).toContain("youtube.com/embed/abc");
    // painel ainda não apareceu
    expect(screen.queryByTestId("screen-inicio")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Entrar no meu projeto/ }));
    expect(await screen.findByTestId("screen-inicio")).toBeInTheDocument();
    expect(localStorage.getItem("trilha:onboarding-seen:tok123")).toBe("1");
  });

  it("visita seguinte vai direto ao painel, com boas-vindas acessíveis pelo menu", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    mockFetch();
    renderPortal();
    expect(await screen.findByTestId("screen-inicio")).toBeInTheDocument();
    expect(screen.queryByTestId("welcome-gate")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Boas-vindas/ })[0]);
    expect(await screen.findByTestId("welcome-gate")).toBeInTheDocument();
  });

  it("início mostra fase atual, mudança, progresso do último relatório e a pendência em destaque", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    mockFetch();
    renderPortal();
    const inicio = await screen.findByTestId("screen-inicio");
    expect(within(inicio).getByRole("heading", { level: 1 })).toHaveTextContent(/Estrutura/);
    expect(within(inicio).getByText("15 de dezembro")).toBeInTheDocument();
    expect(within(inicio).getByTestId("progress-value")).toHaveTextContent("64%");
    expect(within(inicio).getByTestId("open-pendings")).toHaveTextContent("1 decisão");
    expect(within(inicio).getByText("Liberar o desenho da marmoraria")).toBeInTheDocument();
    expect(within(inicio).getByRole("button", { name: /Aprovar/ })).toBeInTheDocument();
  });

  it("trilha simplificada mostra os cinco blocos com os dados da obra", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    mockFetch({
      ...fixture,
      project: { ...fixture.project, client_move_in_date: "2100-01-15" },
      activities: [
        { id: "a1", name: "Fundação", discipline: "Fundação", status: "concluida", progress_percent: 100, start_date: "2026-08-01", end_date: "2026-08-20" },
        { id: "a2", name: "Pilares", discipline: "Estrutura", status: "em_andamento", progress_percent: 50, start_date: "2026-09-01", end_date: "2099-10-15" },
        { id: "a3", name: "Tomadas", discipline: "Elétrica", status: "pendente", progress_percent: 0, start_date: "2099-11-01", end_date: "2099-11-20" },
      ],
      closing_items: [{ id: "c1", description: "Marcenaria da cozinha", closing_date: "2026-01-10", delivery_date: null, status: "comprado" }],
      visits: [],
    });
    renderPortal();
    const inicio = await screen.findByTestId("screen-inicio");
    expect(within(inicio).getByTestId("trail-delivered")).toHaveTextContent("1 de 3 entregues");
    expect(within(inicio).getByTestId("trail-delivered")).toHaveTextContent("Fundação");
    expect(within(inicio).getByTestId("trail-blocks")).toHaveTextContent("Estrutura");
    expect(within(inicio).getByTestId("trail-block-Elétrica")).toHaveTextContent("A iniciar");
    // 1 decisão aberta => atenção
    expect(within(inicio).getByTestId("trail-health-level")).toHaveTextContent("Atenção");
    // decisões 0/1 e fechamento 1/1 => 50%
    expect(within(inicio).getByTestId("trail-adoption")).toHaveTextContent("50% em dia");
    expect(within(inicio).getByTestId("trail-upcoming")).toBeInTheDocument();
  });

  it("link antigo #cronograma cai na trilha", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    mockFetch();
    window.history.replaceState(null, "", "/client/tok123#cronograma");
    renderPortal("#cronograma");
    expect(await screen.findByTestId("screen-inicio")).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });

  it("navega pelas telas e guarda a tela na URL", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    mockFetch();
    renderPortal();
    await screen.findByTestId("screen-inicio");

    const nav = screen.getByRole("navigation", { name: "Telas da trilha" });
    fireEvent.click(within(nav).getByRole("button", { name: /Minhas pendências/ }));
    expect(screen.getByTestId("screen-pendencias")).toBeInTheDocument();
    expect(screen.getByText("Trilha do projeto")).toBeInTheDocument(); // breadcrumb
    expect(window.location.hash).toBe("#pendencias");

    fireEvent.click(within(nav).getByRole("button", { name: /Galeria/ }));
    expect(screen.getByTestId("screen-galeria")).toBeInTheDocument();
    expect(screen.getByAltText("Foto da obra 1")).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: /Orçamento/ }));
    expect(screen.getByTestId("screen-orcamento")).toHaveTextContent("R$ 60.000,00");

    fireEvent.click(within(nav).getByRole("button", { name: /Resumo semanal/ }));
    expect(screen.getByTestId("screen-resumos")).toHaveTextContent("Forro de gesso concluído");

    // A antiga tela Cronograma foi substituída pela Trilha.
    expect(within(nav).queryByRole("button", { name: /Cronograma/ })).not.toBeInTheDocument();
    fireEvent.click(within(nav).getByRole("button", { name: /Trilha/ }));
    expect(screen.getByTestId("screen-inicio")).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });

  it("abre direto numa tela pelo hash e a barra inferior do celular existe", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    mockFetch();
    window.history.replaceState(null, "", "/client/tok123#galeria");
    renderPortal("#galeria");
    expect(await screen.findByTestId("screen-galeria")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /celular/ })).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });

  it("sem onboarding configurado vai direto ao painel e não oferece boas-vindas", async () => {
    mockFetch({ ...fixture, onboarding: { sections: [] } });
    renderPortal();
    expect(await screen.findByTestId("screen-inicio")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Boas-vindas/ })).not.toBeInTheDocument();
  });

  it("link inválido mostra a mensagem de erro", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ error: "Link inválido ou expirado" }) })));
    renderPortal();
    await waitFor(() => expect(screen.getByText("Link inválido ou expirado")).toBeInTheDocument());
  });

  it("linha do tempo da jornada mostra as etapas, a atual e a mudança", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    mockFetch();
    renderPortal();
    const inicio = await screen.findByTestId("screen-inicio");
    const journey = within(inicio).getByTestId("trail-journey");
    expect(within(journey).getByText("Fundação")).toBeInTheDocument();
    expect(within(journey).getByText("Mudança")).toBeInTheDocument();
    expect(journey.querySelector('[aria-current="step"]')).toHaveTextContent("Estrutura");
    expect(within(inicio).getByRole("heading", { level: 1 })).toHaveTextContent("Estrutura — etapa 2 de 2");
    expect(within(inicio).getByTestId("trail-block-Estrutura")).toHaveTextContent("Em execução agora");
    expect(within(inicio).getByTestId("trail-updates")).toHaveTextContent("Forro de gesso concluído");
    expect(screen.getAllByTestId("quadra-watermark").length).toBeGreaterThan(0);
  });
});

describe("Portal ao vivo", () => {
  const withReport = (pct: number, summary: string) => ({
    ...fixture,
    weekly_reports: [{ ...fixture.weekly_reports[0], id: `r-${pct}`, week_start: "2026-10-12", completion_percent: pct, summary, client_pending: null }, ...fixture.weekly_reports],
  });

  it("um aviso da equipe recarrega os dados na hora, sem esqueleto", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    let payload: unknown = fixture;
    const f = vi.fn(async () => ({ ok: true, json: async () => payload }));
    vi.stubGlobal("fetch", f);
    renderPortal();
    expect(await screen.findByTestId("progress-value")).toHaveTextContent("64%");
    await waitFor(() => expect(live.topics).toContain("portal:tok123"));
    expect(screen.getAllByTestId("live-status")[0]).toHaveTextContent(/Ao vivo · atualizado às/);

    payload = withReport(72, "Pintura da sala iniciada");
    live.handlers.forEach((h) => h());
    live.handlers.forEach((h) => h()); // rajada vira uma recarga só
    await waitFor(() => expect(screen.getByTestId("progress-value")).toHaveTextContent("72%"));
    expect(screen.getByTestId("trail-updates")).toHaveTextContent("Pintura da sala iniciada");
    expect(screen.getByTestId("screen-inicio")).toBeInTheDocument();
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[0]).toEqual([expect.any(String), expect.objectContaining({ cache: "no-store" })]);
  });

  it("voltar para a aba confere de novo; recarga com erro mantém a tela", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    let mode: "ok" | "fail" | "new" = "ok";
    const f = vi.fn(async () =>
      mode === "fail"
        ? { ok: false, json: async () => ({ error: "fora do ar" }) }
        : { ok: true, json: async () => (mode === "new" ? withReport(80, "Bancadas instaladas") : fixture) },
    );
    vi.stubGlobal("fetch", f);
    renderPortal();
    expect(await screen.findByTestId("progress-value")).toHaveTextContent("64%");

    mode = "fail";
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("progress-value")).toHaveTextContent("64%");
    expect(screen.queryByText("Link inválido ou expirado")).not.toBeInTheDocument();

    mode = "new";
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(() => expect(screen.getByTestId("progress-value")).toHaveTextContent("80%"));
  });

  it("sai do canal ao fechar o portal", async () => {
    localStorage.setItem("trilha:onboarding-seen:tok123", "1");
    mockFetch();
    const { unmount } = renderPortal();
    await screen.findByTestId("screen-inicio");
    await waitFor(() => expect(live.topics).toContain("portal:tok123"));
    unmount();
    expect(live.removed).toBe(1);
  });
});
