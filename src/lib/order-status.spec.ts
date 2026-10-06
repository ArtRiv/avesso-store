import { describe, expect, it } from "vitest";
import { ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "./order-status";

describe("order-status", () => {
  it("defines friendly pt-BR labels for all order statuses", () => {
    expect(ORDER_STATUS_LABEL.CREATED).toBe("Aguardando pagamento");
    expect(ORDER_STATUS_LABEL.PAID).toBe("Pago");
    expect(ORDER_STATUS_LABEL.SHIPPED).toBe("Enviado");
    expect(ORDER_STATUS_LABEL.DELIVERED).toBe("Entregue");
    expect(ORDER_STATUS_LABEL.CANCELLED).toBe("Cancelado");
    expect(ORDER_STATUS_LABEL.REFUNDED).toBe("Reembolsado");
  });

  it("assigns appropriate color classes according to design system", () => {
    expect(ORDER_STATUS_CLASS.CREATED).toBe("text-rust");
    expect(ORDER_STATUS_CLASS.PAID).toBe("text-moss");
    expect(ORDER_STATUS_CLASS.SHIPPED).toBe("text-moss");
    expect(ORDER_STATUS_CLASS.DELIVERED).toBe("text-moss");
    expect(ORDER_STATUS_CLASS.CANCELLED).toBe("text-clay");
    expect(ORDER_STATUS_CLASS.REFUNDED).toBe("text-clay");
  });
});
