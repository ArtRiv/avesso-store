import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { AccountIcon, BagIcon, SearchIcon } from "@/components/icons";
import { textLinkClass } from "@/components/text-link";
import { listCategories } from "@/lib/catalog";
import {
  customerApi,
  hasSession,
  sessionProfile,
} from "@/lib/auth/session";
import { unwrap } from "@/lib/api/client";
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
  const [categories, signedIn, profile, itemCount] = await Promise.all([
    listCategories(),
    hasSession(),
    sessionProfile(),
    countSacola(),
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

        {/* A menu with a session, a link without one. `hasSession()` rather
            than the profile decides which: the profile cookie is only written
            at sign-in, so someone signed in before it existed still has a live
            session and must still get the menu — without the address line. */}
        {signedIn ? (
          <AccountMenu
            email={profile?.email ?? null}
            backOffice={profile?.backOffice ?? false}
          />
        ) : (
          <Link
            href="/entrar"
            className={cn(textLinkClass, "type-meta flex items-center gap-2")}
          >
            <AccountIcon />
            Conta
          </Link>
        )}

        {/* The count comes from the API, not from summing quantities here —
            that is what `itemCount` on GET /cart exists for. */}
        <Link
          href="/sacola"
          className={cn(textLinkClass, "type-meta flex items-center gap-2")}
        >
          <BagIcon />
          {itemCount === null ? "Sacola" : `Sacola (${itemCount})`}
        </Link>
      </div>
    </header>
  );
}

/**
 * How many pieces are in the sacola, or null when nobody is signed in — there
 * is no guest cart, so an anonymous visitor has no count to show rather than a
 * count of zero.
 *
 * A failure is also null: the header must render even when the API is waking
 * up from hibernation, and a missing number is better than a broken page.
 */
async function countSacola(): Promise<number | null> {
  const api = await customerApi();

  if (!api) {
    return null;
  }

  try {
    return unwrap(await api.GET("/cart")).itemCount;
  } catch {
    return null;
  }
}
