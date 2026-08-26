/**
 * The only place money is formatted, and the only place it is divided by 100.
 *
 * The API speaks integer cents everywhere — priceCents, totalCents,
 * shippingCents — and never a float (docs/backend-commerce-core.md §1). Cents
 * are what gets stored, compared and sent back; a real number only ever exists
 * for the length of this function.
 *
 * If you find yourself wanting a second one of these, or wanting to add two
 * formatted values together, that is a backend gap rather than a formatting
 * problem. See docs/upstream-first.md.
 */
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/**
 * Order ids are UUIDs, and the design shows `#A3F2-91C4` (artboard 08). This
 * shortens for display only — every request still carries the whole id.
 */
export function formatOrderRef(id: string): string {
  const hex = id.replace(/-/g, "").toUpperCase();

  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
