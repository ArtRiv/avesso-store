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

/**
 * A date in the store's voice: `28 de agosto`. Formatting a date is squarely
 * this side of the line — the backend hands over instants and a number of
 * days, and turning those into something a person reads is presentation.
 */
const longDate = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
});

export function formatLongDate(date: Date): string {
  return longDate.format(date);
}

/**
 * When the parcel should arrive, from the instant the order was paid and the
 * carrier's own estimate.
 *
 * The design shows a range — "entre 26 e 28 de agosto" — but the API gives a
 * single `shippingEtaDays`, so a range would mean inventing a spread around a
 * number the carrier stated exactly. One honest date instead. Null when the
 * carrier gave no estimate at all, which the freight row has to survive.
 */
export function estimatedDelivery(
  paidAt: string | null,
  etaDays: number | null,
): string | null {
  if (!paidAt || etaDays === null) {
    return null;
  }

  const arrival = new Date(paidAt);
  arrival.setDate(arrival.getDate() + etaDays);

  return formatLongDate(arrival);
}
