import { listCategories, listProducts } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";

/**
 * The three pieces the store puts in a window — the home page's `Em destaque`
 * row (artboard 02) and the empty sacola's 3-up (artboard 09).
 *
 * The API has no `featured` flag, and the canvas's own choice — one piece from
 * each of Camisetas, Moletons and Calças — is an editorial judgement rather
 * than data. Hard-coding three slugs would be this store's catalogue leaking
 * into its layout, so this reproduces the *rule* instead: the newest in-stock
 * piece from each of the three largest categories.
 *
 * Filtering on stock is the half that matters most: it keeps `Camiseta
 * Listrada Marinho` out: the catalogue's one sold-out piece is also the newest
 * in Camisetas, and a shop window of three should not lead with something
 * nobody can buy. It stays visible in the catalogue grid, greyed and struck,
 * which is where the design does want it. Reading `stockQuantity` to decide
 * that is reading data the API already hands over, not computing anything.
 *
 * Largest-first does *not* reproduce the canvas's trio, and cannot: it picks
 * Camisetas and Calças, then hits a tie between Moletons and Acessórios at two
 * pieces each, where the canvas chose Moletons. No rule over this data breaks
 * that tie — the canvas made an editorial choice, and an editorial choice is
 * not derivable from a catalogue. This picks a defensible window rather than
 * pretending otherwise. Curating it for real is a `featured` flag upstream;
 * it is recorded in README.md as a known divergence rather than faked here.
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
