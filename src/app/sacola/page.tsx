import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { unwrap } from "@/lib/api/client";
import { customerApi } from "@/lib/auth/session";
import type { components } from "@/lib/api/schema";

import { CartView } from "./cart-view";
import { EmptyBag } from "./empty-bag";

export const metadata: Metadata = {
  title: "Sacola · AVESSO",
  robots: { index: false, follow: false },
};

type Cart = components["schemas"]["CartResponse"];

/**
 * Artboards 06 and 09 — one route in two states, chosen by whether the cart
 * has lines.
 *
 * There is no guest cart, so this page has no meaning without a session and
 * sends an anonymous visitor to sign in with a `next` back to here. That is
 * different from the product page, where a 401 becomes a panel and the page
 * stays put: there the customer is looking at something, here there is
 * nothing to look at.
 */
export default async function BagPage() {
  const cart = await loadCart();

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        {cart.items.length === 0 ? (
          <EmptyBag />
        ) : (
          <CartView initialCart={cart} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

/** Kept out of the JSX: a redirect is control flow, not markup. */
async function loadCart(): Promise<Cart> {
  const api = await customerApi();

  if (!api) {
    redirect(`/entrar?next=${encodeURIComponent("/sacola")}`);
  }

  // `GET /cart` always succeeds for an authenticated caller — a customer who
  // has never added anything gets an empty cart rather than a 404, because the
  // cart is created lazily on the first add and its absence is not an error.
  return unwrap(await api.GET("/cart"));
}
