"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { availableTransitions, type TransitionVerb } from "@/lib/admin/status";
import {
  apiFetch,
  GENERIC_FALLBACK,
  problemMessage,
  SessionEndedError,
} from "@/lib/api/browser";
import type { components } from "@/lib/api/schema";
import { formatBRL, formatEta } from "@/lib/format";

type Order = components["schemas"]["OrderResponse"];
type ShippingOption = components["schemas"]["ShippingOptionResponse"];

/**
 * The back-office transitions, with direct Melhor Envio 1-click label purchase
 * for paid orders and manual shipping fallback.
 */
const DESTRUCTIVE = new Set<TransitionVerb>(["cancel", "refund"]);

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shipping, setShipping] = useState(false);

  // Label purchasing state (Melhor Envio)
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [quotes, setQuotes] = useState<ShippingOption[] | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("");

  const available = availableTransitions(order.status);

  async function run(verb: TransitionVerb, body?: unknown) {
    setBusy(verb);
    setError(null);

    try {
      const response = await apiFetch(`/api/admin/orders/${order.id}/${verb}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });

      if (!response.ok) {
        setError(await problemMessage(response));
        return;
      }

      setShipping(false);
      setGeneratingLabel(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof SessionEndedError
          ? caught.message
          : GENERIC_FALLBACK,
      );
    } finally {
      setBusy(null);
    }
  }

  async function openLabelGenerator() {
    setShipping(false);
    setError(null);
    setGeneratingLabel(true);

    if (quotes === null) {
      setLoadingQuotes(true);
      try {
        const response = await apiFetch(
          `/api/admin/orders/${order.id}/shipping-quotes`,
        );
        if (!response.ok) {
          setError(await problemMessage(response));
          setGeneratingLabel(false);
          return;
        }

        const data = (await response.json()) as ShippingOption[];
        setQuotes(data);
        if (data.length > 0) {
          setSelectedService(data[0].code);
        }
      } catch (caught) {
        setError(
          caught instanceof SessionEndedError
            ? caught.message
            : "Não foi possível carregar as cotações de frete.",
        );
        setGeneratingLabel(false);
      } finally {
        setLoadingQuotes(false);
      }
    }
  }

  async function purchaseLabel() {
    if (!selectedService) {
      setError("Selecione um serviço de entrega para a etiqueta.");
      return;
    }

    setBusy("label");
    setError(null);

    try {
      const response = await apiFetch(`/api/admin/orders/${order.id}/label`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serviceCode: selectedService }),
      });

      if (!response.ok) {
        setError(await problemMessage(response));
        return;
      }

      setGeneratingLabel(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof SessionEndedError
          ? caught.message
          : GENERIC_FALLBACK,
      );
    } finally {
      setBusy(null);
    }
  }

  if (available.length === 0) {
    return (
      <span className="type-meta self-center text-admin-dim">
        Sem transições disponíveis
      </span>
    );
  }

  const canGenerateLabel = order.status === "PAID";

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex gap-2.5">
        {canGenerateLabel ? (
          <Button
            size="admin"
            variant="default"
            disabled={busy !== null}
            onClick={openLabelGenerator}
          >
            {busy === "label" ? "Gerando..." : "Gerar Etiqueta"}
          </Button>
        ) : null}

        {available.map((transition) => {
          const isShip = transition.verb === "ship";

          return (
            <Button
              key={transition.verb}
              size="admin"
              variant={
                DESTRUCTIVE.has(transition.verb)
                  ? transition.verb === "cancel"
                    ? "destructive"
                    : "danger-outline"
                  : canGenerateLabel && isShip
                    ? "secondary"
                    : "default"
              }
              disabled={busy !== null}
              onClick={() => {
                if (isShip) {
                  setGeneratingLabel(false);
                  setShipping((open) => !open);
                  return;
                }

                void run(transition.verb);
              }}
            >
              {busy === transition.verb ? "…" : transition.label}
            </Button>
          );
        })}
      </div>

      {generatingLabel ? (
        <div className="flex w-[460px] flex-col gap-4 border border-admin-hairline bg-paper p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-admin-hairline pb-2.5">
            <div>
              <h4 className="text-[14px] font-medium leading-none">
                Expedir com Melhor Envio
              </h4>
              <p className="mt-1 text-[12px] text-muted">
                Compra a etiqueta de postagem com um clique e atualiza o rastreio.
              </p>
            </div>
            <span className="type-meta text-moss">1-Clique</span>
          </div>

          {loadingQuotes ? (
            <div className="py-6 text-center text-[13px] text-muted">
              Cotando com as transportadoras...
            </div>
          ) : quotes && quotes.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="type-meta text-admin-dim">
                Selecione o serviço de entrega:
              </span>
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {quotes.map((q) => (
                  <label
                    key={q.code}
                    className={`flex cursor-pointer items-center justify-between border p-3 transition-colors ${
                      selectedService === q.code
                        ? "border-moss bg-paper"
                        : "border-admin-hairline hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="serviceCode"
                        value={q.code}
                        checked={selectedService === q.code}
                        onChange={() => setSelectedService(q.code)}
                        className="text-moss focus:ring-moss"
                      />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium leading-tight">
                          {q.label}
                        </span>
                        <span className="text-[11px] text-muted">
                          {q.estimatedDays !== null
                            ? formatEta(q.estimatedDays)
                            : "Prazo não informado"}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[13px] font-medium tabular-nums">
                      {formatBRL(q.priceCents)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              Nenhuma cotação dinâmica disponível no momento. Utilize o envio
              manual.
            </p>
          )}

          <div className="flex justify-end gap-2.5 border-t border-admin-hairline pt-3">
            <Button
              type="button"
              variant="secondary"
              size="admin"
              onClick={() => setGeneratingLabel(false)}
            >
              Cancelar
            </Button>
            {quotes && quotes.length > 0 ? (
              <Button
                type="button"
                size="admin"
                disabled={busy !== null || !selectedService}
                onClick={purchaseLabel}
              >
                {busy === "label" ? "Comprando..." : "Comprar etiqueta e despachar"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {shipping ? (
        <form
          className="flex w-[420px] flex-col gap-3 border border-admin-hairline bg-paper p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run("ship", {
              trackingCode: data.get("trackingCode"),
              trackingUrl: data.get("trackingUrl"),
            });
          }}
        >
          <p className="text-[13px] text-muted">
            O rastreio é opcional — uma entrega local é um envio de verdade sem
            código para citar.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="trackingCode">Código de rastreio</Label>
            <Input
              id="trackingCode"
              name="trackingCode"
              inputSize="admin"
              maxLength={100}
              className="font-mono text-[14px]"
              placeholder="BR123456789BR"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="trackingUrl">URL de rastreio</Label>
            <Input
              id="trackingUrl"
              name="trackingUrl"
              type="url"
              inputSize="admin"
              maxLength={2000}
              className="font-mono text-[14px]"
              placeholder="https://…"
            />
          </div>
          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="admin"
              onClick={() => {
                setShipping(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" size="admin" disabled={busy !== null}>
              {busy === "ship" ? "Enviando" : "Marcar como enviado"}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="w-[420px] border-l-2 border-clay py-2 pl-3 text-right text-[13px] text-clay"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
