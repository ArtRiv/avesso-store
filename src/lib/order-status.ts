import type { components } from "@/lib/api/schema";

type OrderStatus = components["schemas"]["OrderResponse"]["status"];

/**
 * The six statuses in pt-BR, and the colour each one gets.
 *
 * Shared rather than duplicated because the order page and the orders list
 * have to agree: a customer who sees `Aguardando pagamento` in the list and
 * something else on the order itself has caught the store contradicting
 * itself about their own money.
 *
 * `CREATED` is the one that reads oddly in English and correctly in the shop's
 * voice — the order exists, and what is missing is the payment.
 */
export const ORDER_STATUS_LABEL: Readonly<Record<OrderStatus, string>> = {
  CREATED: "Aguardando pagamento",
  PAID: "Pago",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

/**
 * Rust on `CREATED` is the payment-wait colour of artboard 08, which §1 does
 * allow. Moss is money that arrived, clay is money that went back or never
 * moved.
 */
export const ORDER_STATUS_CLASS: Readonly<Record<OrderStatus, string>> = {
  CREATED: "text-rust",
  PAID: "text-moss",
  SHIPPED: "text-moss",
  DELIVERED: "text-moss",
  CANCELLED: "text-clay",
  REFUNDED: "text-clay",
};
