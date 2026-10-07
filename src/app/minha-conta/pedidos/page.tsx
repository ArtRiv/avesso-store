import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { unwrap } from "@/lib/api/client";
import { customerApi } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { formatBRL, formatOrderDate, formatOrderRef } from "@/lib/format";
import { ORDER_STATUS_CLASS, ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { components } from "@/lib/api/schema";

export const metadata: Metadata = {
  title: "Meus pedidos · AVESSO",
  robots: { index: false, follow: false },
};

type Order = components["schemas"]["OrderResponse"];
type Page = components["schemas"]["PaginatedOrdersResponse"];

const PER_PAGE = 20;

/**
 * Página de histórico de pedidos do cliente ("Meus pedidos").
 *
 * Exibe a listagem paginada de pedidos do usuário autenticado, com status,
 * data, total e itens resumidos. O endpoint `GET /orders` já é restrito
 * aos pedidos do próprio usuário pela sessão ativa.
 */
export default async function MyOrdersPage(
  props: PageProps<"/minha-conta/pedidos">,
) {
  const { pagina } = await props.searchParams;
  const page = pageNumber(pagina);
  const orders = await loadOrders(page);
  const lastPage = Math.max(1, Math.ceil(orders.total / PER_PAGE));

  return (
    <>
      <SiteHeader />

      <main className="flex flex-1 flex-col gap-8 px-24 py-16">
        <div className="flex items-baseline gap-4">
          <h1 className="text-h1">Meus pedidos</h1>
          <p className="type-meta text-muted">
            {orders.total} {orders.total === 1 ? "pedido" : "pedidos"}
          </p>
        </div>

        {orders.items.length === 0 ? (
          <NoOrders />
        ) : (
          <>
            <div className="border-t border-hairline">
              {orders.items.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>

            {lastPage > 1 ? (
              <Pagination page={page} lastPage={lastPage} />
            ) : null}
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

async function loadOrders(page: number): Promise<Page> {
  const api = await customerApi();

  if (!api) {
    redirect(`/entrar?next=${encodeURIComponent("/minha-conta/pedidos")}`);
  }

  return unwrap(
    await api.GET("/orders", { params: { query: { page, perPage: PER_PAGE } } }),
  );
}

/**
 * A page out of range is page one rather than an error. The number comes from
 * a URL anyone can type, and the backend clamps `perPage` for the same reason
 * — a bad query parameter is not worth a screen.
 */
function pageNumber(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);

  return Number.isInteger(value) && value > 0 ? value : 1;
}

/**
 * One order. The whole row is the link: the customer is looking for an order,
 * not for a word to click.
 *
 * `itemCount` does not exist on an order the way it does on a cart, so the
 * pieces are counted here — over a list that was frozen at checkout and cannot
 * change again. That is a count of a fixed snapshot rather than a rule about
 * what anything costs.
 */
function OrderRow({ order }: { order: Order }) {
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href={`/pedido/${order.id}`}
      className={cn(
        "grid grid-cols-[160px_1fr_200px_140px] items-center gap-6",
        "border-b border-hairline py-6 outline-none",
        "hover:bg-paper focus-visible:outline-1 focus-visible:outline-ink",
      )}
    >
      <span className="type-meta">#{formatOrderRef(order.id)}</span>

      <span className="flex flex-col gap-1">
        <span className="text-small">{formatOrderDate(order.createdAt)}</span>
        <span className="text-small text-muted">
          {pieces} {pieces === 1 ? "peça" : "peças"}
        </span>
      </span>

      <span className={cn("type-meta", ORDER_STATUS_CLASS[order.status])}>
        {ORDER_STATUS_LABEL[order.status]}
      </span>

      <span className="type-price text-right">
        {formatBRL(order.totalCents)}
      </span>
    </Link>
  );
}

function NoOrders() {
  return (
    <div className="flex flex-col items-start gap-6 border-t border-hairline pt-8">
      <p className="text-body text-muted">
        Você ainda não fez nenhum pedido. Quando fizer, ele aparece aqui com o
        status do pagamento e da entrega.
      </p>

      <Button asChild>
        <Link href="/catalogo">Ver o catálogo</Link>
      </Button>
    </div>
  );
}

/**
 * Paginação com navegação entre páginas anterior, numeradas e próxima.
 */
function Pagination({ page, lastPage }: { page: number; lastPage: number }) {
  const pages = Array.from({ length: lastPage }, (_, index) => index + 1);

  return (
    <nav className="type-meta flex items-center justify-between border-t border-hairline pt-6">
      <Step page={page - 1} enabled={page > 1} label="Anterior" />

      <ul className="flex gap-2">
        {pages.map((number) => (
          <li key={number}>
            <Link
              href={href(number)}
              aria-current={number === page ? "page" : undefined}
              className={cn(
                "flex size-8 items-center justify-center border outline-none",
                "focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2",
                number === page
                  ? "border-ink"
                  : "border-transparent text-muted hover:text-rust",
              )}
            >
              {number}
            </Link>
          </li>
        ))}
      </ul>

      <Step page={page + 1} enabled={page < lastPage} label="Próxima" />
    </nav>
  );
}

function Step({
  page,
  enabled,
  label,
}: {
  page: number;
  enabled: boolean;
  label: string;
}) {
  if (!enabled) {
    return <span className="text-muted">{label}</span>;
  }

  return (
    <Link
      href={href(page)}
      className="outline-none hover:text-rust focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2"
    >
      {label}
    </Link>
  );
}

function href(page: number): string {
  return page <= 1 ? "/minha-conta/pedidos" : `/minha-conta/pedidos?pagina=${String(page)}`;
}
