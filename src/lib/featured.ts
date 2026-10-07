import { listCategories, listProducts } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";

/**
 * Seleciona produtos em destaque para a home e para a sacola vazia.
 *
 * Como a API não possui uma flag `featured`, seleciona o produto mais recente
 * em estoque de cada uma das principais categorias.
 */
export const FEATURED_COUNT = 3;

export async function pickFeatured(): Promise<Product[]> {
  const categories = await listCategories();

  const largest = [...categories]
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, FEATURED_COUNT);

  const pages = await Promise.all(
    largest.map((category) =>
      listProducts({ category: category.slug, perPage: 12 }),
    ),
  );

  return pages
    .map((page) => page.items.find((item) => item.stockQuantity > 0))
    .filter((item): item is Product => item !== undefined);
}
