import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A lifecycle state, as a filter link or as a plain mark on a row.
 *
 * Distinct from `Badge` because it is a different thing at a different size:
 * Badge is a 12px mark that sits beside a name, while this is a 36px control
 * in a rail of seven. Widening Badge to be both would give the storefront a
 * component with a size prop it never uses.
 *
 * The tone is the state's own colour. `active` inverts it to a filled chip,
 * which is what the canvas does with `Todos` — selection reads as ink on
 * paper, never as a second accent.
 */
type Tone = "neutral" | "moss" | "shipped" | "delivered" | "clay" | "rust";

const TONE: Readonly<Record<Tone, string>> = {
  neutral: "border-muted text-muted",
  moss: "border-moss text-moss",
  shipped: "border-shipped text-shipped",
  delivered: "border-delivered text-delivered",
  clay: "border-clay text-clay",
  rust: "border-rust text-rust",
};

export function StatusChip({
  href,
  active,
  tone,
  compact,
  as: element,
  children,
}: {
  href?: string;
  active: boolean;
  tone?: Tone;
  /** The in-table version, which is a mark rather than a control. */
  compact?: boolean;
  as?: "span";
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex items-center border font-mono font-medium tracking-[0.08em] uppercase",
    compact ? "h-7 px-2.5 text-[11px]" : "h-9 px-3.5 text-[12px]",
    active
      ? "border-ink bg-ink text-paper"
      : (tone ? TONE[tone] : "border-admin-hairline text-muted"),
    !active && href ? "hover:border-ink hover:text-ink" : "",
  );

  if (element === "span" || !href) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}
