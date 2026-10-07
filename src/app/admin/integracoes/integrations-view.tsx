"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Card, PageHeader } from "@/components/admin/page-parts";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { apiFetch, problemMessage } from "@/lib/api/browser";
import type { components } from "@/lib/api/schema";

type IntegrationItem = components["schemas"]["IntegrationItemResponse"];

export function IntegrationsView({
  integrations,
  initialConnected = false,
  initialError = null,
}: {
  integrations: IntegrationItem[];
  initialConnected?: boolean | string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const isInitialMeli =
    initialConnected === true ||
    initialConnected === "true" ||
    initialConnected === "mercadolivre";
  const isInitialShopee = initialConnected === "shopee";

  const [message, setMessage] = useState<string | null>(
    isInitialMeli
      ? "Mercado Livre conectado com sucesso! Catálogo pronto para sincronização."
      : isInitialShopee
        ? "Shopee conectada com sucesso! Catálogo e estoque prontos para sincronização."
        : null,
  );
  const [error, setError] = useState<string | null>(initialError);

  const meliIntegration = integrations.find(
    (item) => item.provider === "MERCADO_LIVRE",
  );
  const isMeliConnected =
    meliIntegration?.status === "ACTIVE" || isInitialMeli;

  const shopeeIntegration = integrations.find(
    (item) => item.provider === "SHOPEE",
  );
  const isShopeeConnected =
    shopeeIntegration?.status === "ACTIVE" || isInitialShopee;

  // --- HANDLERS MERCADO LIVRE ---

  async function handleConnectMeli() {
    setBusy("connect-meli");
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch(
        "/api/admin/integrations/mercadolivre/auth-url",
      );
      if (!response.ok) {
        setError(await problemMessage(response));
        setBusy(null);
        return;
      }

      const data = (await response.json()) as { url: string };
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError("Não foi possível gerar a URL de autorização.");
        setBusy(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao iniciar conexão.",
      );
      setBusy(null);
    }
  }

  async function handleDisconnectMeli() {
    if (
      !confirm(
        "Deseja realmente desconectar a integração com o Mercado Livre?",
      )
    ) {
      return;
    }

    setBusy("disconnect-meli");
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch(
        "/api/admin/integrations/mercadolivre/disconnect",
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        setError(await problemMessage(response));
        setBusy(null);
        return;
      }

      setMessage("Integração com Mercado Livre desconectada com sucesso.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desconectar.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSyncMeliCatalog() {
    setBusy("sync-meli");
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch(
        "/api/admin/integrations/mercadolivre/sync",
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        setError(await problemMessage(response));
        setBusy(null);
        return;
      }

      const res = (await response.json()) as {
        syncedProducts: number;
        totalVariants: number;
      };

      setMessage(
        `Catálogo sincronizado com sucesso! ${res.syncedProducts} produto(s) e ${res.totalVariants} variante(s) atualizados no Mercado Livre.`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao sincronizar catálogo.",
      );
    } finally {
      setBusy(null);
    }
  }

  // --- HANDLERS SHOPEE ---

  async function handleConnectShopee() {
    setBusy("connect-shopee");
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch(
        "/api/admin/integrations/shopee/auth-url",
      );
      if (!response.ok) {
        setError(await problemMessage(response));
        setBusy(null);
        return;
      }

      const data = (await response.json()) as { url: string };
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError("Não foi possível gerar a URL de autorização da Shopee.");
        setBusy(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Falha ao iniciar conexão com a Shopee.",
      );
      setBusy(null);
    }
  }

  async function handleDisconnectShopee() {
    if (
      !confirm("Deseja realmente desconectar a integração com a Shopee?")
    ) {
      return;
    }

    setBusy("disconnect-shopee");
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch(
        "/api/admin/integrations/shopee/disconnect",
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        setError(await problemMessage(response));
        setBusy(null);
        return;
      }

      setMessage("Integração com a Shopee desconectada com sucesso.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desconectar.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSyncShopeeCatalog() {
    setBusy("sync-shopee");
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch(
        "/api/admin/integrations/shopee/sync",
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        setError(await problemMessage(response));
        setBusy(null);
        return;
      }

      const res = (await response.json()) as {
        syncedProducts: number;
        totalVariants: number;
      };

      setMessage(
        `Catálogo sincronizado com sucesso na Shopee! ${res.syncedProducts} produto(s) e ${res.totalVariants} variante(s) atualizados.`,
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao sincronizar catálogo com a Shopee.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Integrações & Marketplaces"
        meta={
          <span className="type-meta text-muted">
            Hub Multi-Tenant de Canais de Venda e Sincronização Atômica
          </span>
        }
      />

      {message ? (
        <div className="border border-green-800/40 bg-green-950/20 px-4 py-3 text-sm text-green-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card Mercado Livre */}
        <Card title="Mercado Livre" note="Marketplace líder na América Latina">
          <div className="flex items-center justify-between">
            <span className="type-meta text-xs">Status</span>
            {isMeliConnected ? (
              <Badge tone="moss">Conectado</Badge>
            ) : (
              <Badge tone="neutral">Desconectado</Badge>
            )}
          </div>

          <div className="flex flex-col gap-4 text-sm text-muted">
            <p className="leading-relaxed">
              Integração completa com autorização OAuth 2.0, rotação atômica de
              refresh token em PostgreSQL, sincronização de catálogo e webhook
              receiver para ingestão de pedidos com baixa imediata de estoque.
            </p>

            {isMeliConnected ? (
              <div className="flex flex-col gap-2 rounded border border-admin-hairline bg-paper/50 p-3.5">
                <div className="flex justify-between">
                  <span className="type-meta text-xs">Vendedor:</span>
                  <span className="font-mono text-xs font-medium text-ink">
                    {String(
                      (
                        meliIntegration?.metadata as
                          | Record<string, unknown>
                          | null
                          | undefined
                      )?.nickname ?? "Conta Conectada",
                    )}
                  </span>
                </div>
                {meliIntegration?.expiresAt ? (
                  <div className="flex justify-between">
                    <span className="type-meta text-xs">
                      Expiração do Token:
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {new Date(
                        String(meliIntegration.expiresAt),
                      ).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="type-meta text-xs">Segurança:</span>
                  <span className="text-xs text-emerald-400">
                    Criptografia AES-256-GCM em Repouso
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded border border-admin-hairline bg-paper/30 p-3.5 text-xs">
                Clique no botão abaixo para conectar a conta do Mercado Livre em
                1-clique via OAuth seguro.
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-3">
              {isMeliConnected ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy !== null}
                    onClick={handleSyncMeliCatalog}
                  >
                    {busy === "sync-meli"
                      ? "Sincronizando..."
                      : "Sincronizar Catálogo"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy !== null}
                    onClick={handleDisconnectMeli}
                  >
                    {busy === "disconnect-meli"
                      ? "Desconectando..."
                      : "Desconectar"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  disabled={busy !== null}
                  onClick={handleConnectMeli}
                >
                  {busy === "connect-meli"
                    ? "Conectando..."
                    : "Conectar com Mercado Livre"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Card Shopee */}
        <Card title="Shopee" note="Marketplace de alta conversão mobile">
          <div className="flex items-center justify-between">
            <span className="type-meta text-xs">Status</span>
            {isShopeeConnected ? (
              <Badge tone="moss">Conectado</Badge>
            ) : (
              <Badge tone="neutral">Desconectado</Badge>
            )}
          </div>

          <div className="flex flex-col gap-4 text-sm text-muted">
            <p className="leading-relaxed">
              Integração oficial via Shopee Open Platform com autenticação
              HMAC-SHA256, rotação automática de tokens (4h) sob row lock em
              PostgreSQL, mapeamento mandatário de taxonomia e push mechanism em
              tempo real.
            </p>

            {isShopeeConnected ? (
              <div className="flex flex-col gap-2 rounded border border-admin-hairline bg-paper/50 p-3.5">
                <div className="flex justify-between">
                  <span className="type-meta text-xs">Loja:</span>
                  <span className="font-mono text-xs font-medium text-ink">
                    {String(
                      (
                        shopeeIntegration?.metadata as
                          | Record<string, unknown>
                          | null
                          | undefined
                      )?.shopName ?? "Loja Oficial Shopee",
                    )}
                  </span>
                </div>
                {shopeeIntegration?.metadata?.shopId ? (
                  <div className="flex justify-between">
                    <span className="type-meta text-xs">Shop ID:</span>
                    <span className="font-mono text-xs text-muted">
                      {String(shopeeIntegration.metadata.shopId)}
                    </span>
                  </div>
                ) : null}
                {shopeeIntegration?.expiresAt ? (
                  <div className="flex justify-between">
                    <span className="type-meta text-xs">
                      Expiração do Token:
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {new Date(
                        String(shopeeIntegration.expiresAt),
                      ).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="type-meta text-xs">Segurança:</span>
                  <span className="text-xs text-emerald-400">
                    Criptografia AES-256-GCM em Repouso
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded border border-admin-hairline bg-paper/30 p-3.5 text-xs">
                Clique no botão abaixo para conectar a conta da Shopee em
                1-clique via Open Platform.
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-3">
              {isShopeeConnected ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy !== null}
                    onClick={handleSyncShopeeCatalog}
                  >
                    {busy === "sync-shopee"
                      ? "Sincronizando..."
                      : "Sincronizar Catálogo"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={busy !== null}
                    onClick={handleDisconnectShopee}
                  >
                    {busy === "disconnect-shopee"
                      ? "Desconectando..."
                      : "Desconectar"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  disabled={busy !== null}
                  onClick={handleConnectShopee}
                >
                  {busy === "connect-shopee"
                    ? "Conectando..."
                    : "Conectar com Shopee"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Card Amazon SP-API (Sessão 12) */}
        <Card title="Amazon SP-API" note="Selling Partner API global">
          <div className="flex items-center justify-between">
            <span className="type-meta text-xs">Status</span>
            <Badge tone="neutral">Em breve (Sessão 12)</Badge>
          </div>

          <div className="flex flex-col gap-4 text-sm text-muted">
            <p className="leading-relaxed">
              Login with Amazon (LWA) integrado a perfis IAM SigV4, auditoria
              estrita DPP e mensageria assíncrona orientada a eventos.
            </p>
            <div className="mt-auto pt-2">
              <Button type="button" variant="secondary" disabled>
                Indisponível nesta versão
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
