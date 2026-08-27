"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { WaitBar } from "@/components/wait-bar";
import {
  ORDER_STATUS_CLASS,
  ORDER_STATUS_LABEL,
} from "@/lib/order-status";
import type { components } from "@/lib/api/schema";
import { estimatedDelivery, formatBRL, formatOrderRef } from "@/lib/format";

type Order = components["schemas"]["OrderResponse"];
type PaidOrder = components["schemas"]["OrderWithPaymentResponse"];

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

export function OrderView({
  initialOrder,
  cancelledAtProvider,
}: {
  initialOrder: Order;
  cancelledAtProvider: boolean;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [gaveUp, setGaveUp] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
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
  /**
   * An order that has no way to be paid.
   *
   * Two ways to get here, and both are ordinary rather than broken. The
   * payment provider can be down at checkout — the order is still created,
   * its stock is still decremented, and `payment` comes back null, because an
   * order with the wrong total would be unfixable while a missing payment
   * session is not. Or the buyer reached Stripe and came back without paying,
   * which only the marker on the cancel redirect can tell us.
   *
   * Either way the fix is POST /orders/{id}/pay, which hands back the session
   * that already exists rather than opening a second way to pay one order.
   */
  const needsPayment =
    order.status === "CREATED" &&
    (order.paymentUrl === null || cancelledAtProvider);
  const waiting = order.status === "CREATED" && !needsPayment;
  const arrival = estimatedDelivery(order.paidAt, order.shippingEtaDays);

  async function pay() {
    setPaying(true);
    setPayError(null);

    let leaving = false;

    try {
      const response = await apiFetch(`/api/orders/${order.id}/pay`, {
        method: "POST",
      });

      if (!response.ok) {
        setPayError(await problemMessage(response));

        return;
      }

      const next = (await response.json()) as PaidOrder;

      if (next.payment?.mode === "hosted" && next.payment.url) {
        leaving = true;
        window.location.href = next.payment.url;

        return;
      }

      // Still no way to pay: the provider has not recovered, or it issued a
      // mode this storefront cannot render. The order is untouched either way.
      setPayError(
        "Não conseguimos abrir a página de pagamento. Tente novamente em instantes.",
      );
    } catch (caught) {
      setPayError(
        caught instanceof SessionEndedError
          ? "A sessão expirou. Entre novamente para pagar este pedido."
          : "Não conseguimos falar com o servidor. Tente de novo.",
      );
    } finally {
      if (!leaving) {
        setPaying(false);
      }
    }
  }

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

      {needsPayment ? (
        <div className="flex w-full max-w-[420px] flex-col gap-4">
          <p className="type-meta text-muted">Pagamento pendente</p>

          <p className="text-small text-muted">
            {order.paymentUrl === null
              ? "Não foi possível abrir o pagamento quando o pedido foi criado. O pedido está guardado e as peças já saíram do estoque para você."
              : "Você voltou sem concluir o pagamento. O pedido está guardado e as peças já saíram do estoque para você."}
          </p>

          {/* Ink, not rust. §1 rations rust to four places and the recovery CTA
              it names is the stock conflict's, not this one. */}
          <Button type="button" disabled={paying} onClick={() => void pay()}>
            {paying ? "Abrindo o pagamento" : "Pagar pedido"}
          </Button>

          {payError ? (
            <p role="alert" className="text-small text-clay">
              {payError}
            </p>
          ) : null}

          <p className="text-small text-muted">Nada foi cobrado ainda.</p>
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

function OrderSummary({ order }: { order: Order }) {
  // A count of lines on an order that is already frozen — not a rule, and not
  // a number the API would be better off computing.
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <dl className="flex w-full max-w-[420px] flex-col gap-3 border border-hairline bg-paper p-6 text-left">
      <Row label="Status">
        <span className={`type-meta ${ORDER_STATUS_CLASS[order.status]}`}>
          {ORDER_STATUS_LABEL[order.status]}
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
