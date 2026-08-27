import { redirect } from "next/navigation";

/**
 * Where Stripe sends the buyer who abandoned the hosted checkout:
 * `${APP_URL}/checkout/cancel?order=<id>`.
 *
 * The order exists and its stock is reserved — cancelling at Stripe does not
 * undo it — so the buyer goes to the order, where the recovery path is
 * POST /orders/:id/pay. Dropping them back on an empty sacola would be a lie
 * about what just happened.
 *
 * The marker on the way through is what stops the order page from claiming to
 * be confirming a payment that was never started. Nothing else can tell the
 * two apart: an order that has been abandoned at Stripe and one whose webhook
 * is seconds away are the same CREATED order with the same open session, and
 * only this redirect knows which one just walked in.
 */
export default async function CheckoutCancelPage(
  props: PageProps<"/checkout/cancel">,
) {
  const { order } = await props.searchParams;

  redirect(
    typeof order === "string"
      ? `/pedido/${order}?pagamento=cancelado`
      : "/sacola",
  );
}
