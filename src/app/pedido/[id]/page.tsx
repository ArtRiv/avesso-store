import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { customerApi } from "@/lib/auth/session";
import type { components } from "@/lib/api/schema";

import { OrderView } from "./order-view";

export const metadata: Metadata = {
  title: "Pedido · AVESSO",
  robots: { index: false, follow: false },
};

type Order = components["schemas"]["OrderResponse"];

/**
 * Artboard 08, both variants — which are one page in two states rather than
 * two screens. The order is fetched on the server so the page arrives with a
 * real status, and the client keeps asking only while that status is CREATED.
 *
 * Never renders a success state it has not verified: `PAID` comes from the
 * order, never from the fact that Stripe sent the buyer back here.
 */
export default async function OrderPage(props: PageProps<"/pedido/[id]">) {
  const { id } = await props.params;
  const order = await loadOrder(id);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <OrderView initialOrder={order} />
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * Kept apart from the JSX on purpose: a try/catch cannot catch an error thrown
 * while React renders, so wrapping the markup in one would only look like
 * error handling.
 */
async function loadOrder(id: string): Promise<Order> {
  const api = await customerApi();

  if (!api) {
    redirect(`/entrar?next=${encodeURIComponent(`/pedido/${id}`)}`);
  }

  try {
    return unwrap(await api.GET("/orders/{id}", { params: { path: { id } } }));
  } catch (error) {
    // 404 is "gone, or not yours" — the backend answers someone else's order
    // exactly as it answers one that never existed, so that guessing ids
    // reveals nothing. Rendering the same not-found page keeps that promise,
    // and the copy must never say "acesso negado".
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }

    throw error;
  }
}
