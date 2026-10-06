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
 * Página de checkout.
 *
 * O carrinho é lido no servidor para que a página chegue ao cliente com linhas
 * e subtotal reais. Tudo após isso — CEP, cotação de frete, finalização do
 * pedido — é uma conversa com a API que apenas o browser pode conduzir, por
 * isso a tela em si é um Client Component.
 *
 * Sem rodapé e com header simplificado (ver CheckoutHeader): esta tela tem
 * uma única função.
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
    // Sem carrinho para visitantes — e diferente da página de produto, não há
    // nada aqui para visualizar enquanto não há sessão.
    redirect(`/entrar?next=${encodeURIComponent("/checkout")}`);
  }

  // A ApiError lançada por unwrap() em caso de falha (502/503) é capturada
  // pelo boundary checkout/error.tsx, que redireciona para /sacola.
  const cart = unwrap(await api.GET("/cart"));

  // Carrinho vazio — redireciona para /sacola, que exibe o estado vazio.
  // É também o destino após um pedido bem-sucedido: POST /orders consome o
  // carrinho, então pressionar voltar leva à sacola e não a um formulário vazio.
  if (cart.items.length === 0) {
    redirect("/sacola");
  }

  return cart;
}
