import Link from "next/link";

import { ProductTile } from "@/components/product-tile";
import { Button } from "@/components/ui/button";
import { countProducts } from "@/lib/catalog";
import { pickFeatured } from "@/lib/featured";

/**
 * Estado vazio da sacola de compras.
 * Exibe contagem de peças disponíveis no catálogo e sugestões de produtos em destaque.
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
