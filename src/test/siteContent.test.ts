import { describe, it, expect } from "vitest";
import {
  SITE_DEFAULTS,
  SITE_SECTION_DEFINITIONS,
  SITE_SECTION_KEYS,
  contactIconKind,
  diffSiteContent,
  resolveSiteContent,
  siteContentEqual,
  splitParagraphs,
  type SiteContent,
  type SiteContentRow,
} from "@/lib/siteContent";
import { targetSize } from "@/lib/imageResize";

const row = (key: string, value_json: unknown, type = "text"): SiteContentRow => ({ key, type, value_json });

describe("definição das seções", () => {
  it("cobre as catorze dobras, na ordem em que aparecem na página", () => {
    expect(SITE_SECTION_KEYS).toEqual([
      "hero",
      "why",
      "services",
      "journey",
      "trail",
      "portfolio",
      "architects",
      "about",
      "testimonials",
      "leadMagnet",
      "faq",
      "blog",
      "contact",
      "footer",
    ]);
    expect(SITE_SECTION_DEFINITIONS.map((d) => d.key)).toEqual(SITE_SECTION_KEYS);
  });

  it("todo campo editável existe no padrão com o tipo certo", () => {
    for (const section of SITE_SECTION_DEFINITIONS) {
      const defaults = SITE_DEFAULTS[section.key] as unknown as Record<string, unknown>;
      for (const f of section.fields) {
        expect(defaults, `${section.key}.${f.name}`).toHaveProperty(f.name);
        if (f.type === "list") expect(Array.isArray(defaults[f.name])).toBe(true);
        else expect(typeof defaults[f.name]).toBe("string");
      }
    }
  });

  it("imagens padrão ficam vazias (o site usa o asset do build, que muda a cada deploy)", () => {
    expect(SITE_DEFAULTS.hero.image).toBe("");
    expect(SITE_DEFAULTS.about.photo).toBe("");
    expect(SITE_DEFAULTS.footer.logo).toBe("");
    expect(SITE_DEFAULTS.portfolio.items.every((i) => i.image === "")).toBe(true);
  });
});

describe("resolveSiteContent", () => {
  it("tabela vazia = site de sempre", () => {
    expect(resolveSiteContent([])).toEqual(SITE_DEFAULTS);
    expect(resolveSiteContent(null)).toEqual(SITE_DEFAULTS);
  });

  it("aplica os campos salvos e mantém o resto no padrão", () => {
    const c = resolveSiteContent([
      row("about.body", "Texto novo da Camilla", "richtext"),
      row("hero.image", "https://cdn/site-media/hero/1.jpg", "image"),
    ]);
    expect(c.about.body).toBe("Texto novo da Camilla");
    expect(c.hero.image).toBe("https://cdn/site-media/hero/1.jpg");
    expect(c.about.title).toBe(SITE_DEFAULTS.about.title);
    expect(c.footer).toEqual(SITE_DEFAULTS.footer);
  });

  it("ignora chaves desconhecidas e valores com tipo errado", () => {
    const c = resolveSiteContent([
      row("hero.naoExiste", "x"),
      row("foo.bar", "x"),
      row("hero.title", 42),
      row("services.items", "não é lista", "list"),
    ]);
    expect(c).toEqual(SITE_DEFAULTS);
  });

  it("limpa itens de lista (só strings; imagem só onde o campo tem imagem)", () => {
    const c = resolveSiteContent([
      row("services.items", [{ title: "Consultoria", desc: 3, image: "x", extra: true }, null], "list"),
      row("portfolio.items", [{ title: "Casa", desc: "Residencial" }], "list"),
    ]);
    // services declara etiqueta e sub-itens; portfolio, etiqueta e imagem.
    // O que a definição não declara (o "extra") cai fora.
    expect(c.services.items).toEqual([{ title: "Consultoria", desc: "", tag: "", bullets: "" }]);
    expect(c.portfolio.items).toEqual([{ title: "Casa", desc: "Residencial", image: "", tag: "" }]);
  });

  it("não altera o objeto de padrão", () => {
    resolveSiteContent([row("hero.title", "Outro")]);
    expect(SITE_DEFAULTS.hero.title).toBe("Alguém que trabalha *só para você*, do número ao tijolo.");
  });
});

/* Regra da Quadra: travessão não entra no texto do site. É fácil voltar
   sem querer ao escrever conteúdo novo, então fica um teste segurando. */
describe("texto do site", () => {
  it("nenhuma dobra usa travessão", () => {
    const comTravessao: string[] = [];
    const varrer = (valor: unknown, caminho: string) => {
      if (typeof valor === "string") {
        if (valor.includes("\u2014")) comTravessao.push(caminho);
        return;
      }
      if (Array.isArray(valor)) return valor.forEach((v, i) => varrer(v, `${caminho}[${i}]`));
      if (valor && typeof valor === "object") {
        for (const [k, v] of Object.entries(valor)) varrer(v, caminho ? `${caminho}.${k}` : k);
      }
    };
    varrer(SITE_DEFAULTS, "");
    expect(comTravessao).toEqual([]);
  });
});

describe("diffSiteContent", () => {
  const clone = (c: SiteContent) => structuredClone(c);

  it("sem mudança = nada a gravar", () => {
    expect(diffSiteContent(clone(SITE_DEFAULTS), SITE_DEFAULTS, [])).toEqual({ upserts: [], deletes: [] });
  });

  it("editar o Sobre grava só about.body, com o tipo do campo", () => {
    const draft = clone(SITE_DEFAULTS);
    draft.about.body = "Novo texto";
    expect(diffSiteContent(draft, SITE_DEFAULTS, [])).toEqual({
      upserts: [{ key: "about.body", type: "richtext", value_json: "Novo texto" }],
      deletes: [],
    });
  });

  it("campo que volta ao padrão apaga a linha existente", () => {
    const published = resolveSiteContent([row("hero.title", "Outro título")]);
    const draft = clone(published);
    draft.hero.title = SITE_DEFAULTS.hero.title;
    expect(diffSiteContent(draft, published, ["hero.title"])).toEqual({ upserts: [], deletes: ["hero.title"] });
  });

  it("campo salvo e não mexido não é regravado", () => {
    const published = resolveSiteContent([row("hero.title", "Outro título")]);
    const draft = clone(published);
    draft.footer.email = "oi@quadra.com";
    expect(diffSiteContent(draft, published, ["hero.title"])).toEqual({
      upserts: [{ key: "footer.email", type: "text", value_json: "oi@quadra.com" }],
      deletes: [],
    });
  });

  it("listas gravam o array inteiro", () => {
    const draft = clone(SITE_DEFAULTS);
    draft.portfolio.items = [{ title: "Loja", desc: "Comercial", image: "https://cdn/loja.jpg", tag: "COMERCIAL" }];
    const { upserts } = diffSiteContent(draft, SITE_DEFAULTS, []);
    expect(upserts).toEqual([{ key: "portfolio.items", type: "list", value_json: draft.portfolio.items }]);
    expect(siteContentEqual(resolveSiteContent(upserts), draft)).toBe(true);
  });
});

describe("apoio à renderização", () => {
  it("linha em branco separa parágrafos", () => {
    expect(splitParagraphs("Um\nainda um\n\nDois\n \n\nTrês")).toEqual(["Um\nainda um", "Dois", "Três"]);
    expect(splitParagraphs(SITE_DEFAULTS.about.body)).toHaveLength(3);
  });

  it("ícone do contato sai do link", () => {
    expect(contactIconKind("https://instagram.com/quadraarq")).toBe("instagram");
    expect(contactIconKind("https://wa.me/5531972641970")).toBe("phone");
    expect(contactIconKind("tel:+5531999999999")).toBe("phone");
    expect(contactIconKind("mailto:contato@quadraarquitetura.com")).toBe("mail");
    expect(contactIconKind("https://maps.google.com/?q=Rua")).toBe("map");
    expect(contactIconKind("https://quadra.com.br")).toBe("link");
  });

  it("redimensiona só quando passa da largura máxima, mantendo a proporção", () => {
    expect(targetSize(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(targetSize(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });
});

describe("modelo da dobra", () => {
  it("toda dobra com modelo tem o campo no admin e um padrão válido", () => {
    for (const def of SITE_SECTION_DEFINITIONS) {
      const campo = def.fields.find((f) => f.name === "layout");
      if (!campo) continue;
      expect(campo.type).toBe("select");
      expect(campo.options?.length).toBeGreaterThan(1);
      const padrao = (SITE_DEFAULTS as unknown as Record<string, Record<string, unknown>>)[def.key].layout;
      expect(campo.options?.map((o) => o.value)).toContain(padrao);
    }
  });

  /* Modelo removido ou renomeado numa versão nova do site não pode
     deixar a dobra sem nada para renderizar. */
  it("modelo salvo que não existe mais volta ao padrão", () => {
    const c = resolveSiteContent([row("journey.layout", "carrossel-que-nunca-existiu", "select")]);
    expect(c.journey.layout).toBe(SITE_DEFAULTS.journey.layout);
  });

  it("modelo válido salvo é aplicado", () => {
    const c = resolveSiteContent([row("journey.layout", "linha", "select")]);
    expect(c.journey.layout).toBe("linha");
  });
});
