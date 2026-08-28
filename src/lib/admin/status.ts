import type { components } from "@/lib/api/schema";

type OrderStatus = components["schemas"]["OrderResponse"]["status"];
type ProductStatus = components["schemas"]["ProductResponse"]["status"];

/**
 * The order statuses, wearing the operator's colours.
 *
 * The labels are NOT redefined here — `ORDER_STATUS_LABEL` in
 * src/lib/order-status.ts is shared, and deliberately: a customer told
 * "Enviado" and an operator reading "Despachado" is the store contradicting
 * itself about the same row, and the support call that follows is about which
 * of the two is real.
 *
 * The colours do differ, and that is not drift. The storefront paints SHIPPED
 * and DELIVERED both moss because a customer wants one bit of information —
 * the parcel is coming. An operator scans a column holding all six at once,
 * where two states sharing a colour is two states they cannot tell apart.
 */
export const ADMIN_ORDER_TONE: Readonly<
  Record<OrderStatus, "neutral" | "moss" | "shipped" | "delivered" | "clay" | "rust">
> = {
  CREATED: "neutral",
  PAID: "moss",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "clay",
  REFUNDED: "rust",
};

/**
 * The panel's own word for `CREATED`.
 *
 * The storefront says "Aguardando pagamento", which is what the customer needs
 * to read: it names what is missing and whose move it is. The canvas's filter
 * rail says "Criado", and here that is the better word — the operator is
 * filtering a lifecycle, and the rail sits beside Pago, Enviado, Entregue,
 * which are all the state's name rather than its consequence.
 *
 * Every other status keeps the shared label exactly.
 */
export const ADMIN_ORDER_LABEL: Readonly<Record<OrderStatus, string>> = {
  CREATED: "Criado",
  PAID: "Pago",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const PRODUCT_STATUS_LABEL: Readonly<Record<ProductStatus, string>> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivado",
};

export const PRODUCT_STATUS_TONE: Readonly<
  Record<ProductStatus, "moss" | "neutral" | "dim">
> = {
  DRAFT: "neutral",
  ACTIVE: "moss",
  ARCHIVED: "dim",
};

/**
 * The five back-office transitions, and the status each one may leave from.
 *
 * This mirrors the lifecycle the backend enforces
 * (docs/backend-commerce-core.md): CREATED → PAID → SHIPPED → DELIVERED, with
 * CREATED → CANCELLED and PAID → REFUNDED as the two exits. Anything outside
 * that map is a 409 there.
 *
 * It is here to decide which buttons a screen offers, and nothing more. The
 * backend answers 409 on a transition it will not make, and the panel shows
 * that answer — a button hidden here has never been what stopped anything,
 * and duplicating the rule as a *guard* would be the second contract
 * docs/upstream-first.md exists to prevent.
 */
export const TRANSITIONS = [
  { verb: "mark-paid", label: "Marcar como pago", from: "CREATED" },
  { verb: "ship", label: "Marcar como enviado", from: "PAID" },
  { verb: "deliver", label: "Marcar como entregue", from: "SHIPPED" },
  { verb: "cancel", label: "Cancelar", from: "CREATED" },
  { verb: "refund", label: "Reembolsar", from: "PAID" },
] as const satisfies readonly {
  verb: string;
  label: string;
  from: OrderStatus;
}[];

export type TransitionVerb = (typeof TRANSITIONS)[number]["verb"];

/** Which of the five this status allows, in the order the canvas lists them. */
export function availableTransitions(status: OrderStatus) {
  return TRANSITIONS.filter((transition) => transition.from === status);
}
