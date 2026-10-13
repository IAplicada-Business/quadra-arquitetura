import { describe, it, expect } from "vitest";
import { monthRange } from "@/lib/monthRange";

describe("monthRange", () => {
  it("retorna null para todos os anos", () => {
    expect(monthRange("all", "all")).toBeNull();
  });
  it("cobre o ano inteiro", () => {
    expect(monthRange("2026", "all")).toEqual({ from: "2026-01-01", to: "2027-01-01" });
  });
  it("cobre um mês", () => {
    expect(monthRange("2026", "10")).toEqual({ from: "2026-10-01", to: "2026-11-01" });
  });
  it("vira o ano em dezembro", () => {
    expect(monthRange("2026", "12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });
});
