import { redirect } from "next/navigation";

/**
 * Where Stripe sends the buyer after a successful hosted checkout:
 * `${APP_URL}/checkout/success?order=<id>`, built in the backend's
 * stripe-payment.provider.ts.
 *
 * It is a redirect and nothing else. Landing here is not proof of payment —
 * the webhook is — so this hands straight over to /pedido/[id], which polls
 * the order until it says PAID and renders the waiting state until then.
 */
export default async function CheckoutSuccessPage(
  props: PageProps<"/checkout/success">,
) {
  const { order } = await props.searchParams;

  redirect(typeof order === "string" ? `/pedido/${order}` : "/minha-conta/pedidos");
}
