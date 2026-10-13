import { describe, it, expect } from "vitest";
import {
  parseVideoUrl,
  validateVideoUrl,
  invalidVideoSections,
  sanitizeSection,
  sectionsFromJson,
  sectionsFromRows,
  cloneSectionsForProject,
  moveSection,
  visibleSections,
  emptySection,
  starterSections,
  fillPlaceholders,
  applyOnboardingPlaceholders,
  splitHeroTitle,
  onboardingMode,
  buildOnboardingPlaceholders,
  type OnboardingSectionRow,
} from "@/lib/onboarding";

describe("vídeos do onboarding: YouTube não listado e Google Drive", () => {
  const DRIVE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

  it("YouTube não listado usa o mesmo link de vídeo e embute igual", () => {
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ?si=Xy12")).toEqual({ kind: "youtube", src: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
    expect(validateVideoUrl("https://youtu.be/dQw4w9WgXcQ?si=Xy12")).toBeNull();
    expect(validateVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be")).toBeNull();
  });

  it("reconhece os formatos de link do Google Drive e embute pelo /preview", () => {
    const esperado = { kind: "drive", src: `https://drive.google.com/file/d/${DRIVE_ID}/preview` };
    expect(parseVideoUrl(`https://drive.google.com/file/d/${DRIVE_ID}/view?usp=sharing`)).toEqual(esperado);
    expect(parseVideoUrl(`https://drive.google.com/open?id=${DRIVE_ID}`)).toEqual(esperado);
    expect(parseVideoUrl(`https://drive.google.com/uc?id=${DRIVE_ID}&export=download`)).toEqual(esperado);
    expect(parseVideoUrl(`https://docs.google.com/file/d/${DRIVE_ID}/edit`)).toEqual(esperado);
    expect(validateVideoUrl(`https://drive.google.com/file/d/${DRIVE_ID}/view?usp=drive_link`)).toBeNull();
  });

  it("valida antes de salvar com mensagem que diz o que fazer", () => {
    expect(validateVideoUrl("")).toBeNull();
    expect(validateVideoUrl(null)).toBeNull();
    expect(validateVideoUrl("youtu.be/dQw4w9WgXcQ")).toMatch(/começando com https/);
    expect(validateVideoUrl("https://youtu.be/abc")).toMatch(/YouTube incompleto/);
    expect(validateVideoUrl("https://www.youtube.com/playlist?list=PL123")).toMatch(/playlist/);
    expect(validateVideoUrl("https://studio.youtube.com/video/dQw4w9WgXcQ/edit")).toMatch(/YouTube Studio/);
    expect(validateVideoUrl("https://drive.google.com/drive/folders/1xyz")).toMatch(/pasta do Drive/);
    expect(validateVideoUrl("https://drive.google.com/file/d/curto/view")).toMatch(/Drive incompleto/);
    expect(validateVideoUrl("https://example.com/video")).toMatch(/não reconhecido/);
  });

  it("vídeos enviados pelo upload e Vimeo continuam aceitos", () => {
    expect(validateVideoUrl("https://x.supabase.co/storage/v1/object/public/onboarding-media/p1/videos/1.mp4")).toBeNull();
    expect(validateVideoUrl("https://vimeo.com/123456789")).toBeNull();
  });

  it("aponta as seções com link inválido", () => {
    const erros = invalidVideoSections([
      emptySection({ id: "a", title: "Boas-vindas", video_url: "https://youtu.be/dQw4w9WgXcQ" }),
      emptySection({ id: "b", title: "", video_url: "https://example.com/x" }),
    ]);
    expect(erros).toEqual([{ index: 1, id: "b", title: "Seção 2", message: expect.stringMatching(/não reconhecido/) }]);
  });
});

describe("parseVideoUrl", () => {
  it("reconhece as formas de link do YouTube", () => {
    const esperado = "https://www.youtube.com/embed/dQw4w9WgXcQ";
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s")).toEqual({ kind: "youtube", src: esperado });
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({ kind: "youtube", src: esperado });
    expect(parseVideoUrl("https://youtube.com/shorts/dQw4w9WgXcQ")).toEqual({ kind: "youtube", src: esperado });
    expect(parseVideoUrl("https://m.youtube.com/embed/dQw4w9WgXcQ")).toEqual({ kind: "youtube", src: esperado });
  });

  it("reconhece Vimeo", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")).toEqual({ kind: "vimeo", src: "https://player.vimeo.com/video/123456789" });
    expect(parseVideoUrl("https://player.vimeo.com/video/123456789?h=abc")).toEqual({ kind: "vimeo", src: "https://player.vimeo.com/video/123456789" });
  });

  it("reconhece arquivo de vídeo (upload do bucket)", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/onboarding-media/p1/videos/1.mp4";
    expect(parseVideoUrl(url)).toEqual({ kind: "file", src: url });
  });

  it("link desconhecido vira link externo; vazio ou inválido vira null", () => {
    expect(parseVideoUrl("https://example.com/meu-video")?.kind).toBe("unknown");
    expect(parseVideoUrl("")).toBeNull();
    expect(parseVideoUrl("nao é url")).toBeNull();
    expect(parseVideoUrl(null)).toBeNull();
  });
});

describe("sanitizeSection / sectionsFromJson", () => {
  it("preenche defaults e descarta lixo", () => {
    const s = sanitizeSection({ id: "s1", title: "Oi", image_urls: ["a.jpg", 3, ""], cta_label: "  " });
    expect(s).toEqual({
      id: "s1",
      title: "Oi",
      body: "",
      video_url: null,
      image_urls: ["a.jpg"],
      cta_label: null,
      cta_url: null,
      is_active: true,
      source_section_id: null,
    });
    expect(sanitizeSection({ title: "sem id" })).toBeNull();
    expect(sanitizeSection("x")).toBeNull();
  });

  it("sectionsFromJson ignora itens inválidos e não-arrays", () => {
    expect(sectionsFromJson([{ id: "a", title: "A" }, null, { title: "B" }])).toHaveLength(1);
    expect(sectionsFromJson({ id: "a" })).toEqual([]);
  });
});

describe("sectionsFromRows", () => {
  it("ordena por display_order e mapeia as colunas", () => {
    const row = (id: string, order: number): OnboardingSectionRow => ({
      id, team_id: "t", user_id: "u", template_id: "tpl", title: id, body: "b", video_url: null, image_urls: null,
      cta_label: null, cta_url: null, display_order: order, is_active: true, created_at: "2026-01-01", updated_at: "2026-01-01",
    });
    const list = sectionsFromRows([row("b", 1), row("a", 0)]);
    expect(list.map((s) => s.id)).toEqual(["a", "b"]);
    expect(list[0].image_urls).toEqual([]);
  });
});

describe("cloneSectionsForProject", () => {
  it("gera ids novos e guarda a origem, sem compartilhar arrays", () => {
    const tpl = [emptySection({ id: "t1", title: "A", image_urls: ["x.jpg"] }), emptySection({ id: "t2", title: "B" })];
    const clone = cloneSectionsForProject(tpl);
    expect(clone).toHaveLength(2);
    expect(clone[0].id).not.toBe("t1");
    expect(clone[0].source_section_id).toBe("t1");
    expect(clone[1].source_section_id).toBe("t2");
    clone[0].image_urls.push("y.jpg");
    expect(tpl[0].image_urls).toEqual(["x.jpg"]);
  });

  it("clonar uma cópia mantém a origem original", () => {
    const tpl = [emptySection({ id: "t1" })];
    const again = cloneSectionsForProject(cloneSectionsForProject(tpl));
    expect(again[0].source_section_id).toBe("t1");
  });
});

describe("moveSection / visibleSections / starterSections", () => {
  it("move e mantém o original", () => {
    const list = [emptySection({ id: "a" }), emptySection({ id: "b" }), emptySection({ id: "c" })];
    expect(moveSection(list, 2, 0).map((s) => s.id)).toEqual(["c", "a", "b"]);
    expect(list.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(moveSection(list, 0, 9)).toBe(list);
  });

  it("cliente só vê seções ativas com algum conteúdo", () => {
    const list = [
      emptySection({ id: "a", title: "Tem título" }),
      emptySection({ id: "b", title: "Desligada", is_active: false }),
      emptySection({ id: "c" }),
      emptySection({ id: "d", video_url: "https://youtu.be/x" }),
    ];
    expect(visibleSections(list).map((s) => s.id)).toEqual(["a", "d"]);
  });

  it("sugestão inicial segue o mockup: capa + 3 passos, ids únicos", () => {
    const s = starterSections();
    expect(s).toHaveLength(4);
    expect(s[0].title).toContain("{cliente}");
    expect(new Set(s.map((x) => x.id)).size).toBe(4);
    // Passos espelham a aba Cronograma: contagem regressiva e fechamento do cliente.
    expect(s[1].body).toMatch(/contagem regressiva/i);
    expect(s[2].body).toMatch(/data limite/i);
  });
});

describe("placeholders e título da capa", () => {
  it("troca {cliente} e {projeto} e cai no genérico sem nome", () => {
    expect(fillPlaceholders("{cliente} — obra {projeto}", { cliente: "Madalena & João", projeto: "Apto 101" })).toBe("Madalena & João — obra Apto 101");
    expect(fillPlaceholders("{ Cliente } e {PROJETO}", {})).toBe("Bem-vindos e seu projeto");
  });

  it("applyOnboardingPlaceholders aplica em título, texto e botão", () => {
    const [s] = applyOnboardingPlaceholders([emptySection({ title: "Oi {cliente}", body: "Sobre {projeto}", cta_label: "Falar sobre {projeto}" })], { cliente: "Ana", projeto: "Casa" });
    expect(s.title).toBe("Oi Ana");
    expect(s.body).toBe("Sobre Casa");
    expect(s.cta_label).toBe("Falar sobre Casa");
  });

  it("splitHeroTitle separa nome e complemento no travessão", () => {
    expect(splitHeroTitle("Madalena & João — esse é o acompanhamento")).toEqual({ lead: "Madalena & João", rest: "esse é o acompanhamento" });
    expect(splitHeroTitle("Bem-vindos")).toEqual({ lead: "Bem-vindos", rest: null });
  });
});

describe("onboardingMode (regra da obra, igual à edge function)", () => {
  it("sem override segue o modelo; cópia = custom; desligado = hidden", () => {
    expect(onboardingMode(null)).toBe("template");
    expect(onboardingMode({ is_enabled: true, sections_json: null })).toBe("template");
    expect(onboardingMode({ is_enabled: true, sections_json: [] })).toBe("custom");
    expect(onboardingMode({ is_enabled: true, sections_json: [{ id: "a" }] })).toBe("custom");
    expect(onboardingMode({ is_enabled: false, sections_json: [{ id: "a" }] })).toBe("hidden");
  });
});

describe("variáveis do onboarding com dados da obra", () => {
  it("troca todas as variáveis e cai no genérico sem dado", () => {
    const txt = "{cliente}: obra {projeto} em {fase}, {progresso}. Início {inicio}, entrega {entrega}, mudança {mudanca}, em {endereco}.";
    expect(fillPlaceholders(txt, { cliente: "Ana", projeto: "Apto 101", fase: "Marcenaria", progresso: "45%", inicio: "01 de outubro", entrega: "20 de dezembro", mudanca: "10 de janeiro", endereco: "Rua A, 1 · BH" })).toBe(
      "Ana: obra Apto 101 em Marcenaria, 45%. Início 01 de outubro, entrega 20 de dezembro, mudança 10 de janeiro, em Rua A, 1 · BH.",
    );
    expect(fillPlaceholders("{ Entrega } / {fase}", {})).toBe("data a definir / a etapa atual");
  });

  it("monta as variáveis a partir do projeto, do cronograma e do relatório", () => {
    const p = buildOnboardingPlaceholders(
      {
        clientName: "Madalena",
        projectName: "Casa Pampulha",
        address: "Rua das Acácias, 120",
        city: "Belo Horizonte",
        startDate: "2026-09-09",
        expectedEndDate: "2026-12-20",
        moveInDate: null,
        tasks: [
          { id: "1", task_name: "Marcenaria", discipline: "Marcenaria", status: "em_execucao", start_date: "2026-10-01", end_date: "2026-10-30", color: null, progress_percentage: 40 },
        ],
        reports: [{ id: "r", week_start: "2026-10-05", summary: "", next_steps: "", completion_percent: 45, photo_urls: [], client_pending: null, created_at: "" }],
      },
      new Date(2026, 9, 14),
    );
    expect(p).toEqual({
      cliente: "Madalena",
      projeto: "Casa Pampulha",
      fase: "Marcenaria",
      progresso: "45%",
      inicio: "09 de setembro",
      entrega: "20 de dezembro",
      mudanca: null,
      endereco: "Rua das Acácias, 120 · Belo Horizonte",
    });
  });
});
