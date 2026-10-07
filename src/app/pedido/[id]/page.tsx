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
 * Página de acompanhamento de pedido.
 *
 * O pedido é carregado no servidor com seu status real. Quando o status é
 * CREATED, o cliente realiza polling até a confirmação do pagamento.
 */
export default async function OrderPage(props: PageProps<"/pedido/[id]">) {
  const [{ id }, { pagamento }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const order = await loadOrder(id);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        {/* Set by /checkout/cancel, and the only way this page can know that
            the buyer came back from Stripe without paying. Without it a
            cancelled order and one waiting on its webhook look identical, and
            the page would spend a minute confirming a payment that was never
            attempted. */}
        <OrderView
          initialOrder={order}
          cancelledAtProvider={pagamento === "cancelado"}
        />
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
