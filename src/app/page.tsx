import type { Metadata } from "next";
import Link from "next/link";

import { ProductTile } from "@/components/product-tile";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TextLink } from "@/components/text-link";
import { ToneBlock } from "@/components/tone-block";
import { Button } from "@/components/ui/button";
import { countProducts, listCategories, listProducts } from "@/lib/catalog";
import type { Product } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "AVESSO — básicos unissex feitos para durar",
  description:
    "Doze peças de algodão pesado, em lotes pequenos. Camisetas, moletons, calças e acessórios.",
};

/**
 * Artboard 02. A server component: the catalogue is fetched on the server, so
 * the browser never learns the API's origin and the page arrives whole.
 */
export default async function HomePage() {
  const [featured, categories, total] = await Promise.all([
    pickFeatured(),
    listCategories(),
    countProducts(),
  ]);

  return (
    <>
      <SiteHeader />

      <main className="flex flex-1 flex-col">
        <section className="relative flex-none">
          <ToneBlock
            tone="stone"
            label="Foto de campanha · 16:9 · dois modelos, fundo cru"
            aspect="aspect-video"
            className="border-x-0 border-t-0"
          />
          <div className="absolute bottom-24 left-24 flex max-w-[720px] flex-col gap-8">
            <h1 className="text-display text-pretty">
              Doze peças. Feitas para durar anos.
            </h1>
            <Button asChild className="self-start">
              <Link href="/catalogo">Ver o catálogo</Link>
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-8 p-24">
          <div className="flex items-baseline justify-between border-b border-hairline pb-4">
            <h2 className="text-h2">Em destaque</h2>
            {/* One of the four places §1 allows rust. */}
            <TextLink href="/catalogo" className="type-meta text-rust">
              Ver as {total} peças
            </TextLink>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {featured.map((product) => (
              <ProductTile
                key={product.id}
                slug={product.slug}
                name={product.name}
                priceCents={product.priceCents}
                stockQuantity={product.stockQuantity}
              />
            ))}
          </div>
        </section>

        <section className="px-24">
          <div className="grid grid-cols-4 border-t border-b border-hairline">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalogo?categoria=${category.slug}`}
                className="group flex flex-col gap-2 border-r border-hairline px-6 py-8 outline-none last:border-r-0 focus-visible:outline-1 focus-visible:outline-ink focus-visible:-outline-offset-1"
              >
                <span className="text-h3 group-hover:text-rust">
                  {category.name}
                </span>
                <span className="type-meta text-muted">
                  {category.productCount}{" "}
                  {category.productCount === 1 ? "peça" : "peças"}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-[5fr_7fr] items-center gap-16 p-24">
          <ToneBlock tone="bone" label="Detalhe de malha · macro" />

          <div className="flex flex-col gap-8">
            <h2 className="type-meta text-muted">O tecido</h2>
            <p className="text-h1 text-pretty">
              Algodão de 240 g/m², em malha compacta que não perde a forma na
              cinquentésima lavagem.
            </p>
            <p className="text-body max-w-[560px]">
              Trabalhamos com um único fornecedor em Santa Catarina e com uma
              facção em São Paulo. A malha é penteada, pré-encolhida e tingida
              em lotes pequenos, o que limita as cores e é justamente o motivo
              de o catálogo ser curto.
            </p>
            <p className="text-small text-muted">
              Cada peça sai com etiqueta de rastreio do lote de tingimento.
            </p>
          </div>
        </section>

        {/*
          Artboard 02 puts a newsletter field and an `Assinar` button here.
          There is no endpoint behind either, and inventing one upstream would
          be generality ahead of need — so the band keeps its place and its
          rhythm, and says something true instead of collecting an address
          nothing would ever read. Recorded in README.md.
        */}
        <section className="grid grid-cols-[5fr_7fr] items-center gap-16 border-t border-b border-hairline px-24 py-16">
          <h2 className="text-h3">Reposição em lotes pequenos</h2>
          <p className="text-body max-w-[560px]">
            As peças voltam conforme os lotes de tingimento saem da facção. Não
            mantemos lista de espera: quando uma peça volta, ela aparece no
            catálogo.
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * The three pieces on the home page.
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
const FEATURED_COUNT = 3;

async function pickFeatured(): Promise<Product[]> {
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
