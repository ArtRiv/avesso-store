import { describe, expect, it } from "vitest";

import {
  formatLegalFooter,
  generateThemeCss,
  getSiteConfig,
  isValidCssColor,
} from "./site";

describe("Site Configuration & Visual Identity", () => {
  describe("isValidCssColor", () => {
    it("validates correct hexadecimal colors", () => {
      expect(isValidCssColor("#fff")).toBe(true);
      expect(isValidCssColor("#000000")).toBe(true);
      expect(isValidCssColor("#1f6f52")).toBe(true);
      expect(isValidCssColor("#b0431e")).toBe(true);
      expect(isValidCssColor("#ff0000aa")).toBe(true);
    });

    it("rejects malicious or invalid color strings", () => {
      expect(isValidCssColor("red")).toBe(false);
      expect(isValidCssColor("url(javascript:alert(1))")).toBe(false);
      expect(isValidCssColor("#12345")).toBe(false);
      expect(isValidCssColor("expression(alert(1))")).toBe(false);
      expect(isValidCssColor("")).toBe(false);
    });
  });

  describe("getSiteConfig", () => {
    it("provides complete default configurations when environment variables are unset", () => {
      const config = getSiteConfig();

      expect(config.name).toBe("AVESSO");
      expect(config.tagline).toBe("Doze peças. Feitas para durar anos.");
      expect(config.legal.companyName).toBe("AVESSO Confecções LTDA");
      expect(config.legal.cnpj).toBe("42.318.907/0001-55");
      expect(config.legal.address.city).toBe("São Paulo");
      expect(config.legal.contact.email).toBe("atendimento@avesso.com.br");
    });
  });

  describe("formatLegalFooter", () => {
    it("formats corporate identification as required by Decreto 7.962/2013", () => {
      const formatted = formatLegalFooter({
        companyName: "Minha Loja Comércio LTDA",
        cnpj: "12.345.678/0001-90",
        address: {
          street: "Av. Paulista",
          number: "1000",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "SP",
          postalCode: "01310-100",
        },
        contact: {
          email: "sac@minhaloja.com.br",
          hours: "Seg a sex 9h às 18h",
        },
      });

      expect(formatted).toBe(
        "Minha Loja Comércio LTDA · CNPJ 12.345.678/0001-90 · Av. Paulista 1000, São Paulo SP",
      );
    });
  });

  describe("generateThemeCss", () => {
    it("returns empty string if no theme colors are provided", () => {
      const css = generateThemeCss({});
      expect(css).toBe("");
    });

    it("generates valid CSS root properties when colors are customized", () => {
      const css = generateThemeCss({
        primaryColor: "#111111",
        accentColor: "#c45a38",
        backgroundColor: "#fafafa",
        cardColor: "#ffffff",
        borderColor: "#e5e5e5",
        mutedColor: "#737373",
      });

      expect(css).toContain(":root {");
      expect(css).toContain("--color-ink: #111111;");
      expect(css).toContain("--color-primary: #111111;");
      expect(css).toContain("--color-rust: #c45a38;");
      expect(css).toContain("--color-warm: #fafafa;");
      expect(css).toContain("--color-paper: #ffffff;");
      expect(css).toContain("--color-hairline: #e5e5e5;");
      expect(css).toContain("--color-muted: #737373;");
    });

    it("ignores invalid color values to prevent CSS injection", () => {
      const css = generateThemeCss({
        primaryColor: "invalid; color: red;",
        accentColor: "#123456",
      });

      expect(css).not.toContain("invalid");
      expect(css).toContain("--color-rust: #123456;");
    });
  });
});
