import { cn } from "@/lib/utils";

/**
 * docs/design-system.md §2. A hairline box in one colour, with the label in
 * that same colour and nothing behind it.
 *
 * Not a shadcn component on purpose: the brief installs a deliberate short
 * list and this is not on it, which is right — there is no behaviour here to
 * inherit, only type and a border.
 */
type BadgeTone = "moss" | "rust" | "clay";

const TONE_CLASS: Readonly<Record<BadgeTone, string>> = {
  moss: "border-moss text-moss",
  rust: "border-rust text-rust",
  clay: "border-clay text-clay",
};

export function Badge({
  tone,
  className,
  children,
}: {
  tone: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "type-meta inline-block border bg-transparent px-2 py-1",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * How many units left before a piece is called scarce.
 *
 * The design never states a threshold — it states two pieces, at 2 and 3 units,
 * both wearing "Últimas N unidades", and everything else in stock at 12 or more
 * (§5). Three is the largest value the design actually demonstrates, so it is
 * the choice that reproduces the artboards without inventing a merchandising
 * rule nobody wrote down. A real threshold would be the backend's to hold.
 */
const SCARCE_AT = 3;

/**
 * The full stock badge, including the moss "Em estoque" — this is the PDP's
 * badge (artboard 04), where the customer is looking at one piece and the
 * reassurance is worth its space.
 */
export function StockBadge({ stockQuantity }: { stockQuantity: number }) {
  if (stockQuantity <= 0) {
    return <Badge tone="clay">Esgotado</Badge>;
  }

  if (stockQuantity <= SCARCE_AT) {
    return <Badge tone="rust">Últimas {stockQuantity} unidades</Badge>;
  }

  return <Badge tone="moss">Em estoque</Badge>;
}

/**
 * The grid's badge, which stays silent about healthy stock. In the canvas a
 * tile renders its badge behind `sc-if`, so twelve "Em estoque" chips never
 * appear down a catalogue page — only scarcity and absence are worth a mark
 * there.
 */
export function ScarcityBadge({ stockQuantity }: { stockQuantity: number }) {
  if (stockQuantity > SCARCE_AT) {
    return null;
  }

  return <StockBadge stockQuantity={stockQuantity} />;
}
