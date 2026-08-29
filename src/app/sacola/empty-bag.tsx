import Link from "next/link";

import { ProductTile } from "@/components/product-tile";
import { Button } from "@/components/ui/button";
import { countProducts } from "@/lib/catalog";
import { pickFeatured } from "@/lib/featured";

/**
 * Artboard 09. Centred, which §7 forbids everywhere except artboards 08 and
 * 09 — this is 09.
 *
 * The canvas reads `12 peças disponíveis`. Twelve is the catalogue's size
 * today rather than a fact about empty sacolas, so it comes from
 * `countProducts()`: the thirteenth piece changes this line without anyone
 * remembering to.
 */
export async function EmptyBag() {
  const [total, featured] = await Promise.all([
    countProducts(),
    pickFeatured(),
  ]);

  return (
    <section className="flex flex-col items-center gap-16 p-24 text-center">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-h1">Sua sacola está vazia</h1>

        <p className="type-meta text-muted">
          {total} {total === 1 ? "peça disponível" : "peças disponíveis"}
        </p>

        <Button asChild>
          <Link href="/catalogo">Ver o catálogo</Link>
        </Button>
      </div>

      {/* The tiles keep their own alignment: §7's exemption is for the
          centred block above, not licence to centre a product grid. */}
      <div className="grid w-full grid-cols-3 gap-6 text-left">
        {featured.map((product) => (
          <ProductTile
            key={product.id}
            slug={product.slug}
            name={product.name}
            priceCents={product.priceCents}
            stockQuantity={product.stockQuantity}
            showBadge={false}
          />
        ))}
      </div>
    </section>
  );
}
