import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutView } from "./checkout-view";
import type { components } from "@/lib/api/schema";

type Cart = components["schemas"]["CartResponse"];

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

const mockCart: Cart = {
  items: [
    {
      variantId: "v1",
      quantity: 2,
      product: {
        id: "p1",
        name: "Camiseta Preta",
        slug: "camiseta-preta",
        priceCents: 10000,
        status: "ACTIVE",
        weightGrams: null,
      },
      variant: {
        id: "v1",
        label: "M",
        position: 1,
        stockQuantity: 10,
      },
    },
  ],
  itemsSubtotalCents: 20000,
  itemCount: 2,
};

const mockQuoteResponse = {
  itemsSubtotalCents: 20000,
  options: [
    {
      code: "padrao-sudeste",
      label: "Entrega padrão",
      priceCents: 1990,
      estimatedDays: 5,
      carrier: "Correios",
      orderTotalCents: 21990,
    },
    {
      code: "expressa-sudeste",
      label: "Entrega expressa",
      priceCents: 3990,
      estimatedDays: 2,
      carrier: "Sedex",
      orderTotalCents: 23990,
    },
  ],
};

describe("CheckoutView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders address form, checkout sections, and initial disabled submit button", () => {
    render(<CheckoutView initialCart={mockCart} />);

    expect(screen.getByRole("heading", { name: "Finalizar pedido" })).toBeInTheDocument();
    expect(screen.getByLabelText(/cep/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/endereço/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/número/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bairro/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cidade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/uf/i)).toBeInTheDocument();

    const checkoutButton = screen.getByRole("button", {
      name: /finalizar pedido/i,
    });
    expect(checkoutButton).toBeDisabled();
    expect(
      screen.getByText("Informe o endereço de entrega para finalizar."),
    ).toBeInTheDocument();
  });

  it("formats CEP with mask and triggers address lookup and shipping quote on 8 digits", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/shipping/cep/01310200")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              street: "Avenida Paulista",
              neighborhood: "Bela Vista",
              city: "São Paulo",
              state: "SP",
            }),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/shipping/quote")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockQuoteResponse),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(<CheckoutView initialCart={mockCart} />);

    const cepInput = screen.getByLabelText(/cep/i);
    await user.type(cepInput, "01310200");

    expect(cepInput).toHaveValue("01310-200");

    await waitFor(() => {
      expect(screen.getByLabelText(/endereço/i)).toHaveValue("Avenida Paulista");
      expect(screen.getByLabelText(/bairro/i)).toHaveValue("Bela Vista");
      expect(screen.getByLabelText(/cidade/i)).toHaveValue("São Paulo");
      expect(screen.getByLabelText(/uf/i)).toHaveValue("SP");
    });

    // Check freight options rendered
    await waitFor(() => {
      expect(screen.getByText("Entrega padrão")).toBeInTheDocument();
      expect(screen.getByText("Entrega expressa")).toBeInTheDocument();
    });
  });

  it("enables checkout button when address is complete and freight option selected", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/shipping/cep/01310200")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              street: "Avenida Paulista",
              neighborhood: "Bela Vista",
              city: "São Paulo",
              state: "SP",
            }),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/shipping/quote")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockQuoteResponse),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(<CheckoutView initialCart={mockCart} />);

    await user.type(screen.getByLabelText(/cep/i), "01310200");

    await waitFor(() => {
      expect(screen.getByLabelText(/endereço/i)).toHaveValue("Avenida Paulista");
    });

    const numberInput = screen.getByLabelText(/número/i);
    await user.type(numberInput, "1000");

    await waitFor(() => {
      const checkoutButton = screen.getByRole("button", {
        name: /finalizar pedido/i,
      });
      expect(checkoutButton).not.toBeDisabled();
    });
  });

  it("submits order and redirects to payment url", async () => {
    const user = userEvent.setup();

    const locationMock = { href: "" };
    Object.defineProperty(window, "location", {
      value: locationMock,
      writable: true,
      configurable: true,
    });

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/shipping/cep/01310200")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              street: "Avenida Paulista",
              neighborhood: "Bela Vista",
              city: "São Paulo",
              state: "SP",
            }),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/shipping/quote")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockQuoteResponse),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/orders") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: "order-123",
              payment: {
                mode: "hosted",
                url: "https://checkout.stripe.com/pay/cs_test_123",
              },
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(<CheckoutView initialCart={mockCart} />);

    await user.type(screen.getByLabelText(/cep/i), "01310200");
    await waitFor(() => {
      expect(screen.getByLabelText(/endereço/i)).toHaveValue("Avenida Paulista");
    });

    await user.type(screen.getByLabelText(/número/i), "1000");

    const checkoutButton = await screen.findByRole("button", {
      name: /finalizar pedido/i,
    });
    await user.click(checkoutButton);

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/pay/cs_test_123");
    });
  });

  it("handles 409 conflict when item is out of stock", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/shipping/cep/01310200")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              street: "Avenida Paulista",
              neighborhood: "Bela Vista",
              city: "São Paulo",
              state: "SP",
            }),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/shipping/quote")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockQuoteResponse),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/orders") && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ message: "Item out of stock" }),
        } as Response);
      }

      if (typeof url === "string" && url.endsWith("/api/cart")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: [
                {
                  ...mockCart.items[0],
                  variant: {
                    ...mockCart.items[0].variant,
                    stockQuantity: 0,
                  },
                },
              ],
              itemsSubtotalCents: 20000,
              itemCount: 2,
            }),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/cart/items/")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              items: [],
              itemsSubtotalCents: 0,
              itemCount: 0,
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(<CheckoutView initialCart={mockCart} />);

    await user.type(screen.getByLabelText(/cep/i), "01310200");
    await waitFor(() => {
      expect(screen.getByLabelText(/endereço/i)).toHaveValue("Avenida Paulista");
    });

    await user.type(screen.getByLabelText(/número/i), "1000");

    const checkoutButton = await screen.findByRole("button", {
      name: /finalizar pedido/i,
    });
    await user.click(checkoutButton);

    await waitFor(() => {
      expect(screen.getByText("Esgotado")).toBeInTheDocument();
    });
  });

  it("renders PIX and Credit Card payment methods and allows selection", async () => {
    const user = userEvent.setup();

    render(<CheckoutView initialCart={mockCart} />);

    const pixButton = screen.getByRole("button", { name: /pix/i });
    const cardButton = screen.getByRole("button", { name: /cartão de crédito/i });

    expect(pixButton).toBeInTheDocument();
    expect(cardButton).toBeInTheDocument();
    expect(pixButton).toHaveAttribute("aria-pressed", "true");
    expect(cardButton).toHaveAttribute("aria-pressed", "false");

    await user.click(cardButton);
    expect(cardButton).toHaveAttribute("aria-pressed", "true");
    expect(pixButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/checkout seguro do mercado pago/i)).toBeInTheDocument();

    await user.click(pixButton);
    expect(pixButton).toHaveAttribute("aria-pressed", "true");
    expect(cardButton).toHaveAttribute("aria-pressed", "false");
  });

  it("submits order with PIX and navigates to order page", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.includes("/api/shipping/cep/01310200")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              street: "Avenida Paulista",
              neighborhood: "Bela Vista",
              city: "São Paulo",
              state: "SP",
            }),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/shipping/quote")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockQuoteResponse),
        } as Response);
      }

      if (typeof url === "string" && url.includes("/api/orders") && init?.method === "POST") {
        const parsed = JSON.parse(init.body as string) as { paymentMethod?: string };
        expect(parsed.paymentMethod).toBe("PIX");

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: "order-pix-456",
              paymentMethod: "PIX",
              pixPayload: "00020126360014BR.GOV.BCB.PIX...",
              payment: {
                mode: "hosted",
                url: null,
              },
            }),
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(<CheckoutView initialCart={mockCart} />);

    await user.type(screen.getByLabelText(/cep/i), "01310200");
    await waitFor(() => {
      expect(screen.getByLabelText(/endereço/i)).toHaveValue("Avenida Paulista");
    });

    await user.type(screen.getByLabelText(/número/i), "1000");

    const checkoutButton = await screen.findByRole("button", {
      name: /finalizar pedido/i,
    });
    await user.click(checkoutButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/pedido/order-pix-456");
    });
  });
});

