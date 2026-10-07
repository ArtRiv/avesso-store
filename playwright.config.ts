import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração Playwright para o storefront AVESSO.
 *
 * Executa testes E2E em navegadores reais (Chromium), com captura de vídeo,
 * screenshots e traces em caso de falha.
 *
 * Utiliza o recurso de múltiplos webServers para subir o mock-backend na porta 3099
 * e o servidor de desenvolvimento Next.js na porta 5173.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node e2e/mock-backend.mjs",
      port: 3099,
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
    },
    {
      command: "pnpm dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        API_URL: "http://localhost:3099",
        NEXT_PUBLIC_SITE_URL: "http://localhost:5173",
        PORT: "5173",
      },
    },
  ],
});
