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

  it("exibe estado desconectado e botão de conexão em 1-clique para Mercado Livre e Shopee", () => {
    render(<IntegrationsView integrations={[]} />);

    expect(screen.getAllByText("Desconectado")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Conectar com Mercado Livre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Conectar com Shopee" }),
    ).toBeInTheDocument();
  });

  it("exibe estado conectado do Mercado Livre com vendedor e botões de ação", () => {
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

  it("exibe estado conectado da Shopee com loja e botões de ação", () => {
    render(
      <IntegrationsView
        integrations={[
          {
            provider: "SHOPEE",
            connected: true,
            status: "ACTIVE",
            expiresAt: "2026-10-06T20:00:00.000Z",
            metadata: { shopId: 654321, shopName: "AVESSO Oficial Shopee" },
          },
        ]}
      />,
    );

    expect(screen.getByText("Conectado")).toBeInTheDocument();
    expect(screen.getByText("AVESSO Oficial Shopee")).toBeInTheDocument();
    expect(screen.getByText("654321")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sincronizar Catálogo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Desconectar" }),
    ).toBeInTheDocument();
  });

  it("renderiza banner de sucesso quando initialConnected é verdadeiro para Mercado Livre", () => {
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

  it("renderiza banner de sucesso quando initialConnected é 'shopee'", () => {
    render(
      <IntegrationsView
        integrations={[]}
        initialConnected="shopee"
      />,
    );

    expect(
      screen.getByText(/Shopee conectada com sucesso!/),
    ).toBeInTheDocument();
  });
});
