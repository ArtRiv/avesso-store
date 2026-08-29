import { redirect } from "next/navigation";

/**
 * Every transactional e-mail the backend sends links to
 * `${APP_URL}/orders/<id>` — see resend-mail.service.ts — while the design's
 * route is /pedido/[id]. Without this, every order e-mail lands on a 404.
 *
 * A redirect rather than a second implementation: routing is this repo's
 * business, and one order page with two doors is the whole of the fix.
 */
export default async function OrderEmailRedirect(
  props: PageProps<"/orders/[id]">,
) {
  const { id } = await props.params;

  redirect(`/pedido/${id}`);
}
