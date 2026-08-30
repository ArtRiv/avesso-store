import Link from "next/link";

import { PageHeader } from "@/components/admin/page-parts";
import { ChartLegend, RevenueChart } from "@/components/admin/revenue-chart";
import { StatusChip } from "@/components/admin/status-chip";
import { requireAdminApi } from "@/lib/admin/session";
import {
  bucketNoun,
  countInWords,
  GRANULARITY_LABEL,
  PERIOD_KEYS,
  PERIODS,
  periodQuery,
  periodRange,
  readPeriod,
  withinPhrase,
  zoneFormatter,
  type Granularity,
  type Period,
} from "@/lib/admin/reports";
import { unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { components } from "@/lib/api/schema";
import { formatBRL } from "@/lib/format";

type Query = Record<string, string | string[] | undefined>;

type Carts = components["schemas"]["CartsReportResponse"];
type Revenue = components["schemas"]["RevenueReportResponse"];
type Sales = components["schemas"]["ProductSalesReportResponse"];
type Unsold = components["schemas"]["UnsoldProductsReportResponse"];

/** Six rows each, so the two cards sit side by side without either scrolling. */
const PER_PAGE = 6;

/**
 * Four reads, four endpoints — Sacolas agora, Receita no tempo, Mais vendidas,
 * Peças paradas — as the artboard's own scope annotation puts it.
 *
 * Everything is read server-side through `requireAdminApi()`, and the period
 * lives in the query string, so a window is a URL worth keeping. The controls
 * are plain links rather than a client component: a segmented control that only
 * changes a query parameter is a set of links, and making it interactive would
 * ship JavaScript to do what an anchor already does.
 *
 * Three facts about this screen are worth stating before reading the code:
 *
 * **Nothing here is computed.** No total, no average, no percentage. Every
 * number rendered is a field the API sent. The artboard draws a four-figure
 * totals row above the chart — Receita, Itens, Frete, Pedidos — and
 * `RevenueReportResponse` has no window sum to fill it with. It is not summed
 * here; see README, "Divergências conhecidas", and the note the card carries
 * in its place.
 *
 * **Zero is the ordinary view.** The artboard's main state is the store with no
 * sales in the window, and every empty state here names what is empty and why.
 * The chart's zero markers are the load-bearing part: a measured zero has to
 * read as a measurement.
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
  // this screen has anything to show, and saying so four times would describe
  // the same situation four times.
  if ([carts, revenue, sales, unsold].some((r) => !r.ok && r.status === 403)) {
    return (
      <>
        <PageHeader title="Relatórios" />
        <NoPermission />
      </>
    );
  }

  const windowRefused = [revenue, sales, unsold].some(
    (r) => !r.ok && r.status === 400,
  );

  // The zone the instance keeps its books in — the only one in which the
  // window, the buckets and a piece's last sale agree with each other.
  const timeZone = revenue.ok ? revenue.data.timeZone : "UTC";

  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-h2">Relatórios</h1>
          <span className="type-meta text-muted">
            {revenue.ok
              ? `${periodRange(revenue.data, period.preset)} · fuso ${revenue.data.timeZone}`
              : "Período recusado"}
          </span>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Segments>
            {PERIOD_KEYS.map((key) => (
              <StatusChip
                key={key}
                href={segmentHref(params, { periodo: key })}
                active={period.preset === key}
              >
                {PERIODS[key].label}
              </StatusChip>
            ))}
          </Segments>
          <span className="text-[12px] text-admin-dim">
            O período vale para as três seções abaixo da faixa de sacolas.
          </span>
        </div>
      </div>

      <CartsBand result={carts} />

      {windowRefused ? (
        <WindowRefused />
      ) : (
        <>
          <RevenueCard result={revenue} params={params} period={period} />

          {/* Side by side, as the artboard lays them out: the two lists are
              complements of each other and are read against each other. */}
          <div className="grid grid-cols-2 items-start gap-6">
            <SalesCard result={sales} params={params} />
            <UnsoldCard result={unsold} params={params} timeZone={timeZone} />
          </div>
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
    <p className="px-7 py-12 text-small text-muted">
      Este relatório não pôde ser lido agora. Recarregue a página.
    </p>
  );
}

/* -------------------------------------------------------------------------
   The furniture the artboard draws
   ---------------------------------------------------------------------- */

/** A joined run of chips: one hairline between neighbours, not two. */
function Segments({ children }: { children: React.ReactNode }) {
  return <div className="flex [&>*+*]:-ml-px">{children}</div>;
}

/** A card in the artboard's shape: hairline, square, paper. */
function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex flex-col border border-admin-hairline bg-paper ${className ?? ""}`}
    >
      {children}
    </section>
  );
}

/** A card's heading strip, with room for a count or a control on the right. */
function PanelHead({
  title,
  note,
  aside,
  divided = true,
}: {
  title: string;
  note?: string;
  aside?: React.ReactNode;
  divided?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-6 px-7 py-6 ${
        divided ? "border-b border-admin-hairline" : ""
      }`}
    >
      <div className="flex flex-col gap-1.5">
        <span className="type-meta">{title}</span>
        {note ? <span className="text-[13px] text-muted">{note}</span> : null}
      </div>
      {aside}
    </div>
  );
}

/**
 * What a list says when it has nothing.
 *
 * Left-aligned and generous, the way the artboard draws it — a heading and a
 * sentence, in place of the table rather than inside it. Never a spinner and
 * never a dash: it names what is empty and what would fill it.
 */
function Blank({ title, children }: { title: string; children: string }) {
  return (
    <div className="flex flex-col items-start gap-2.5 px-7 py-14">
      <span className="font-heading text-h3">{title}</span>
      <span className="max-w-[420px] text-small text-muted">{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
   The two refusals
   ---------------------------------------------------------------------- */

function NoPermission() {
  return (
    <Panel>
      <PanelHead title="Sem permissão de relatórios" divided={false} />
      <p className="max-w-[560px] px-7 pb-7 text-small text-muted">
        O painel abriu porque esta conta administra catálogo e pedidos. Os
        relatórios exigem{" "}
        <span className="font-mono text-[13px]">reports.read</span>, que é
        concedida direto no banco — não há tela que a conceda, aqui nem na API.
        Quem administra a loja precisa promover a conta.
      </p>
    </Panel>
  );
}

function WindowRefused() {
  return (
    <Panel>
      <PanelHead title="Período recusado" divided={false} />
      <p className="max-w-[560px] px-7 pb-7 text-small text-muted">
        O início precisa ser uma data válida e anterior ao fim. A API responde a
        uma janela impossível com uma recusa, e não com uma lista vazia — que
        seria lida como “nada aconteceu neste período”. Nada foi consultado.
      </p>
    </Panel>
  );
}

/* -------------------------------------------------------------------------
   Sacolas agora — the snapshot, which ignores the period
   ---------------------------------------------------------------------- */

function CartsBand({ result }: { result: Result<Carts> }) {
  if (!result.ok) {
    return (
      <Panel>
        <Unreadable />
      </Panel>
    );
  }

  const { unitCount, lineCount, cartCount } = result.data;

  return (
    <Panel className="flex-row items-center justify-between px-7 py-6">
      <div className="flex gap-16">
        <Figure label="Unidades" value={unitCount} />
        <Figure label="Linhas" value={lineCount} />
        <Figure label="Sacolas" value={cartCount} />
      </div>
      <div className="flex max-w-[360px] flex-col items-end gap-1.5 text-right">
        <span className="type-meta text-muted">Sacolas abertas agora</span>
        <span className="text-[12px] text-admin-dim">
          Uma sacola só tem presente. Esta faixa não muda com o período.
        </span>
      </div>
    </Panel>
  );
}

/**
 * A count at the artboard's size: mono 28px, tabular, tightened.
 *
 * Zero is rendered in ink like any other value. Dimming it would say something
 * about the number that the number does not say about itself.
 */
function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="type-meta text-admin-dim">{label}</span>
      <span className="font-mono text-[28px] leading-[1.1] font-medium tracking-[-0.02em] tabular-nums">
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Receita no tempo
   ---------------------------------------------------------------------- */

function RevenueCard({
  result,
  params,
  period,
}: {
  result: Result<Revenue>;
  params: Query;
  period: Period;
}) {
  if (!result.ok) {
    return (
      <Panel>
        <PanelHead title="Receita no tempo" divided={false} />
        <Unreadable />
      </Panel>
    );
  }

  const { buckets, granularity, timeZone } = result.data;
  const quiet = buckets.every((bucket) => bucket.revenueCents === 0);
  const noun = bucketNoun(granularity, buckets.length);

  return (
    <Panel>
      <PanelHead
        title="Receita no tempo"
        note={`A série é contínua. ${
          granularity === "week"
            ? "Uma semana sem venda chega como R$ 0,00 e é desenhada como tal."
            : "Um mês sem venda chega como R$ 0,00 e é desenhado como tal."
        }`}
        divided={false}
        aside={
          <Segments>
            {(Object.keys(GRANULARITY_LABEL) as Granularity[]).map((key) => (
              <StatusChip
                key={key}
                href={segmentHref(params, { granularity: key })}
                active={granularity === key}
              >
                {GRANULARITY_LABEL[key]}
              </StatusChip>
            ))}
          </Segments>
        }
      />

      {/*
        Where the artboard's totals row goes.

        It draws four figures over the chart — Receita, Itens, Frete, Pedidos —
        and the canvas fills them by summing its own buckets in JavaScript.
        `RevenueReportResponse` carries `buckets` and no window sum, so there is
        nothing to fill them with, and adding them up here is the arithmetic on
        money that CLAUDE.md rules out. It is not a style choice: the spec never
        says whether a first or last bucket is clipped to the window or spills
        past it, so a sum computed here would be a second definition of
        "revenue in the period" that could disagree with the backend's first.

        So the row is not drawn, and the reason is on the screen rather than
        hidden in this comment. See README, "Divergências conhecidas".
      */}
      <p className="border-y border-admin-hairline px-7 py-5 text-[13px] text-muted">
        A resposta traz a receita de cada {bucketNoun(granularity, 1)} e não a
        soma da janela. Somar aqui criaria uma segunda definição de receita do
        período, então a linha de totais fica de fora até a API mandar a dela.
      </p>

      <div className="flex flex-col gap-6 px-7 py-6">
        {buckets.length === 0 ? (
          <p className="text-small text-muted">
            A janela não cobre nenhum período inteiro.
          </p>
        ) : (
          <>
            <RevenueChart
              buckets={buckets}
              granularity={granularity}
              timeZone={timeZone}
            />

            {/* The caption is one string rather than a row of expressions:
                React separates adjacent text nodes with comment markers, which
                would split the sentence in the delivered HTML. It reads better
                in the source this way too. */}
            {quiet ? (
              <p className="border-t border-admin-hairline pt-4 text-[13px] text-muted">
                {`Nenhuma venda ${withinPhrase(period.preset)}. A linha está desenhada sobre o zero — ${countInWords(buckets.length)} ${noun} ${measured(granularity, buckets.length)}, ${countInWords(buckets.length)} ${noun} em ${formatBRL(0)}.`}
              </p>
            ) : (
              <ChartLegend granularity={granularity} />
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------
   Mais vendidas
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
      <Panel>
        <PanelHead title="Mais vendidas" divided={false} />
        <Unreadable />
      </Panel>
    );
  }

  const { items, total, page, perPage } = result.data;

  return (
    <Panel>
      <PanelHead
        title="Mais vendidas"
        note="Por unidades no período."
        aside={<Count total={total} />}
      />

      {items.length === 0 ? (
        <Blank title="Nenhuma peça vendida">
          Não houve pedido pago no período. Quando houver, a lista aparece aqui
          ordenada por unidades.
        </Blank>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-admin-hairline">
              <Head>Peça</Head>
              <Head className="w-[90px] text-right">Un</Head>
              <Head className="w-[140px] text-right">Receita</Head>
              <Head className="w-[100px] text-right">Pedidos</Head>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.productId} className="border-b border-admin-hairline">
                <Cell>
                  <Link
                    href={`/admin/produtos/${row.productId}`}
                    className="text-[15px] leading-tight hover:text-rust"
                  >
                    {row.name}
                  </Link>
                </Cell>
                <Cell className="text-right font-mono text-[14px] font-medium tabular-nums">
                  {row.unitsSold}
                </Cell>
                {/*
                  Moss, as the artboard paints it. Not a second accent: §1
                  rations rust, and moss is already the store's colour for money
                  that arrived — the "Pago" badge is the same green.
                */}
                <Cell className="text-right font-mono text-[14px] font-medium tabular-nums text-moss">
                  {formatBRL(row.itemsRevenueCents)}
                </Cell>
                <Cell className="text-right font-mono text-[14px] font-medium tabular-nums text-muted">
                  {row.orderCount}
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pages
        param="pageVendas"
        params={params}
        page={page}
        perPage={perPage}
        total={total}
        shown={items.length}
      />
    </Panel>
  );
}

/* -------------------------------------------------------------------------
   Peças paradas
   ---------------------------------------------------------------------- */

function UnsoldCard({
  result,
  params,
  timeZone,
}: {
  result: Result<Unsold>;
  params: Query;
  timeZone: string;
}) {
  if (!result.ok) {
    return (
      <Panel>
        <PanelHead title="Peças paradas" divided={false} />
        <Unreadable />
      </Panel>
    );
  }

  const { items, total, page, perPage } = result.data;
  const formatDay = zoneFormatter(timeZone);

  return (
    <Panel>
      <PanelHead
        title="Peças paradas"
        note="Estoque que não saiu no período."
        aside={<Count total={total} />}
      />

      {items.length === 0 ? (
        <Blank title="Nenhuma peça parada">
          Toda peça ativa com estoque vendeu ao menos uma unidade no período.
          Uma peça esgotada não entra nesta conta: esgotada é o oposto de
          parada.
        </Blank>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-admin-hairline">
              <Head>Peça</Head>
              <Head className="w-[110px] text-right">Parado</Head>
              <Head className="w-[170px] text-right">Última venda</Head>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.productId} className="border-b border-admin-hairline">
                <Cell>
                  <Link
                    href={`/admin/produtos/${row.productId}`}
                    className="text-[15px] leading-tight hover:text-rust"
                  >
                    {row.name}
                  </Link>
                </Cell>
                <Cell className="text-right font-mono text-[14px] font-medium tabular-nums">
                  {row.stockQuantity}
                </Cell>
                {/*
                  `lastSoldAt` reaches outside the window on purpose — the
                  window holds no sale of this piece by definition. Never sold
                  is a different problem from stopped selling, and the column
                  says which one it is rather than printing a dash for both.
                */}
                <Cell className="text-right font-mono text-[14px] font-medium tabular-nums">
                  {row.lastSoldAt ? (
                    <span className="text-muted">
                      {formatDay(row.lastSoldAt)}
                    </span>
                  ) : (
                    <span className="text-admin-dim">Nunca vendeu</span>
                  )}
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pages
        param="pageParadas"
        params={params}
        page={page}
        perPage={perPage}
        total={total}
        shown={items.length}
      />
    </Panel>
  );
}

/* -------------------------------------------------------------------------
   Table parts, at the artboard's density
   ---------------------------------------------------------------------- */

function Head({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      className={`type-meta px-5 py-3.5 text-left font-medium text-admin-dim ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Cell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <td className={`px-5 py-3.5 align-middle ${className ?? ""}`}>{children}</td>;
}

/** `medidas` for weeks, `medidos` for months — the noun decides the ending. */
function measured(granularity: Granularity, n: number): string {
  const plural = n !== 1;

  return granularity === "week"
    ? (plural ? "medidas" : "medida")
    : (plural ? "medidos" : "medido");
}

function Count({ total }: { total: number }) {
  return (
    <span className="type-meta shrink-0 text-muted">
      {total} {total === 1 ? "peça" : "peças"}
    </span>
  );
}

/* -------------------------------------------------------------------------
   Query-string plumbing
   ---------------------------------------------------------------------- */

/**
 * Each table carries its own page key, and every link rebuilds the whole query
 * string — so paging one table keeps the window, the granularity and the other
 * table's page exactly where they were.
 *
 * `{shown} de {total}` is the artboard's own footer: what is on screen, out of
 * what matched. The count the server returns is of matching pieces, never of
 * the page.
 */
function Pages({
  param,
  params,
  page,
  perPage,
  total,
  shown,
}: {
  param: string;
  params: Query;
  page: number;
  perPage: number;
  total: number;
  shown: number;
}) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="flex items-center justify-between border-t border-admin-hairline px-5 py-4">
      <span
        className={`type-meta ${total === 0 ? "text-admin-dim" : "text-muted"}`}
      >
        {shown} de {total}
      </span>
      <div className="flex gap-2">
        {Array.from({ length: lastPage }, (_, index) => index + 1).map((n) => {
          const current = n === page;
          const className = `flex size-9 items-center justify-center border font-mono text-[14px] font-medium tabular-nums ${
            current && total > 0
              ? "border-ink text-ink"
              : "border-admin-hairline text-admin-dim hover:text-ink"
          }`;

          return current ? (
            <span key={n} aria-current="page" className={className}>
              {n}
            </span>
          ) : (
            <Link
              key={n}
              href={segmentHref(params, { [param]: String(n) })}
              className={className}
            >
              {n}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A URL with some parameters replaced.
 *
 * Changing the period or the bucket drops both page numbers: page 3 of the old
 * window is a different set of pieces, or nothing at all. Changing a page
 * number keeps everything else, including the other table's page.
 */
function segmentHref(params: Query, next: Record<string, string>): string {
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

  for (const [name, value] of Object.entries(next)) {
    query.set(name, value);
  }

  if ("periodo" in next) {
    // A preset is a whole window, so it also clears any hand-written dates the
    // URL was carrying — otherwise the segment would light up while the screen
    // kept showing the old window.
    query.delete("from");
    query.delete("to");
  }

  if ("periodo" in next || "granularity" in next) {
    query.delete("pageVendas");
    query.delete("pageParadas");
  }

  return `?${query.toString()}`;
}
