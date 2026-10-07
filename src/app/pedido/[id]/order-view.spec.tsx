import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderView } from "./order-view";
import type { components } from "@/lib/api/schema";

type Order = components["schemas"]["OrderResponse"];

const mockPixOrder: Order = {
  id: "order-pix-1",
  userId: "user-1",
  buyer: null,
  status: "CREATED",
  itemsSubtotalCents: 10000,
  shippingCents: 1500,
  totalCents: 11500,
  items: [
    {
      productId: "p1",
      productName: "Camiseta Preta",
      variantId: "v1",
      variantLabel: "M",
      unitPriceCents: 10000,
      quantity: 1,
    },
  ],
  shippingLine1: "Avenida Paulista, 1000",
  shippingLine2: null,
  shippingStreet: "Avenida Paulista",
  shippingNumber: "1000",
  shippingComplement: null,
  shippingNeighborhood: "Bela Vista",
  shippingCity: "São Paulo",
  shippingState: "SP",
  shippingPostalCode: "01310-200",
  shippingMethodCode: "padrao",
  shippingMethodName: "Entrega padrão",
  shippingEtaDays: 3,
  trackingCode: null,
  trackingUrl: null,
  paymentRef: "asaas_pay_123",
  paymentUrl: null,
  paymentExpiresAt: null,
  paymentIntentRef: null,
  refundRef: null,
  refundedAt: null,
  paidAt: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  paymentMethod: "PIX",
  pixPayload: "00020126360014BR.GOV.BCB.PIX0114TESTE1234567890",
  pixQrCode: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
};

describe("OrderView with PIX payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders PIX payment block with QR code, Copia e Cola code, and instructions", () => {
    render(<OrderView initialOrder={mockPixOrder} cancelledAtProvider={false} />);

    expect(screen.getByText("Pagamento via PIX")).toBeInTheDocument();
    expect(screen.getAllByText("Aguardando pagamento")).toHaveLength(2);
    expect(screen.getByAltText("QR Code PIX")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("00020126360014BR.GOV.BCB.PIX0114TESTE1234567890"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copiar código PIX" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /já fiz o pagamento/i }),
    ).toBeInTheDocument();
  });

  it("copies PIX code to clipboard and updates button text", async () => {
    const user = userEvent.setup();

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    render(<OrderView initialOrder={mockPixOrder} cancelledAtProvider={false} />);

    const copyButton = screen.getByRole("button", { name: "Copiar código PIX" });
    await user.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith(
      "00020126360014BR.GOV.BCB.PIX0114TESTE1234567890",
    );
    expect(screen.getByRole("button", { name: "Copiado!" })).toBeInTheDocument();
  });

  it("renders Paid state when order is PAID", () => {
    const paidOrder: Order = {
      ...mockPixOrder,
      status: "PAID",
      paidAt: new Date().toISOString(),
    };

    render(<OrderView initialOrder={paidOrder} cancelledAtProvider={false} />);

    expect(screen.getAllByText("Pago")).toHaveLength(2);
    expect(screen.queryByText("Pagamento via PIX")).not.toBeInTheDocument();
  });
});
