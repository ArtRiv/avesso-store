import Link from "next/link";

import { Badge } from "@/components/badge";
import {
  EmptyRow,
  PageHeader,
  TableFrame,
  Td,
  Th,
  Tr,
} from "@/components/admin/page-parts";
import { VariantChip } from "@/components/admin/variant-chip";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { requireAdminApi } from "@/lib/admin/session";
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_TONE } from "@/lib/admin/status";
import { unwrap } from "@/lib/api/client";
import { formatBRL } from "@/lib/format";

import { ProductFilters } from "./product-filters";

const PER_PAGE = 20;

/** The four orderings the API offers, in the canvas's words. */
const SORTS = {
  newest: "Mais recentes",
  price_desc: "Maior preço",
  price_asc: "Menor preço",
  name_asc: "Nome A–Z",
} as const;

const STATUSES = {
  all: "Todos",
  ACTIVE: "Ativos",
  DRAFT: "Rascunhos",
  ARCHIVED: "Arquivados",
} as const;

type SortKey = keyof typeof SORTS;
type StatusKey = keyof typeof STATUSES;

function pick<T extends string>(
  raw: string | string[] | undefined,
  allowed: Readonly<Record<T, string>>,
  fallback: T,
): T {
  return typeof raw === "string" && raw in allowed ? (raw as T) : fallback;
}

/**
 * The catalogue as the operator sees it: every status, not just what the store
 * shows.
 *
 * `status` is the privileged half of this screen. `GET /products` is public and
 * privilege-aware — the filter REQUIRES `products.read` and is a 403 without
 * it rather than a silently narrowed listing — so this page cannot be rendered
 * by a customer even if they reach the URL. The layout has already asked that
 * question; this is the same answer arriving through the data.
 */
export default async function ProductsPage({
  searchParams,
}: PageProps<"/admin/produtos">) {
  const params = await searchParams;

  const search = typeof params.q === "string" ? params.q : "";
  const status = pick<StatusKey>(params.status, STATUSES, "all");
  const sort = pick<SortKey>(params.sort, SORTS, "newest");
  const page = Math.max(1, Number(params.page) || 1);

  const api = await requireAdminApi();
  const data = unwrap(
    await api.GET("/products", {
      params: {
        query: {
          status,
          sort,
          page,
          perPage: PER_PAGE,
          ...(search ? { search } : {}),
        },
      },
    }),
  );

  const lastPage = Math.max(1, Math.ceil(data.total / data.perPage));
  const drafts = data.items.filter((p) => p.status === "DRAFT").length;

  return (
    <>
      <PageHeader
        title="Produtos"
        meta={
          <span className="type-meta text-muted">
            {data.total} {data.total === 1 ? "peça" : "peças"}
            {drafts > 0 ? ` · ${String(drafts)} nesta página em rascunho` : ""}
          </span>
        }
      >
        <Button size="admin" disabled>
          Novo produto
        </Button>
      </PageHeader>

      <ProductFilters
        search={search}
        status={status}
        sort={sort}
        statuses={STATUSES}
        sorts={SORTS}
      />

      <TableFrame>
        <thead>
          <Tr>
            <Th>Produto</Th>
            <Th className="w-[120px]">Status</Th>
            <Th className="w-[300px]">Tamanhos</Th>
            <Th className="w-[100px] text-right">Estoque</Th>
            <Th className="w-[120px] text-right">Preço</Th>
          </Tr>
        </thead>
        <tbody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={5}>
              {search
                ? `Nenhuma peça com “${search}” no nome.`
                : "Nenhuma peça neste filtro."}
            </EmptyRow>
          ) : (
            data.items.map((product) => {
              const archived = product.status === "ARCHIVED";
              // A product carrying only `Único` never got a real size grid.
              // The canvas marks it, because it is a piece being sold without
              // one — the thing the variant routes now exist to fix.
              const unsized =
                product.variants.length === 1 &&
                product.variants[0].label === "Único";

              return (
                <Tr key={product.id}>
                  <Td>
                    <Link
                      href={`/admin/produtos/${product.id}`}
                      className="group flex items-center gap-3.5"
                    >
                      <ProductImage
                        slug={product.slug}
                        name={product.name}
                        showLabel={false}
                        className={`w-10 shrink-0 ${archived ? "opacity-50 grayscale" : ""}`}
                      />
                      <span className="flex flex-col gap-1">
                        <span
                          className={`text-[15px] leading-tight group-hover:text-rust ${archived ? "text-muted" : ""}`}
                        >
                          {product.name}
                        </span>
                        <span className="type-meta text-[11px] text-admin-dim">
                          {product.slug}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={PRODUCT_STATUS_TONE[product.status]}>
                      {PRODUCT_STATUS_LABEL[product.status]}
                    </Badge>
                  </Td>
                  <Td>
                    <div
                      className={`flex flex-wrap items-center gap-1.5 ${archived ? "opacity-50" : ""}`}
                    >
                      {unsized ? (
                        <>
                          <VariantChip label="Único" unsized />
                          <span className="type-meta text-[11px] text-rust">
                            Sem grade de tamanho
                          </span>
                        </>
                      ) : (
                        product.variants.map((variant) => (
                          <VariantChip
                            key={variant.id}
                            label={variant.label}
                            soldOut={variant.stockQuantity === 0}
                          />
                        ))
                      )}
                    </div>
                  </Td>
                  <Td
                    className={`text-right font-mono text-[14px] tabular-nums ${archived ? "text-muted" : ""}`}
                  >
                    {product.stockQuantity}
                  </Td>
                  <Td
                    className={`text-right font-mono text-[14px] tabular-nums ${archived ? "text-muted" : ""}`}
                  >
                    {formatBRL(product.priceCents)}
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </TableFrame>

      <Pagination page={data.page} lastPage={lastPage} total={data.total} />
    </>
  );
}

/**
 * `Anterior · N · Próxima` in the store's shape, driven by the query string so
 * the whole screen stays a server component.
 */
function Pagination({
  page,
  lastPage,
  total,
}: {
  page: number;
  lastPage: number;
  total: number;
}) {
  if (total === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <span className="type-meta text-muted">
        Página {page} de {lastPage} · {total} no total
      </span>
      {lastPage > 1 ? (
        <div className="flex gap-2">
          {Array.from({ length: lastPage }, (_, index) => index + 1).map((n) => (
            <PageLink key={n} n={n} current={n === page} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PageLink({ n, current }: { n: number; current: boolean }) {
  const className = `flex size-9 items-center justify-center border font-mono text-[14px] tabular-nums ${
    current
      ? "border-ink text-ink"
      : "border-admin-hairline text-admin-dim hover:text-ink"
  }`;

  // The current page is not a link — there is nowhere for it to go, and a
  // link that does nothing is a keyboard stop that wastes a press.
  return current ? (
    <span aria-current="page" className={className}>
      {n}
    </span>
  ) : (
    <Link href={{ query: { page: n } }} className={className}>
      {n}
    </Link>
  );
}
