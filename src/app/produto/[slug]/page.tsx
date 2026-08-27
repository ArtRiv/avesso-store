import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductTile } from "@/components/product-tile";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TextLink } from "@/components/text-link";
import { ToneBlock } from "@/components/tone-block";
import { formatBRL } from "@/lib/format";
import { getProduct, listProducts, type Product } from "@/lib/catalog";
import { toneFor } from "@/lib/product-tone";

import { AddToBag } from "./add-to-bag";

const RELATED_COUNT = 4;

/**
 * Care copy is store-level rather than per-product: the API carries one
 * free-text `description` and a weight, and nothing structured. See the note on
 * the specs table below.
 */
const CARE =
  "Lavar à máquina em água fria, secar à sombra, não usar alvejante";

export async function generateMetadata(
  props: PageProps<"/produto/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Peça não encontrada · AVESSO" };
  }

  return {
    title: `${product.name} · AVESSO`,
    description: product.description ?? undefined,
  };
}

/** Artboard 04. */
export default async function ProductPage(
  props: PageProps<"/produto/[slug]">,
) {
  const { slug } = await props.params;
  const product = await getProduct(slug);

  if (!product) {
    // 404 here means "no such piece, or it is not ACTIVE" — the backend
    // answers both identically so that probing slugs cannot reveal an
    // unreleased product.
    notFound();
  }

  const category = product.categories[0];
  const related = await findRelated(product);

  return (
    <>
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <nav
          aria-label="Trilha"
          className="type-meta border-b border-hairline px-24 py-6 text-muted"
        >
          <TextLink href="/catalogo">Catálogo</TextLink>
          {category ? (
            <>
              {" / "}
              <TextLink href={`/catalogo?categoria=${category.slug}`}>
                {category.name}
              </TextLink>
            </>
          ) : null}
          {" / "}
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid grid-cols-[7fr_5fr] items-start gap-16 px-24 py-16">
          {/* Three stacked images, not a carousel (§3). */}
          <div className="flex flex-col gap-6">
            <ToneBlock
              tone={toneFor(product.slug)}
              label={`${product.name} · frente`}
            />
            <ToneBlock tone="bone" label={`${product.name} · detalhe`} />
            <ToneBlock
              tone="ink-wash"
              label={`${product.name} · peça vestida`}
            />
          </div>

          <div className="sticky top-24 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="text-h1">{product.name}</h1>
              <p className="type-price">{formatBRL(product.priceCents)}</p>
            </div>

            {product.description ? (
              <p className="text-body">{product.description}</p>
            ) : null}

            <AddToBag
              productId={product.id}
              stockQuantity={product.stockQuantity}
            />

            <SpecTable product={product} categoryName={category?.name} />
          </div>
        </div>

        {related.length > 0 ? (
          <section className="flex flex-col gap-8 px-24 pb-24">
            <h2 className="text-h2 border-b border-hairline pb-4">
              Você também pode gostar
            </h2>
            <div className="grid grid-cols-4 gap-6">
              {related.map((item) => (
                <ProductTile
                  key={item.id}
                  slug={item.slug}
                  name={item.name}
                  priceCents={item.priceCents}
                  stockQuantity={item.stockQuantity}
                  showBadge={false}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Artboard 04 lists Composição, Modelagem, Peso and Cuidados.
 *
 * Only two of those can be told truthfully today. `weightGrams` is real,
 * per-product data. Composição and Modelagem are not fields the API has — they
 * live inside the free-text `description`, which is why the paragraph above
 * already says "100% algodão penteado, 240 g/m²" for the shirts. Repeating them
 * as structured rows would mean hard-coding shirt copy onto a cap and a pair of
 * socks, which is worse than a shorter table.
 *
 * Structured per-product attributes are a real backend gap and a fair upstream
 * candidate — every store's PDP has a spec table. It is recorded in README.md
 * rather than papered over with invented rows.
 *
 * The design's "310 g no tamanho M" loses its qualifier for the same reason:
 * there are no sizes yet, so naming one would be a claim about a variant that
 * does not exist.
 */
function SpecTable({
  product,
  categoryName,
}: {
  product: Product;
  categoryName?: string;
}) {
  const rows = [
    ...(categoryName ? [{ key: "Categoria", value: categoryName }] : []),
    ...(product.weightGrams !== null
      ? [{ key: "Peso", value: `${product.weightGrams} g` }]
      : []),
    { key: "Cuidados", value: CARE },
  ];

  return (
    <dl className="border-t border-hairline">
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[1fr_2fr] gap-6 border-b border-hairline py-4"
        >
          <dt className="type-meta text-muted">{row.key}</dt>
          <dd className="text-small">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Four more from the same category. The API has no recommendation engine and
 * inventing one here would be a rule this store owns that no other store could
 * reuse — same category is the honest, boring answer, and it is one query.
 */
async function findRelated(product: Product): Promise<Product[]> {
  const category = product.categories[0];

  if (!category) {
    return [];
  }

  const page = await listProducts({
    category: category.slug,
    perPage: RELATED_COUNT + 1,
  });

  return page.items
    .filter((item) => item.id !== product.id)
    .slice(0, RELATED_COUNT);
}
