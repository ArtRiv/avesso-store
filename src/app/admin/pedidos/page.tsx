import Link from "next/link";

import {
  EmptyRow,
  PageHeader,
  TableFrame,
  Td,
  Th,
  Tr,
} from "@/components/admin/page-parts";
import { StatusChip } from "@/components/admin/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminApi } from "@/lib/admin/session";
import { ADMIN_ORDER_LABEL, ADMIN_ORDER_TONE } from "@/lib/admin/status";
import { unwrap } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatBRL, formatOrderRef } from "@/lib/format";

type Order = components["schemas"]["OrderResponse"];
type OrderStatus = Order["status"];

const PER_PAGE = 20;

const STATUSES = [
  "CREATED",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const satisfies readonly OrderStatus[];

/**
 * Every order in the store, which is what `orders.read` buys.
 *
 * Without that permission `GET /orders` silently narrows to the caller's own —
 * there is no way to ask for anyone else's — so this screen shows what it
 * shows because of who is asking, not because of a parameter. The layout has
 * already established that; this is the same fact arriving as data.
 *
 * The status rail is six links rather than a dropdown: the six states are the
 * spine of this screen, and an operator wants to see all of them at once, with
 * the one they are in marked. Status counts arrive directly on the paginated
 * response via `statusCounts`.
 */
export default async function OrdersPage({
  searchParams,
}: PageProps<"/admin/pedidos">) {
  const params = await searchParams;

  const raw = typeof params.status === "string" ? params.status : "";
  const status = (STATUSES as readonly string[]).includes(raw)
    ? (raw as OrderStatus)
    : null;
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const page = Math.max(1, Number(params.page) || 1);

  const api = await requireAdminApi();
  const data = unwrap(
    await api.GET("/orders", {
      params: {
        query: {
          page,
          perPage: PER_PAGE,
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
        },
      },
    }),
  );

  const lastPage = Math.max(1, Math.ceil(data.total / data.perPage));

  return (
    <>
      <PageHeader
        title="Pedidos"
        meta={
          <span className="type-meta text-muted">
            {data.total} {data.total === 1 ? "pedido" : "pedidos"}
            {status ? ` em ${ADMIN_ORDER_LABEL[status].toLowerCase()}` : ""}
            {search ? ` para "${search}"` : ""}
          </span>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
          <StatusChip
            href={search ? `/admin/pedidos?search=${encodeURIComponent(search)}` : "/admin/pedidos"}
            active={status === null}
          >
            Todos ({data.statusCounts.all})
          </StatusChip>
          {STATUSES.map((value) => (
            <StatusChip
              key={value}
              href={`/admin/pedidos?status=${value}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              active={status === value}
              tone={ADMIN_ORDER_TONE[value]}
            >
              {ADMIN_ORDER_LABEL[value]} ({data.statusCounts[value] ?? 0})
            </StatusChip>
          ))}
        </nav>

        <form method="GET" action="/admin/pedidos" className="flex items-center gap-2">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <Input
            name="search"
            defaultValue={search}
            placeholder="Buscar por nº ou cliente..."
            inputSize="admin"
            className="w-56 font-mono text-[13px]"
          />
          <Button type="submit" variant="secondary" size="admin">
            Buscar
          </Button>
          {search ? (
            <Link
              href={status ? `/admin/pedidos?status=${status}` : "/admin/pedidos"}
              className="type-meta text-[11px] text-muted hover:text-rust"
            >
              Limpar
            </Link>
          ) : null}
        </form>
      </div>

      <TableFrame>
        <thead>
          <Tr>
            <Th className="w-[140px]">Pedido</Th>
            <Th>Cliente</Th>
            <Th>Itens</Th>
            <Th className="w-[150px]">Status</Th>
            <Th className="w-[130px] text-right">Total</Th>
            <Th className="w-[120px] text-right">Data</Th>
          </Tr>
        </thead>
        <tbody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={6}>
              {search
                ? `Nenhum pedido encontrado para "${search}".`
                : status
                  ? `Nenhum pedido em ${ADMIN_ORDER_LABEL[status].toLowerCase()}.`
                  : "Nenhum pedido ainda."}
            </EmptyRow>
          ) : (
            data.items.map((order) => (
              <Tr key={order.id}>
                <Td>
                  <Link
                    href={`/admin/pedidos/${order.id}`}
                    className="font-mono text-[14px] tabular-nums hover:text-rust"
                  >
                    #{formatOrderRef(order.id)}
                  </Link>
                </Td>
                <Td>
                  <Buyer buyer={order.buyer} />
                </Td>
                <Td className="text-[14px] leading-snug text-muted">
                  <Items items={order.items} />
                </Td>
                <Td>
                  <StatusChip
                    as="span"
                    active={false}
                    tone={ADMIN_ORDER_TONE[order.status]}
                    compact
                  >
                    {ADMIN_ORDER_LABEL[order.status]}
                  </StatusChip>
                </Td>
                <Td
                  className={`text-right font-mono text-[14px] tabular-nums ${
                    order.status === "CANCELLED" || order.status === "REFUNDED"
                      ? "text-muted"
                      : ""
                  }`}
                >
                  {formatBRL(order.totalCents)}
                </Td>
                <Td className="text-right font-mono text-[13px] tabular-nums text-muted">
                  {shortDate(order.createdAt)}
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </TableFrame>

      {data.total > 0 ? (
        <div className="flex items-center justify-between">
          <span className="type-meta text-muted">
            Página {data.page} de {lastPage} · {data.total} no total
          </span>
          {lastPage > 1 ? (
            <div className="flex gap-2">
              {Array.from({ length: lastPage }, (_, i) => i + 1).map((n) => (
                <PageLink
                  key={n}
                  n={n}
                  current={n === data.page}
                  status={status}
                  search={search}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * Who bought.
 *
 * `buyer` is null for a caller without `orders.read` — which cannot happen on
 * this screen, since the layout would not have rendered it — and `name` is null
 * for an account created through Google, which never passed through
 * registration. The e-mail is the fallback because it always exists and it is
 * what an operator would search for anyway.
 */
function Buyer({ buyer }: { buyer: Order["buyer"] }) {
  if (!buyer) {
    return <span className="text-[14px] text-admin-dim">—</span>;
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="text-[15px] leading-tight">
        {buyer.name ?? buyer.email}
      </span>
      {buyer.name ? (
        <span className="type-meta text-[11px] tracking-normal text-admin-dim normal-case">
          {buyer.email}
        </span>
      ) : null}
    </span>
  );
}

/** The first line, with the rest folded into a count. */
function Items({ items }: { items: Order["items"] }) {
  const [first, ...rest] = items;

  if (!first) {
    return <span className="text-admin-dim">—</span>;
  }

  return (
    <>
      {first.productName} ·{" "}
      <span className="font-mono text-[13px]">{first.variantLabel}</span> ×
      {first.quantity}
      {rest.length > 0 ? (
        <span className="text-admin-dim"> +{rest.length}</span>
      ) : null}
    </>
  );
}

function PageLink({
  n,
  current,
  status,
  search,
}: {
  n: number;
  current: boolean;
  status: OrderStatus | null;
  search?: string;
}) {
  const className = `flex size-9 items-center justify-center border font-mono text-[14px] tabular-nums ${
    current
      ? "border-ink text-ink"
      : "border-admin-hairline text-admin-dim hover:text-ink"
  }`;

  return current ? (
    <span aria-current="page" className={className}>
      {n}
    </span>
  ) : (
    <Link
      href={{
        query: {
          page: n,
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
        },
      }}
      className={className}
    >
      {n}
    </Link>
  );
}

const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

function shortDate(iso: string): string {
  return dayMonth.format(new Date(iso));
}
