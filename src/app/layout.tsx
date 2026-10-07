import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";

import { generateThemeCss, siteConfig } from "@/config/site";

import "./globals.css";

// Both are variable fonts on Google Fonts, so the whole weight range arrives in
// one file and there is no weight list to keep in sync with the design.
// Archivo carries 400/500/600/700 and JetBrains Mono 400/500 — every weight
// docs/design-system.md §1 asks for.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const themeCss = generateThemeCss(siteConfig.theme);

  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {themeCss ? (
          <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
