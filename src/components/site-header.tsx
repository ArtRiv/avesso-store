import Link from "next/link";

import { AccountIcon, BagIcon, SearchIcon } from "@/components/icons";
import { textLinkClass } from "@/components/text-link";
import { listCategories } from "@/lib/catalog";
import { hasSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * docs/design-system.md §2: 80px tall, a hairline underneath, 96px of side
 * padding, three blocks spaced apart — wordmark, categories in meta, then
 * Buscar / Conta / Sacola.
 *
 * The categories come from the API rather than a constant. They are the
 * store's navigation and the backend keeps them unpaginated for exactly this
 * purpose; hard-coding four names here would mean a fifth category never
 * appearing in the header of the store that owns it.
 */
export async function SiteHeader() {
  const [categories, signedIn] = await Promise.all([
    listCategories(),
    hasSession(),
  ]);

  return (
    <header className="flex h-20 flex-none items-center justify-between border-b border-hairline px-24">
      <Link
        href="/"
        className={cn(textLinkClass, "text-[20px] font-semibold tracking-[0.22em]")}
      >
        AVESSO
      </Link>

      <nav className="flex gap-8">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/catalogo?categoria=${category.slug}`}
            className={cn(textLinkClass, "type-meta")}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-6">
        <Link
          href="/catalogo"
          className={cn(textLinkClass, "type-meta flex items-center gap-2")}
        >
          <SearchIcon />
          Buscar
        </Link>

        <Link
          href={signedIn ? "/minha-conta/pedidos" : "/entrar"}
          className={cn(textLinkClass, "type-meta flex items-center gap-2")}
        >
          <AccountIcon />
          Conta
        </Link>

        {/*
          The design shows a piece count here — `Sacola (2)`. It is missing on
          purpose rather than by omission: `GET /cart` returns only `items`, so
          the only way to produce that number today is to sum quantities in the
          storefront, and an `itemCount` is in the cart-totals PR upstream for
          exactly that reason. When it lands this takes one prop.
        */}
        <Link
          href="/sacola"
          className={cn(textLinkClass, "type-meta flex items-center gap-2")}
        >
          <BagIcon />
          Sacola
        </Link>
      </div>
    </header>
  );
}
