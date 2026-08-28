import { PageHeader } from "@/components/admin/page-parts";

/**
 * Placeholder, and partly blocked rather than merely unbuilt.
 *
 * `GET /orders` already lists everything for a caller with `orders.read`, so
 * the table itself is buildable today. The `Cliente` column is not: an order
 * carries `userId` and nothing else about who bought, and the field that fixes
 * it — `buyer` — is commerce-core#24, open. Showing a truncated UUID in the
 * meantime was considered and rejected; see README, "Divergências conhecidas".
 */
export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Pedidos" />
      <p className="max-w-prose text-small text-muted">
        Em construção, e a coluna <span className="font-mono text-[13px]">Cliente</span>{" "}
        depende de um campo que ainda não foi implantado: o pedido hoje carrega
        só o id do comprador. O PR está aberto no commerce-core.
      </p>
    </>
  );
}
