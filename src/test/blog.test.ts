import { describe, it, expect } from "vitest";
import {
  formatPostDate,
  isValidSlug,
  parseBlogPost,
  parseBlogSummary,
  readingMinutes,
  slugify,
} from "@/lib/blog";

describe("slugify", () => {
  it("tira acento, pontuação e espaço sobrando", () => {
    expect(slugify("Orçamento: o que ninguém conta!")).toBe("orcamento-o-que-ninguem-conta");
    expect(slugify("  5 decisões   inofensivas  ")).toBe("5-decisoes-inofensivas");
  });

  it("gera slug válido ou vazio, nunca inválido", () => {
    for (const t of ["", "???", "Olhar Quadra", "a".repeat(200)]) {
      const s = slugify(t);
      expect(s === "" || isValidSlug(s)).toBe(true);
    }
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it("não deixa hífen pendurado depois de cortar em 80", () => {
    expect(slugify(`${"a".repeat(79)} b`).endsWith("-")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it("espelha o CHECK da tabela", () => {
    expect(isValidSlug("obra-sem-surto")).toBe(true);
    expect(isValidSlug("Obra")).toBe(false);
    expect(isValidSlug("-obra")).toBe(false);
    expect(isValidSlug("obra--sem")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("readingMinutes", () => {
  it("nunca é menor que 1 e arredonda para cima", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1100)).toBe(1);
    expect(readingMinutes(1101)).toBe(2);
    expect(readingMinutes(Number.NaN)).toBe(1);
  });
});

describe("parseBlogSummary / parseBlogPost", () => {
  it("aplica a regra do travessão ao texto publicado", () => {
    const p = parseBlogSummary({ slug: "a", title: "Prazo — e preço", excerpt: "x – y", reading_chars: 2200 });
    expect(p?.title).toBe("Prazo, e preço");
    expect(p?.excerpt).toBe("x, y");
    expect(p?.readingChars).toBe(2200);
  });

  it("descarta linha sem slug ou sem título", () => {
    expect(parseBlogSummary({ slug: "", title: "x" })).toBeNull();
    expect(parseBlogSummary({ slug: "a", title: "  " })).toBeNull();
    expect(parseBlogSummary(null)).toBeNull();
    expect(parseBlogPost({ title: "sem slug" })).toBeNull();
  });

  it("o artigo carrega o corpo e tolera campos de tipo errado", () => {
    const p = parseBlogPost({ slug: "a", title: "T", content: "## Oi", cover_url: 5, published_at: "2026-10-01T12:00:00Z" });
    expect(p?.content).toBe("## Oi");
    expect(p?.coverUrl).toBe("");
    expect(p?.publishedAt).toBe("2026-10-01T12:00:00Z");
  });
});

describe("formatPostDate", () => {
  it("formata em português e tolera data inválida", () => {
    expect(formatPostDate("2026-10-12T15:00:00Z")).toMatch(/outubro de 2026/);
    expect(formatPostDate(null)).toBe("");
    expect(formatPostDate("nada")).toBe("");
  });
});
