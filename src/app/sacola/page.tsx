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
 * Página da sacola.
 *
 * Exibe a lista de itens ou o estado vazio quando o carrinho não possui peças.
 * Como não há carrinho de visitante, requer sessão e redireciona visitantes
 * anônimos para o login com retorno para cá.
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

  // Falhas na API (502/503) lançam ApiError via unwrap() e são capturadas
  // pelo boundary sacola/error.tsx.
  return unwrap(await api.GET("/cart"));
}
