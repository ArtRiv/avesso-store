import { cn } from "@/lib/utils";

/**
 * A size, as the product list shows it: a small hairline box, struck through
 * when the size is sold out.
 *
 * Not `SizeCell` from the storefront, and the difference is not cosmetic. That
 * one is a `button` carrying `aria-pressed` — a control the customer operates
 * to choose a size. This is a fact about a row. Widening SizeCell to be both
 * would give every catalogue page a component that has to be told it is not
 * interactive.
 *
 * Struck through rather than hidden, exactly as §2 requires of the store: an
 * operator scanning for what is out of stock needs the empty size to be
 * visible, not missing.
 */
export function VariantChip({
  label,
  soldOut,
  /** `Único` is a product that never got a real size grid — the canvas marks
   *  it rust, because it is a piece the store is selling without one. */
  unsized,
  className,
}: {
  label: string;
  soldOut?: boolean;
  unsized?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center justify-center border font-mono text-[12px] leading-none font-medium",
        unsized ? "border-rust px-2.5 text-rust" : "min-w-[34px] px-1.5",
        !unsized && soldOut && "border-admin-hairline text-admin-dim line-through",
        !unsized && !soldOut && "border-admin-hairline text-ink",
        className,
      )}
    >
      {label}
    </span>
  );
}
