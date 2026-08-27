import { redirect } from "next/navigation";

/**
 * Where Stripe sends the buyer who abandoned the hosted checkout:
 * `${APP_URL}/checkout/cancel?order=<id>`.
 *
 * The order exists and its stock is reserved — cancelling at Stripe does not
 * undo it — so the buyer goes to the order, where the recovery path is
 * POST /orders/:id/pay. Dropping them back on an empty sacola would be a lie
 * about what just happened.
 */
export default async function CheckoutCancelPage(
  props: PageProps<"/checkout/cancel">,
) {
  const { order } = await props.searchParams;

  redirect(typeof order === "string" ? `/pedido/${order}` : "/sacola");
}
