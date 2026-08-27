"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { apiFetch, SessionEndedError } from "@/lib/api/browser";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { WaitBar } from "@/components/wait-bar";
import type { components } from "@/lib/api/schema";
import { estimatedDelivery, formatBRL, formatOrderRef } from "@/lib/format";

type Order = components["schemas"]["OrderResponse"];

/**
 * Polling, and when to stop.
 *
 * Two seconds to start with, backing off, and giving up after about a minute.
 * The giving up is not a failure state: the order exists, the money is in
 * flight, and the backend sends an e-mail when the webhook lands. Saying so is
 * more honest than a spinner that never stops — especially here, where a
 * webhook arriving while the service is hibernating is cut off at 30s and only
 * confirms on Stripe's retry, which can be minutes.
 */
const FIRST_INTERVAL_MS = 2000;
const MAX_INTERVAL_MS = 8000;
const GIVE_UP_AFTER_MS = 60_000;

/** The statuses that mean the webhook has been and gone. */
function isSettled(status: Order["status"]): boolean {
  return status !== "CREATED";
}

export function OrderView({ initialOrder }: { initialOrder: Order }) {
  const [order, setOrder] = useState(initialOrder);
  const [gaveUp, setGaveUp] = useState(false);
  // Started inside the effect, not during render: reading the clock while
  // rendering is impure, and a re-render would quietly restart the minute.
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (isSettled(order.status) || gaveUp) {
      return;
    }

    startedAt.current ??= Date.now();

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let interval = FIRST_INTERVAL_MS;

    async function poll() {
      if (cancelled) {
        return;
      }

      if (Date.now() - (startedAt.current ?? Date.now()) > GIVE_UP_AFTER_MS) {
        setGaveUp(true);

        return;
      }

      try {
        const response = await apiFetch(`/api/orders/${order.id}`);

        if (response.ok) {
          const next = (await response.json()) as Order;

          if (!cancelled) {
            setOrder(next);

            if (isSettled(next.status)) {
              return;
            }
          }
        }
      } catch (error) {
        // A dead session is not something polling can fix.
        if (error instanceof SessionEndedError) {
          setGaveUp(true);

          return;
        }
      }

      interval = Math.min(interval * 1.5, MAX_INTERVAL_MS);
      timer = setTimeout(() => void poll(), interval);
    }

    timer = setTimeout(() => void poll(), interval);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [order.id, order.status, gaveUp]);

  const paid = order.status === "PAID";
  const waiting = order.status === "CREATED";
  const arrival = estimatedDelivery(order.paidAt, order.shippingEtaDays);

  return (
    // Centred body text, which §7 forbids everywhere except artboards 08
    // and 09. This is 08.
    <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-8 px-6 py-16 text-center">
      <p className="type-meta text-muted">
        Pedido #{formatOrderRef(order.id)}
      </p>

      <h1 className="text-h1">Recebemos seu pedido</h1>

      {waiting && !gaveUp ? (
        <div className="flex w-full max-w-[420px] flex-col gap-4">
          <p className="type-meta">Confirmando o pagamento</p>
          <WaitBar label="Confirmando o pagamento" />
          <p className="text-small text-muted">
            A confirmação vem do processador de pagamento e costuma levar
            alguns segundos. Você pode fechar esta página: enviamos um e-mail
            quando o pagamento for aprovado.
          </p>
        </div>
      ) : null}

      {waiting && gaveUp ? (
        <div className="flex w-full max-w-[420px] flex-col gap-4">
          <p className="type-meta text-muted">Ainda confirmando</p>
          <p className="text-small text-muted">
            A confirmação está demorando mais que o normal. Seu pedido está
            registrado e nada se perdeu — assim que o processador responder,
            enviamos um e-mail. Você pode fechar esta página.
          </p>
        </div>
      ) : null}

      {paid ? (
        <div className="flex w-full max-w-[420px] flex-col items-center gap-4">
          <Badge tone="moss">Pago</Badge>
          {arrival ? (
            <p className="text-body">Entrega estimada para {arrival}</p>
          ) : null}
          <p className="text-small text-muted">
            Assim que a etiqueta for postada, o código de rastreio aparece
            nesta página e no seu e-mail.
          </p>
        </div>
      ) : null}

      <OrderSummary order={order} />

      <Button asChild variant="secondary">
        <Link href="/minha-conta/pedidos">Ver meus pedidos</Link>
      </Button>
    </section>
  );
}

const STATUS_LABEL: Readonly<Record<Order["status"], string>> = {
  CREATED: "Aguardando pagamento",
  PAID: "Pago",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const STATUS_CLASS: Readonly<Record<Order["status"], string>> = {
  CREATED: "text-rust",
  PAID: "text-moss",
  SHIPPED: "text-moss",
  DELIVERED: "text-moss",
  CANCELLED: "text-clay",
  REFUNDED: "text-clay",
};

function OrderSummary({ order }: { order: Order }) {
  // A count of lines on an order that is already frozen — not a rule, and not
  // a number the API would be better off computing.
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <dl className="flex w-full max-w-[420px] flex-col gap-3 border border-hairline bg-paper p-6 text-left">
      <Row label="Status">
        <span className={`type-meta ${STATUS_CLASS[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </Row>

      <Row label="Itens">
        <span className="font-mono font-medium">
          {pieces} {pieces === 1 ? "peça" : "peças"}
        </span>
      </Row>

      {/* The freight row has to survive a null method and a null carrier —
          the deployed table returns one option per CEP with carrier null. */}
      <Row
        label={
          order.shippingMethodName ? `Frete · ${order.shippingMethodName}` : "Frete"
        }
      >
        <span className="font-mono font-medium">
          {formatBRL(order.shippingCents)}
        </span>
      </Row>

      <div className="flex items-baseline justify-between border-t border-hairline pt-3">
        <dt className="text-h3">Total</dt>
        <dd className="font-mono text-[20px] leading-[1.2] font-medium tabular-nums">
          {formatBRL(order.totalCents)}
        </dd>
      </div>
    </dl>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-small flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
