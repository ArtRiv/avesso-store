import Link from "next/link";

import {
  Card,
  EmptyRow,
  PageHeader,
  TableFrame,
  Td,
  Th,
  Tr,
} from "@/components/admin/page-parts";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { requireAdminApi } from "@/lib/admin/session";
import {
  bucketRowLabel,
  formatWindow,
  periodQuery,
  readPeriod,
  type Granularity,
} from "@/lib/admin/reports";
import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import { formatBRL, formatOrderDate } from "@/lib/format";

import { PeriodFilters } from "./period-filters";

type Query = Record<string, string | string[] | undefined>;

type Carts = components["schemas"]["CartsReportResponse"];
type Revenue = components["schemas"]["RevenueReportResponse"];
type Sales = components["schemas"]["ProductSalesReportResponse"];
type Unsold = components["schemas"]["UnsoldProductsReportResponse"];

/**
 * Two tables on one screen, so ten rows each rather than the twenty Produtos
 * and Pedidos use. The screen is read top to bottom in one pass; a page of
 * twenty in each would turn that into scrolling past one table to reach the
 * other.
 */
const PER_PAGE = 10;

/**
 * The four reports, on one screen.
 *
 * Everything is read server-side through `requireAdminApi()`, and the period
 * lives in the query string — the pattern Produtos and Pedidos already use, and
 * the reason a window is a URL worth keeping rather than a state that dies with
 * the tab.
 *
 * Three facts about this screen are worth stating before reading the code:
 *
 * **Nothing here is computed.** No total, no average, no percentage, no
 * conversion. Every number rendered is a field the API sent. `revenueCents` has
 * no period sum on the response and none is made up for the header — see
 * README, "Divergências conhecidas", where that gap is recorded rather than
 * papered over.
 *
 * **Zero is the normal view.** The AVESSO has almost no sales, so the ordinary
 * state of this screen is zeros everywhere. Every empty state here names what
 * is empty and why, and none of them is a spinner, a shrug or a dash.
 *
 * **`reports.read` is not what opened the panel.** The layout's gate asks about
 * `products.read`; an operator can hold that, walk in, and be refused by all
 * four of these. That refusal is a state of this screen, not a crash.
 */
export default async function ReportsPage({
  searchParams,
}: PageProps<"/admin/relatorios">) {
  const params = await searchParams;
  const period = readPeriod(params);
  const pageVendas = Math.max(1, Number(params.pageVendas) || 1);
  const pageParadas = Math.max(1, Number(params.pageParadas) || 1);

  const api = await requireAdminApi();
  const window = periodQuery(period);

  const [carts, revenue, sales, unsold] = await Promise.all([
    attempt<Carts>(async () => unwrap(await api.GET("/reports/carts"))),
    attempt<Revenue>(async () =>
      unwrap(
        await api.GET("/reports/revenue", {
          params: { query: { ...window, granularity: period.granularity } },
        }),
      ),
    ),
    attempt<Sales>(async () =>
      unwrap(
        await api.GET("/reports/product-sales", {
          params: { query: { ...window, page: pageVendas, perPage: PER_PAGE } },
        }),
      ),
    ),
    attempt<Unsold>(async () =>
      unwrap(
        await api.GET("/reports/unsold-products", {
          params: { query: { ...window, page: pageParadas, perPage: PER_PAGE } },
        }),
      ),
    ),
  ]);

  // All four sit behind the same permission, so one 403 is four. Nothing on
  // this screen has anything to show, and pretending otherwise with four
  // separate failure lines would describe the situation four times.
  if ([carts, revenue, sales, unsold].some((r) => !r.ok && r.status === 403)) {
    return (
      <>
        <PageHeader title="Relatórios" />
        <NoPermission />
      </>
    );
  }

  // A 400 can only be the window, and the window is shared by the three
  // period-scoped reports. Sacolas has no period and survives it.
  const windowRefused = [revenue, sales, unsold].some(
    (r) => !r.ok && r.status === 400,
  );

  return (
    <>
      <PageHeader
        title="Relatórios"
        meta={
          revenue.ok ? (
            <span className="type-meta text-muted">
              {formatWindow(
                revenue.data.from,
                revenue.data.to,
                revenue.data.timeZone,
              )}{" "}
              · fim exclusivo · fuso {revenue.data.timeZone}
            </span>
          ) : null
        }
      />

      <PeriodFilters
        from={period.from}
        to={period.to}
        granularity={period.granularity}
      />

      <CartsCard result={carts} />

      {windowRefused ? (
        <WindowRefused />
      ) : (
        <>
          <RevenueCard result={revenue} granularity={period.granularity} />
          <SalesCard result={sales} params={params} />
          <UnsoldCard result={unsold} params={params} />
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------
   Reading a report without losing the reason it failed
   ---------------------------------------------------------------------- */

type Result<T> = { ok: true; data: T } | { ok: false; status: number };

/**
 * Only an `ApiError` is caught. Anything else — a network fault, a bug in this
 * file — goes to the error boundary, because a screen that swallows those
 * renders four polite failure lines and hides a real problem.
 */
async function attempt<T>(run: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, status: error.status };
    }

    throw error;
  }
}

function Unreadable() {
  return (
    <p className="py-8 text-center text-small text-muted">
      Este relatório não pôde ser lido agora. Recarregue a página.
    </p>
  );
}

/* -------------------------------------------------------------------------
   The two refusals
   ---------------------------------------------------------------------- */

function NoPermission() {
  return (
    <Card title="Sem permissão de relatórios">
      <p className="max-w-[560px] text-small text-muted">
        O painel abriu porque esta conta administra catálogo e pedidos. Os
        relatórios exigem <span className="font-mono text-[13px]">reports.read</span>,
        que é concedida direto no banco — não há tela que a conceda, aqui nem na
        API. Quem administra a loja precisa promover a conta.
      </p>
    </Card>
  );
}

function WindowRefused() {
  return (
    <Card title="Período recusado">
      <p className="max-w-[560px] text-small text-muted">
        O início precisa ser uma data válida e anterior ao fim. A API responde a
        uma janela impossível com uma recusa, e não com uma lista vazia — que
        seria lida como “nada aconteceu neste período”. Nada foi consultado.
      </p>
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Sacolas — the snapshot
   ---------------------------------------------------------------------- */

function CartsCard({ result }: { result: Result<Carts> }) {
  return (
    <Card
      title="Sacolas agora"
      note="Sem período: uma sacola não tem histórico, só presente. O checkout consome os itens e deixa a sacola viva e vazia, então o que se conta aqui são cestas em jogo."
    >
      {result.ok ? (
        <div className="flex flex-wrap gap-px bg-admin-hairline">
          <Tile
            value={result.data.unitCount}
            label="Peças"
            note="unidades, somando as quantidades"
          />
          <Tile
            value={result.data.lineCount}
            label="Linhas"
            note="uma por tamanho guardado"
          />
          <Tile
            value={result.data.cartCount}
            label="Sacolas"
            note="com pelo menos uma linha"
          />
        </div>
      ) : (
        <Unreadable />
      )}
    </Card>
  );
}

/**
 * A count, at the size the panel gives a heading.
 *
 * Archivo rather than the mono the design reserves for prices: this is a
 * quantity standing alone, not a column of figures to line up, and equal-width
 * digits make a large standalone number look loose. Zero is rendered in ink
 * like any other value — dimming it would say something the number does not.
 */
function Tile({
  value,
  label,
  note,
}: {
  value: number;
  label: string;
  note: string;
}) {
  return (
    <div className="flex min-w-[180px] flex-grow flex-col gap-1.5 bg-paper p-5">
      <span className="type-meta text-admin-dim">{label}</span>
      <span className="font-heading text-h2">{value}</span>
      <span className="text-[13px] text-muted">{note}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Receita — the chart, and the series written out
   ---------------------------------------------------------------------- */

function RevenueCard({
  result,
  granularity,
}: {
  result: Result<Revenue>;
  granularity: Granularity;
}) {
  if (!result.ok) {
    return (
      <Card title="Receita">
        <Unreadable />
      </Card>
    );
  }

  const { buckets, timeZone } = result.data;

  return (
    <Card
      title="Receita"
      note="Venda é pedido pago, enviado ou entregue, na data em que o dinheiro entrou. Criado, cancelado e reembolsado não são receita. Um período sem venda volta como zero, nunca como buraco."
    >
      <RevenueChart
        buckets={buckets}
        granularity={result.data.granularity}
        timeZone={timeZone}
      />

      {/* The chart is a picture; this is the reading. Every value in it is
          here in text, which is what keeps the numbers reachable without a
          pointer — and it is where the goods/freight split lives, since the
          chart has only one colour to spend. */}
      <details className="group">
        <summary className="type-meta w-fit cursor-pointer text-muted hover:text-rust">
          Ver a série em tabela
        </summary>
        <div className="pt-4">
          <TableFrame>
            <thead>
              <Tr>
                <Th>Período</Th>
                <Th className="w-[110px] text-right">Pedidos</Th>
                <Th className="w-[150px] text-right">Mercadoria</Th>
                <Th className="w-[130px] text-right">Frete</Th>
                <Th className="w-[150px] text-right">Receita</Th>
              </Tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <Tr key={bucket.periodStart}>
                  <Td className="text-[14px]">
                    {bucketRowLabel(bucket.periodStart, granularity)}
                  </Td>
                  <Td className="text-right font-mono text-[14px] tabular-nums">
                    {bucket.orderCount}
                  </Td>
                  <Td className="text-right font-mono text-[14px] tabular-nums text-muted">
                    {formatBRL(bucket.itemsSubtotalCents)}
                  </Td>
                  <Td className="text-right font-mono text-[14px] tabular-nums text-muted">
                    {formatBRL(bucket.shippingCents)}
                  </Td>
                  <Td className="text-right font-mono text-[14px] tabular-nums">
                    {formatBRL(bucket.revenueCents)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableFrame>
        </div>
      </details>
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Peças vendidas
   ---------------------------------------------------------------------- */

function SalesCard({
  result,
  params,
}: {
  result: Result<Sales>;
  params: Query;
}) {
  if (!result.ok) {
    return (
      <Card title="Peças vendidas">
        <Unreadable />
      </Card>
    );
  }

  const { items, total, page, perPage } = result.data;

  return (
    <Card
      title="Peças vendidas"
      note="Mais vendidas primeiro, agrupadas por peça e nomeadas pelo catálogo de hoje — renomear no meio do período não parte a linha em duas. Os tamanhos entram somados. A receita é só a mercadoria, ao preço congelado em cada linha do pedido; o frete não é atribuível a uma peça."
    >
      <TableFrame>
        <thead>
          <Tr>
            <Th>Peça</Th>
            <Th className="w-[110px] text-right">Pedidos</Th>
            <Th className="w-[120px] text-right">Unidades</Th>
            <Th className="w-[160px] text-right">Receita</Th>
          </Tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <EmptyRow colSpan={4}>Nenhuma peça vendida neste período.</EmptyRow>
          ) : (
            items.map((row) => (
              <Tr key={row.productId}>
                <Td>
                  <Link
                    href={`/admin/produtos/${row.productId}`}
                    className="group flex flex-col gap-1"
                  >
                    <span className="text-[15px] leading-tight group-hover:text-rust">
                      {row.name}
                    </span>
                    <span className="type-meta text-[11px] text-admin-dim">
                      {row.slug}
                    </span>
                  </Link>
                </Td>
                <Td className="text-right font-mono text-[14px] tabular-nums text-muted">
                  {row.orderCount}
                </Td>
                <Td className="text-right font-mono text-[14px] tabular-nums">
                  {row.unitsSold}
                </Td>
                <Td className="text-right font-mono text-[14px] tabular-nums">
                  {formatBRL(row.itemsRevenueCents)}
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </TableFrame>

      <Pages
        param="pageVendas"
        params={params}
        page={page}
        perPage={perPage}
        total={total}
        noun="peça vendida"
        nounPlural="peças vendidas"
      />
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Peças paradas
   ---------------------------------------------------------------------- */

function UnsoldCard({
  result,
  params,
}: {
  result: Result<Unsold>;
  params: Query;
}) {
  if (!result.ok) {
    return (
      <Card title="Peças paradas">
        <Unreadable />
      </Card>
    );
  }

  const { items, total, page, perPage } = result.data;

  return (
    <Card
      title="Peças paradas"
      note="Ativa, com estoque e sem venda na janela — as três condições juntas. Uma peça esgotada não aparece aqui: esgotada é o oposto de parada. Rascunho e arquivada também não, porque não estão à venda. Mais estoque primeiro: é a peça com mais capital parado que decide um desconto."
    >
      <TableFrame>
        <thead>
          <Tr>
            <Th>Peça</Th>
            <Th className="w-[120px] text-right">Estoque</Th>
            <Th className="w-[200px] text-right">Última venda</Th>
          </Tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <EmptyRow colSpan={3}>
              Nenhuma peça ativa com estoque passou o período sem vender.
            </EmptyRow>
          ) : (
            items.map((row) => (
              <Tr key={row.productId}>
                <Td>
                  <Link
                    href={`/admin/produtos/${row.productId}`}
                    className="group flex flex-col gap-1"
                  >
                    <span className="text-[15px] leading-tight group-hover:text-rust">
                      {row.name}
                    </span>
                    <span className="type-meta text-[11px] text-admin-dim">
                      {row.slug}
                    </span>
                  </Link>
                </Td>
                <Td className="text-right font-mono text-[14px] tabular-nums">
                  {row.stockQuantity}
                </Td>
                {/* `lastSoldAt` reaches outside the window on purpose — the
                    window holds no sale of this piece by definition. Never
                    sold is a different problem from stopped selling, and the
                    column says which one it is. */}
                <Td className="text-right text-[14px] text-muted">
                  {row.lastSoldAt ? (
                    <span className="font-mono text-[13px] tabular-nums">
                      {formatOrderDate(row.lastSoldAt)}
                    </span>
                  ) : (
                    <span className="text-admin-dim">Nunca vendeu</span>
                  )}
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </TableFrame>

      <Pages
        param="pageParadas"
        params={params}
        page={page}
        perPage={perPage}
        total={total}
        noun="peça parada"
        nounPlural="peças paradas"
      />
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Pagination, for two tables that share a URL
   ---------------------------------------------------------------------- */

/**
 * Each table carries its own page key, and every link rebuilds the whole query
 * string — so paging one table keeps the window, the granularity and the other
 * table's page exactly where they were.
 */
function Pages({
  param,
  params,
  page,
  perPage,
  total,
  noun,
  nounPlural,
}: {
  param: string;
  params: Query;
  page: number;
  perPage: number;
  total: number;
  noun: string;
  nounPlural: string;
}) {
  if (total === 0) {
    return null;
  }

  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex items-center justify-between">
      <span className="type-meta text-muted">
        {total} {total === 1 ? noun : nounPlural}
        {lastPage > 1 ? ` · página ${String(page)} de ${String(lastPage)}` : ""}
      </span>
      {lastPage > 1 ? (
        <div className="flex gap-2">
          {Array.from({ length: lastPage }, (_, index) => index + 1).map((n) => {
            const className = `flex size-9 items-center justify-center border font-mono text-[14px] tabular-nums ${
              n === page
                ? "border-ink text-ink"
                : "border-admin-hairline text-admin-dim hover:text-ink"
            }`;

            return n === page ? (
              <span key={n} aria-current="page" className={className}>
                {n}
              </span>
            ) : (
              <Link
                key={n}
                href={pageHref(params, param, n)}
                className={className}
              >
                {n}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function pageHref(params: Query, key: string, page: number): string {
  const query = new URLSearchParams();

  for (const [name, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(name, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        query.append(name, item);
      }
    }
  }

  query.set(key, String(page));

  return `?${query.toString()}`;
}
