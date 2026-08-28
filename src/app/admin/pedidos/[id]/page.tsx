import { notFound } from "next/navigation";

import { Card, Crumb, PageHeader } from "@/components/admin/page-parts";
import { StatusChip } from "@/components/admin/status-chip";
import { ProductImage } from "@/components/product-image";
import { requireAdminApi } from "@/lib/admin/session";
import { ADMIN_ORDER_LABEL, ADMIN_ORDER_TONE } from "@/lib/admin/status";
import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import {
  formatBRL,
  formatEta,
  formatOrderRef,
  formatPostalCode,
} from "@/lib/format";

import { OrderActions } from "./order-actions";

type Order = components["schemas"]["OrderResponse"];

/**
 * One order, and the five moves an operator can make on it.
 *
 * A 404 here is "gone **or** not yours" — a caller without `orders.read` sees
 * the same answer for someone else's order as for an id that never existed,
 * deliberately, so that a refusal never confirms an order exists. The copy
 * must never say "acesso negado".
 */
export default async function OrderDetailPage({
  params,
}: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await params;
  const api = await requireAdminApi();

  let order: Order;

  try {
    order = unwrap(await api.GET("/orders/{id}", { params: { path: { id } } }));
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }

    throw error;
  }

  return (
    <>
      <Crumb href="/admin/pedidos" label="Pedidos" />

      <PageHeader
        title={
          <span className="font-mono text-[32px] font-medium tracking-[-0.02em]">
            #{formatOrderRef(order.id)}
          </span>
        }
        meta={
          <>
            <StatusChip as="span" active={false} tone={ADMIN_ORDER_TONE[order.status]} compact>
              {ADMIN_ORDER_LABEL[order.status]}
            </StatusChip>
            <span className="type-meta text-admin-dim">
              {fullDate(order.createdAt)}
            </span>
          </>
        }
      >
        <OrderActions order={order} />
      </PageHeader>

      <Lifecycle order={order} />

      <div className="grid grid-cols-[2fr_1fr] items-start gap-6">
        <div className="flex flex-col gap-6">
          <Card
            title="Itens"
            note="Nome, tamanho e preço congelados na compra — renomear um tamanho depois não reescreve isto."
          >
            <div className="flex flex-col">
              <div className="grid grid-cols-[1fr_90px_120px_120px] gap-4 border-b border-admin-hairline pb-2.5">
                <span className="type-meta text-admin-dim">Peça</span>
                <span className="type-meta text-right text-admin-dim">Qtd</span>
                <span className="type-meta text-right text-admin-dim">Unitário</span>
                <span className="type-meta text-right text-admin-dim">Subtotal</span>
              </div>

              {order.items.map((item) => (
                <div
                  key={`${item.variantId}-${item.productId}`}
                  className="grid grid-cols-[1fr_90px_120px_120px] items-center gap-4 border-b border-admin-hairline py-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3.5">
                    <ProductImage
                      slug={item.productId}
                      name={item.productName}
                      showLabel={false}
                      className="w-10 shrink-0"
                    />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[15px] leading-tight">
                        {item.productName}
                      </span>
                      <span className="w-fit border border-admin-hairline px-1.5 py-0.5 font-mono text-[12px] text-muted">
                        {item.variantLabel}
                      </span>
                    </div>
                  </div>
                  <span className="text-right font-mono text-[14px] tabular-nums">
                    {item.quantity}
                  </span>
                  <span className="text-right font-mono text-[14px] tabular-nums">
                    {formatBRL(item.unitPriceCents)}
                  </span>
                  {/*
                    The line total is quantity × unit price. This is the one
                    multiplication the storefront rule allows: it restates a
                    figure the order already contains rather than deciding one —
                    `itemsSubtotalCents` and `totalCents` below both come from
                    the server, and nothing here adds them up.
                  */}
                  <span className="text-right font-mono text-[14px] tabular-nums">
                    {formatBRL(item.unitPriceCents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5 border-t border-admin-hairline pt-4.5">
              <Total label="Subtotal" value={order.itemsSubtotalCents} />
              <Total
                label={`Frete${order.shippingMethodName ? ` · ${order.shippingMethodName}` : ""}`}
                value={order.shippingCents}
              />
              <div className="flex items-baseline justify-between border-t border-admin-hairline pt-3">
                <span className="text-[16px] font-medium">Total</span>
                <span className="font-mono text-[18px] tabular-nums">
                  {formatBRL(order.totalCents)}
                </span>
              </div>
            </div>
          </Card>

          <Card title="Entrega">
            <div className="grid grid-cols-2 gap-6">
              <Field label="Endereço">
                {order.shippingLine1}
                {order.shippingLine2 ? ` · ${order.shippingLine2}` : ""}
                <br />
                {order.shippingCity} / {order.shippingState}
                <br />
                <span className="font-mono text-[14px]">
                  {formatPostalCode(order.shippingPostalCode)}
                </span>
              </Field>
              <Field label="Método">
                {order.shippingMethodName ?? "—"}
                {order.shippingMethodCode ? (
                  <>
                    <br />
                    <span className="type-meta text-muted">
                      {order.shippingMethodCode}
                      {order.shippingEtaDays !== null
                        ? ` · ${formatEta(order.shippingEtaDays) ?? ""}`
                        : ""}
                    </span>
                  </>
                ) : null}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-6 border-t border-admin-hairline pt-4.5">
              <Field label="Código de rastreio">
                {order.trackingCode ? (
                  <span className="font-mono text-[14px]">
                    {order.trackingCode}
                  </span>
                ) : (
                  <span className="text-admin-dim">
                    {order.status === "PAID"
                      ? "Preencher ao enviar"
                      : "Sem código"}
                  </span>
                )}
              </Field>
              <Field label="URL de rastreio">
                {order.trackingUrl ? (
                  <a
                    href={order.trackingUrl}
                    rel="noreferrer"
                    target="_blank"
                    className="font-mono text-[14px] hover:text-rust"
                  >
                    Abrir rastreio
                  </a>
                ) : (
                  <span className="text-admin-dim">Opcional</span>
                )}
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Cliente">
            {order.buyer ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[16px] leading-tight">
                  {order.buyer.name ?? "Sem nome cadastrado"}
                </span>
                <a
                  href={`mailto:${order.buyer.email}`}
                  className="text-[13px] text-muted hover:text-rust"
                >
                  {order.buyer.email}
                </a>
              </div>
            ) : (
              // Unreachable on this screen — the layout gates on the same
              // permission that fills this in — but the field is nullable in
              // the contract and pretending otherwise would be a cast.
              <span className="text-[14px] text-admin-dim">
                Não disponível para esta conta.
              </span>
            )}
          </Card>

          <Card title="Pagamento">
            <Row
              label="Confirmado"
              value={order.paidAt ? fullDate(order.paidAt) : "—"}
            />
            {order.refundedAt ? (
              <Row label="Reembolsado" value={fullDate(order.refundedAt)} />
            ) : null}
            <Row label="Intent" value={truncate(order.paymentIntentRef)} mono />
            <p className="border-t border-admin-hairline pt-3 text-[12px] leading-relaxed text-admin-dim">
              Quem move o pedido para pago é o webhook, não o retorno do
              navegador.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * The four happy states, with the two exits shown only when taken.
 *
 * CANCELLED and REFUNDED are not steps on this line — they are where an order
 * leaves it — so drawing them as a fifth node would suggest a sequence that
 * does not exist.
 */
function Lifecycle({ order }: { order: Order }) {
  const steps = [
    { label: "Criado", at: order.createdAt },
    { label: "Pago", at: order.paidAt },
    { label: "Enviado", at: order.shippedAt },
    { label: "Entregue", at: order.deliveredAt },
  ];

  const exit =
    order.cancelledAt !== null
      ? { label: "Cancelado", at: order.cancelledAt, tone: "text-clay" }
      : order.refundedAt !== null
        ? { label: "Reembolsado", at: order.refundedAt, tone: "text-rust" }
        : null;

  return (
    <div className="flex items-center gap-0 border border-admin-hairline bg-paper px-7 py-6">
      {steps.map((step, index) => (
        <div key={step.label} className="flex flex-grow items-center last:flex-grow-0">
          <div className="flex shrink-0 flex-col gap-1.5">
            <span
              className={`type-meta ${step.at ? "text-moss" : "text-admin-dim"}`}
            >
              {step.label}
            </span>
            <span
              className={`font-mono text-[13px] tabular-nums ${step.at ? "text-muted" : "text-admin-dim"}`}
            >
              {step.at ? shortStamp(step.at) : "—"}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <span
              className={`mx-5 h-px flex-grow ${steps[index + 1].at ? "bg-moss" : "bg-admin-hairline"}`}
            />
          ) : null}
        </div>
      ))}

      {exit ? (
        <>
          <span className="mx-5 h-px w-10 bg-admin-hairline" />
          <div className="flex shrink-0 flex-col gap-1.5">
            <span className={`type-meta ${exit.tone}`}>{exit.label}</span>
            <span className="font-mono text-[13px] tabular-nums text-muted">
              {shortStamp(exit.at)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="type-meta text-admin-dim">{label}</span>
      <span className="text-[15px] leading-relaxed">{children}</span>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[14px] text-muted">{label}</span>
      <span
        className={
          mono ? "font-mono text-[12px] text-muted" : "font-mono text-[13px] tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="font-mono text-[14px] tabular-nums">
        {formatBRL(value)}
      </span>
    </div>
  );
}

/** An internal provider reference, shortened. It is traceability, not data. */
function truncate(ref: string | null): string {
  if (!ref) {
    return "—";
  }

  return ref.length > 16 ? `${ref.slice(0, 8)}…${ref.slice(-4)}` : ref;
}

const full = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const stamp = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function fullDate(iso: string): string {
  return full.format(new Date(iso)).replace(", ", " · ");
}

function shortStamp(iso: string): string {
  return stamp.format(new Date(iso)).replace(", ", " ");
}
