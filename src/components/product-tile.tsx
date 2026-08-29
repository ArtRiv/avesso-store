import Link from "next/link";

import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import { ProductImage } from "@/components/product-image";
import { ScarcityBadge } from "@/components/badge";

/**
 * The catalogue tile (docs/design-system.md §2). A sold-out piece stays in the
 * grid, dimmed and desaturated with its price in muted — the design keeps it
 * visible rather than filtering it away.
 */
export function ProductTile({
  slug,
  name,
  priceCents,
  stockQuantity,
  // Artboard 04's "Você também pode gostar" row carries no badges at all —
  // just the name and the price. The dimming of a sold-out piece stays either
  // way, so the row never invites a click on something nobody can buy.
  showBadge = true,
}: {
  slug: string;
  name: string;
  priceCents: number;
  stockQuantity: number;
  showBadge?: boolean;
}) {
  const soldOut = stockQuantity <= 0;

  return (
    <Link
      href={`/produto/${slug}`}
      className={cn(
        "group flex flex-col gap-3 outline-none",
        "focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-4",
        soldOut && "opacity-45 grayscale",
      )}
    >
      <ProductImage slug={slug} name={name} />
      <span className="text-body group-hover:text-rust">{name}</span>
      <span className="flex flex-wrap items-center gap-3">
        <span className={cn("type-price", soldOut && "text-muted")}>
          {formatBRL(priceCents)}
        </span>
        {showBadge ? <ScarcityBadge stockQuantity={stockQuantity} /> : null}
      </span>
    </Link>
  );
}
