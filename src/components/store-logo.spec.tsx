import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { StoreLogo } from "./store-logo";

describe("StoreLogo Component", () => {
  it("renders typographic wordmark by default when logo url is empty", () => {
    render(<StoreLogo className="custom-logo" />);

    const logoElement = screen.getByText(siteConfig.name);
    expect(logoElement).toBeInTheDocument();
    expect(logoElement).toHaveClass("custom-logo");
  });

  it("renders img tag when logo url is configured", () => {
    const originalUrl = siteConfig.logo?.url;
    if (siteConfig.logo) {
      siteConfig.logo.url = "https://loja.com/assets/logo.svg";
    }

    try {
      render(<StoreLogo imageClassName="h-10" />);
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://loja.com/assets/logo.svg");
      expect(img).toHaveAttribute("alt", siteConfig.name);
      expect(img).toHaveClass("h-10");
    } finally {
      if (siteConfig.logo) {
        siteConfig.logo.url = originalUrl;
      }
    }
  });
});
