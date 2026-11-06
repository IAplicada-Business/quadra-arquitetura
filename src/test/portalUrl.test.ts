import { describe, it, expect } from "vitest";
import { buildPortalUrl, portalWhatsappUrl } from "@/lib/portalUrl";

describe("buildPortalUrl", () => {
  it("usa a base informada sem barra final", () => {
    expect(buildPortalUrl("abc", "https://app.quadra.com/")).toBe("https://app.quadra.com/client/abc");
    expect(buildPortalUrl("abc", "https://app.quadra.com///")).toBe("https://app.quadra.com/client/abc");
  });
  it("sem base usa a origem atual", () => {
    expect(buildPortalUrl("abc")).toBe(`${window.location.origin}/client/abc`);
  });
  it("link de WhatsApp leva o texto e a URL codificados", () => {
    const w = portalWhatsappUrl("https://x.com/client/t");
    expect(w.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(w)).toContain("https://x.com/client/t");
  });
});
