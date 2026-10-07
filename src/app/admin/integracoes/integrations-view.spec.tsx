import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IntegrationsView } from "./integrations-view";

// Mock do router do Next.js
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

describe("IntegrationsView", () => {
  it("renderiza todos os canais de marketplace no hub", () => {
    render(<IntegrationsView integrations={[]} />);

    expect(screen.getByText("Integrações & Marketplaces")).toBeInTheDocument();
    expect(screen.getByText("Mercado Livre")).toBeInTheDocument();
    expect(screen.getByText("Shopee")).toBeInTheDocument();
    expect(screen.getByText("Amazon SP-API")).toBeInTheDocument();
  });

  it("exibe estado desconectado e botão de conexão em 1-clique", () => {
    render(<IntegrationsView integrations={[]} />);

    expect(screen.getByText("Desconectado")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Conectar com Mercado Livre" }),
    ).toBeInTheDocument();
  });

  it("exibe estado conectado com vendedor e botões de ação", () => {
    render(
      <IntegrationsView
        integrations={[
          {
            provider: "MERCADO_LIVRE",
            connected: true,
            status: "ACTIVE",
            expiresAt: "2026-10-06T18:00:00.000Z",
            metadata: { nickname: "LOJA_OFICIAL_AVESSO" },
          },
        ]}
      />,
    );

    expect(screen.getByText("Conectado")).toBeInTheDocument();
    expect(screen.getByText("LOJA_OFICIAL_AVESSO")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sincronizar Catálogo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Desconectar" }),
    ).toBeInTheDocument();
  });

  it("renderiza banner de sucesso quando initialConnected é verdadeiro", () => {
    render(
      <IntegrationsView
        integrations={[]}
        initialConnected={true}
      />,
    );

    expect(
      screen.getByText(/Mercado Livre conectado com sucesso!/),
    ).toBeInTheDocument();
  });
});
