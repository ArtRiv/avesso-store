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
}: {
  slug: string;
  name: string;
  priceCents: number;
  stockQuantity: number;
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
        <ScarcityBadge stockQuantity={stockQuantity} />
      </span>
    </Link>
  );
}
