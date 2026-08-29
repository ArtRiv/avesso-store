"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { availableTransitions, type TransitionVerb } from "@/lib/admin/status";
import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import type { components } from "@/lib/api/schema";

type Order = components["schemas"]["OrderResponse"];

/**
 * The five back-office transitions, filtered to the ones this status allows.
 *
 * Filtering is a courtesy, not a rule. The backend owns the state machine and
 * answers 409 to a move an order cannot make; offering only the legal buttons
 * saves an operator a pointless click, and duplicating the machine here as a
 * *guard* would be the second contract upstream-first exists to prevent.
 *
 * `ship` is the one that opens a form: tracking is optional by business rule,
 * because a local hand-off is a real shipment with no code.
 */
const DESTRUCTIVE = new Set<TransitionVerb>(["cancel", "refund"]);

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, setBusy] = useState<TransitionVerb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shipping, setShipping] = useState(false);

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
      // The page is a server component reading the order; re-render it rather
      // than holding a second copy of the order in this component.
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof SessionEndedError
          ? caught.message
          : "Não foi possível concluir. Tente novamente em instantes.",
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

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex gap-2.5">
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
                  : "default"
              }
              disabled={busy !== null}
              onClick={() => {
                if (isShip) {
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
