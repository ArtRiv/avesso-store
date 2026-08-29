import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { unwrap } from "@/lib/api/client";
import { customerApi } from "@/lib/auth/session";
import type { components } from "@/lib/api/schema";

import { CheckoutHeader } from "./checkout-header";
import { CheckoutView } from "./checkout-view";

export const metadata: Metadata = {
  title: "Finalizar pedido · AVESSO",
  robots: { index: false, follow: false },
};

type Cart = components["schemas"]["CartResponse"];

/**
 * Artboard 07, and artboard 10 as a state of it.
 *
 * The sacola is read on the server so the page arrives with real lines and a
 * real subtotal. Everything after that — the CEP, the freight options, the
 * order — is a conversation with the API that only the browser can hold, so
 * the screen itself is a client component.
 *
 * There is no footer here and the header is stripped back (see
 * CheckoutHeader): the design gives this screen one thing to do.
 */
export default async function CheckoutPage() {
  const cart = await loadCart();

  return (
    <>
      <CheckoutHeader />
      <main className="flex flex-1 flex-col">
        <CheckoutView initialCart={cart} />
      </main>
    </>
  );
}

async function loadCart(): Promise<Cart> {
  const api = await customerApi();

  if (!api) {
    // No guest cart, so no guest checkout either — and unlike the product
    // page, there is nothing here to look at while signing in.
    redirect(`/entrar?next=${encodeURIComponent("/checkout")}`);
  }

  const cart = unwrap(await api.GET("/cart"));

  // Nothing to check out. The empty state is artboard 09 and it lives on
  // /sacola; a second one here would be the same screen twice. This is also
  // the landing after a successful order, since POST /orders consumes the
  // cart — a customer pressing back finds their sacola, not a dead form.
  if (cart.items.length === 0) {
    redirect("/sacola");
  }

  return cart;
}
