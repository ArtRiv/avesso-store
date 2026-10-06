import type { Metadata } from "next";
import Link from "next/link";

import { ProductTile } from "@/components/product-tile";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TextLink } from "@/components/text-link";
import { ToneBlock } from "@/components/tone-block";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { countProducts, listCategories } from "@/lib/catalog";
import { pickFeatured } from "@/lib/featured";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

/**
 * Página inicial (Home) da loja.
 * Server Component: dados de produtos em destaque e categorias são lidos no servidor.
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
          <div className="absolute bottom-6 left-6 flex max-w-[720px] flex-col gap-6 md:bottom-12 md:left-12 lg:bottom-24 lg:left-24 lg:gap-8">
            <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.015em] text-pretty md:text-h2 lg:text-display">
              Doze peças. Feitas para durar anos.
            </h1>
            <Button asChild className="self-start">
              <Link href="/catalogo">Ver o catálogo</Link>
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-8 px-6 py-12 md:px-12 md:py-16 lg:p-24">
          <div className="flex items-baseline justify-between border-b border-hairline pb-4">
            <h2 className="text-h2">Em destaque</h2>
            {/* One of the four places §1 allows rust. */}
            <TextLink href="/catalogo" className="type-meta text-rust">
              Ver as {total} peças
            </TextLink>
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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

        <section className="px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-2 border-t border-b border-hairline md:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalogo?categoria=${category.slug}`}
                className="group flex flex-col gap-2 border-r border-hairline px-6 py-8 outline-none last:border-r-0 focus-visible:outline-1 focus-visible:outline-ink focus-visible:-outline-offset-1 max-md:[&:nth-child(2n)]:border-r-0"
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

        <section className="grid grid-cols-1 items-center gap-12 px-6 py-12 md:px-12 md:py-16 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:p-24">
          <ToneBlock tone="bone" label="Detalhe de malha · macro" />

          <div className="flex flex-col gap-8">
            <h2 className="type-meta text-muted">O tecido</h2>
            <p className="text-[24px] leading-[1.2] font-semibold tracking-[-0.01em] text-pretty md:text-h1">
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

        <section className="grid grid-cols-1 items-center gap-8 border-t border-b border-hairline px-6 py-12 md:px-12 md:py-16 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:px-24 lg:py-16">
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
