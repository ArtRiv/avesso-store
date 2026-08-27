import { redirect } from "next/navigation";

/**
 * The embedded-checkout return URL, `${APP_URL}/checkout/return?order=<id>`.
 *
 * This deployment runs STRIPE_CHECKOUT_MODE=hosted, so nothing reaches this
 * today. It exists because the mode is a per-deployment setting the storefront
 * does not control, and a store that flips it should not discover the missing
 * page through a 404 after a real payment.
 */
export default async function CheckoutReturnPage(
  props: PageProps<"/checkout/return">,
) {
  const { order } = await props.searchParams;

  redirect(typeof order === "string" ? `/pedido/${order}` : "/minha-conta/pedidos");
}
