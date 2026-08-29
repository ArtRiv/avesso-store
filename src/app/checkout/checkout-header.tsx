import Link from "next/link";

import { textLinkClass } from "@/components/text-link";
import { cn } from "@/lib/utils";

/**
 * Artboard 07's header, which is not the store's header.
 *
 * Same 80px box and same hairline, but the categories, the search and the
 * sacola are all gone: a checkout is the one screen in the store with a single
 * thing to do on it, and every link out of it is a way to lose an order that
 * is halfway made. The wordmark stays clickable because a locked-in page is
 * worse than an abandoned one.
 */
export function CheckoutHeader() {
  return (
    <header className="flex h-20 flex-none items-center justify-between border-b border-hairline px-24">
      <Link
        href="/"
        className={cn(
          textLinkClass,
          "text-[20px] font-semibold tracking-[0.22em]",
        )}
      >
        AVESSO
      </Link>

      <p className="type-meta text-muted">Checkout · conexão segura</p>
    </header>
  );
}
