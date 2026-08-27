"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToneBlock } from "@/components/tone-block";
import { cn } from "@/lib/utils";
import { formatBRL, formatEta, formatPostalCode } from "@/lib/format";
import { toneFor } from "@/lib/product-tone";
import type { components } from "@/lib/api/schema";

type Cart = components["schemas"]["CartResponse"];
type CartItem = components["schemas"]["CartItemResponse"];
type Quote = components["schemas"]["ShippingQuoteResponse"];
type ShippingOption = components["schemas"]["ShippingOptionResponse"];
type PlacedOrder = components["schemas"]["OrderWithPaymentResponse"];

type Address = {
  line1: string;
  line2: string;
  city: string;
  state: string;
};

const EMPTY_ADDRESS: Address = { line1: "", line2: "", city: "", state: "" };

/** `01310-200` — eight digits and the hyphen this field inserts. */
const CEP_LENGTH = 9;

/**
 * Artboard 07 — three numbered sections, all visible at once, no wizard — and
 * artboard 10 as a state of it.
 *
 * Not one number on this screen is computed here. `itemsSubtotalCents` comes
 * from the cart or the quote, `priceCents` from the chosen freight option, and
 * the figure on the button is `orderTotalCents`, which the quote hands over
 * per option precisely so a checkout never adds two numbers in a browser. The
 * one multiplication is a single line's own total, which the API does not
 * break out and which is unit × quantity by definition rather than a rule
 * anyone could get wrong.
 *
 * The total appears only once freight is known. Before that there is a
 * subtotal and a sentence saying what is missing — the same rule the sacola
 * follows, and the reason GET /cart refuses to name a total at all.
 */
export function CheckoutView({ initialCart }: { initialCart: Cart }) {
  const router = useRouter();

  const [cart, setCart] = useState(initialCart);
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [postalCode, setPostalCode] = useState("");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  /** Said out loud when a re-quote moved the price under the customer. */
  const [freightNote, setFreightNote] = useState<string | null>(null);

  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  /** Artboard 10: the lines that sold out, kept for display after removal. */
  const [removed, setRemoved] = useState<CartItem[]>([]);
  /** The total the customer was looking at when they pressed the button. */
  const [previousTotalCents, setPreviousTotalCents] = useState<number | null>(
    null,
  );

  const selected =
    quote?.options.find((option) => option.code === selectedCode) ?? null;
  const subtotalCents = quote?.itemsSubtotalCents ?? cart.itemsSubtotalCents;
  const conflict = removed.length > 0;
  const emptied = cart.items.length === 0;

  const addressComplete =
    address.line1.trim() !== "" &&
    address.city.trim() !== "" &&
    address.state.trim() !== "";

  function endSession() {
    router.push(`/entrar?next=${encodeURIComponent("/checkout")}`);
  }

  /**
   * Quote freight for the sacola as it stands.
   *
   * Returns the quote so the 409 reconciliation can look at it, and keeps the
   * customer's chosen option selected when it survives the re-quote — losing
   * a selection they already made would be the screen forgetting, not the
   * carrier changing its mind.
   */
  async function quoteFreight(cep: string): Promise<Quote | null> {
    setQuoting(true);
    setQuoteError(null);

    try {
      const response = await apiFetch("/api/shipping/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postalCode: cep }),
      });

      if (!response.ok) {
        setQuoteError(await problemMessage(response));
        setQuote(null);
        setSelectedCode(null);

        return null;
      }

      const fresh = (await response.json()) as Quote;

      setQuote(fresh);
      setSelectedCode((current) =>
        fresh.options.some((option) => option.code === current)
          ? current
          : (fresh.options[0]?.code ?? null),
      );

      return fresh;
    } catch (caught) {
      if (caught instanceof SessionEndedError) {
        endSession();

        return null;
      }

      setQuoteError("Não conseguimos falar com o servidor. Tente de novo.");

      return null;
    } finally {
      setQuoting(false);
    }
  }

  /**
   * The 409, reconciled — artboard 10.
   *
   * The conflict body is prose: it names the sold-out pieces inside a sentence
   * and never says which line to strike. Rather than parse that, or duplicate
   * the backend's rule about what is sellable, this re-reads the sacola —
   * whose price, status and per-size stock are read live on every request for
   * exactly this purpose — and treats as guilty any line the backend could not
   * have filled. Removing those is what makes "Removemos da sacola" true.
   * Recorded as a deliberate deferral in README.md; if the 409 ever grows a
   * structured body, this comes out.
   */
  async function reconcile(shownTotalCents: number): Promise<void> {
    const response = await apiFetch("/api/cart");

    if (!response.ok) {
      setPlaceError(await problemMessage(response));

      return;
    }

    const fresh = (await response.json()) as Cart;
    const guilty = fresh.items.filter(unfulfillable);
    const previousOption = selected;

    let latest = fresh;

    // Sequentially: these all mutate one cart, and each answer carries the
    // whole of it, so the last one is the truth.
    for (const line of guilty) {
      const removal = await apiFetch(`/api/cart/items/${line.variantId}`, {
        method: "DELETE",
      });

      if (removal.ok) {
        latest = (await removal.json()) as Cart;
      }
    }

    setCart(latest);
    // The header's count is rendered on the server.
    router.refresh();

    if (guilty.length > 0) {
      setRemoved(guilty);
      setPreviousTotalCents(shownTotalCents);
    }

    if (latest.items.length === 0) {
      setQuote(null);
      setSelectedCode(null);

      return;
    }

    // What is left weighs less, so the freight it was quoted at is no longer
    // the freight it costs. The number on the button has to be real.
    const requoted = await quoteFreight(postalCode);

    if (guilty.length > 0 || !requoted || !previousOption) {
      return;
    }

    // Nothing in the sacola was at fault, so the conflict was the freight
    // quote going stale — the server re-quoted, got a different number, and
    // refused to charge a price the customer had never seen. Say so, and let
    // them look before pressing again.
    const current = requoted.options.find(
      (option) => option.code === previousOption.code,
    );

    setFreightNote(
      current
        ? `O frete foi recotado e passou de ${formatBRL(previousOption.priceCents)} para ${formatBRL(current.priceCents)}. Confira antes de finalizar.`
        : "A opção de frete escolhida não está mais disponível. Escolha uma das opções acima.",
    );
  }

  async function placeOrder(): Promise<void> {
    if (!selected) {
      return;
    }

    setPlacing(true);
    setPlaceError(null);
    setFreightNote(null);
    setRemoved([]);

    const shownTotalCents = selected.orderTotalCents;
    let leaving = false;

    try {
      const response = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shippingAddress: {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode,
          },
          shippingOptionCode: selected.code,
          // The price that was on the screen, not a price to charge. The
          // server re-quotes and charges its own; this one is only compared,
          // to catch a quote that went stale while the form was open.
          quotedShippingCents: selected.priceCents,
        }),
      });

      if (response.status === 409) {
        await reconcile(shownTotalCents);

        return;
      }

      if (!response.ok) {
        setPlaceError(await problemMessage(response));

        return;
      }

      const order = (await response.json()) as PlacedOrder;

      leaving = true;

      // Hosted checkout: the card fields are Stripe's page, never ours. On the
      // way back the buyer lands on /checkout/success, which forwards to the
      // order — where the status is polled, because coming back from Stripe is
      // not proof that anything was paid.
      if (order.payment?.mode === "hosted" && order.payment.url) {
        window.location.href = order.payment.url;

        return;
      }

      // `payment` is null when the provider was down, and the order still
      // exists with its stock decremented. That is recoverable rather than
      // broken: the order page offers POST /orders/{id}/pay. An embedded
      // session lands here too — this storefront cannot mount one — and the
      // same recovery covers it.
      router.push(`/pedido/${order.id}`);
    } catch (caught) {
      if (caught instanceof SessionEndedError) {
        endSession();

        return;
      }

      setPlaceError("Não conseguimos falar com o servidor. Tente de novo.");
    } finally {
      // Left true while the browser is on its way out, so the button cannot be
      // pressed a second time against a cart that no longer exists.
      if (!leaving) {
        setPlacing(false);
      }
    }
  }

  return (
    <div className="grid grid-cols-[8fr_4fr] items-start gap-16 px-24 py-16">
      <div className="flex flex-col gap-12">
        <h1 className="text-h1">Finalizar pedido</h1>

        <Section number="01" title="Entrega">
          <div className="flex items-end gap-3">
            <div className="flex w-[220px] flex-col gap-2">
              <Label htmlFor="checkout-cep">CEP</Label>
              <Input
                id="checkout-cep"
                inputMode="numeric"
                autoComplete="postal-code"
                className="font-mono"
                placeholder="01310-200"
                value={postalCode}
                onChange={(event) => {
                  setPostalCode(formatPostalCode(event.target.value));
                  // A quote belongs to the CEP it was measured against.
                  setQuote(null);
                  setSelectedCode(null);
                  setQuoteError(null);
                  setFreightNote(null);
                }}
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={quoting || postalCode.length < CEP_LENGTH}
              onClick={() => void quoteFreight(postalCode)}
            >
              {quoting ? "Calculando" : "Calcular frete"}
            </Button>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-4">
            {/* The design draws `Número` and `Bairro` as fields of their own.
                The API's address is line1 / line2 / city / state / postalCode,
                so the number rides in the street line exactly as the spec's
                own example writes it, and there is nowhere honest to put a
                bairro. Recorded in README.md rather than invented here. */}
            <Field
              id="checkout-line1"
              label="Endereço"
              autoComplete="address-line1"
              placeholder="Rua Aurora, 148"
              value={address.line1}
              onChange={(line1) => setAddress({ ...address, line1 })}
            />
            <Field
              id="checkout-line2"
              label="Complemento"
              autoComplete="address-line2"
              placeholder="Apto 42"
              value={address.line2}
              onChange={(line2) => setAddress({ ...address, line2 })}
            />
            <Field
              id="checkout-city"
              label="Cidade"
              autoComplete="address-level2"
              placeholder="São Paulo"
              value={address.city}
              onChange={(city) => setAddress({ ...address, city })}
            />
            <Field
              id="checkout-state"
              label="UF"
              autoComplete="address-level1"
              placeholder="SP"
              maxLength={2}
              className="font-mono uppercase"
              value={address.state}
              onChange={(state) =>
                setAddress({ ...address, state: state.toUpperCase() })
              }
            />
          </div>

          <FreightSection
            quote={quote}
            quoting={quoting}
            error={quoteError}
            note={freightNote}
            selectedCode={selectedCode}
            onSelect={setSelectedCode}
          />
        </Section>

        <Section number="02" title="Pagamento">
          <PaymentNote />
        </Section>

        <Section number="03" title="Revisão">
          <div className="border-t border-hairline">
            {conflict ? (
              <>
                {removed.map((item) => (
                  <ConflictRow key={item.variantId} item={item} gone />
                ))}
                {cart.items.map((item) => (
                  <ConflictRow key={item.variantId} item={item} gone={false} />
                ))}
              </>
            ) : (
              cart.items.map((item) => (
                <CompactRow key={item.variantId} item={item} />
              ))
            )}

            <TotalsRows
              subtotalCents={subtotalCents}
              option={selected}
              emptied={emptied}
            />
          </div>

          <CheckoutButton
            conflict={conflict}
            emptied={emptied}
            itemCount={cart.itemCount}
            option={selected}
            disabled={!selected || !addressComplete || placing}
            placing={placing}
            onClick={() => void placeOrder()}
          />

          {!emptied && !addressComplete ? (
            <p className="text-small text-muted">
              Informe o endereço de entrega para finalizar.
            </p>
          ) : null}

          {placeError ? (
            <p role="alert" className="text-small text-clay">
              {placeError}
            </p>
          ) : null}
        </Section>
      </div>

      <OrderSummary
        cart={cart}
        conflict={conflict}
        removed={removed}
        emptied={emptied}
        subtotalCents={subtotalCents}
        option={selected}
        previousTotalCents={previousTotalCents}
      />
    </div>
  );
}

/** A line the backend could not have filled — the 409's likely author. */
function unfulfillable(item: CartItem): boolean {
  return (
    item.product.status !== "ACTIVE" ||
    item.variant.stockQuantity < item.quantity
  );
}

/**
 * `01 Entrega`, `02 Pagamento`, `03 Revisão` — all on screen at once, divided
 * by an ink rule rather than stacked into a wizard. Three steps behind three
 * "continue" buttons is three chances to lose the order.
 */
function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-t border-ink pt-6">
      <div className="flex items-baseline gap-4">
        <span className="type-meta">{number}</span>
        <h2 className="text-h2">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  className,
  ...props
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<React.ComponentProps<"input">, "id" | "value" | "onChange">) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </div>
  );
}

/**
 * The freight rows, and the answers that are not rows.
 *
 * An empty option list arrives as a 200 and is a fact about the address rather
 * than a failure, so it gets a sentence and no invitation to retry — nothing
 * about pressing the button again would change it. A provider that is merely
 * unreachable is a 503 and reaches the error line above, where trying again is
 * the right advice. Keeping those two apart is the whole reason the backend
 * answers them differently.
 */
function FreightSection({
  quote,
  quoting,
  error,
  note,
  selectedCode,
  onSelect,
}: {
  quote: Quote | null;
  quoting: boolean;
  error: string | null;
  note: string | null;
  selectedCode: string | null;
  onSelect: (code: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="type-meta mb-3 text-muted">Frete</legend>

      {error ? (
        <p role="alert" className="text-small text-clay">
          {error}
        </p>
      ) : null}

      {note ? (
        <p role="status" className="text-small text-clay">
          {note}
        </p>
      ) : null}

      {!quote && !error ? (
        <p className="text-small text-muted">
          {quoting
            ? "Consultando as transportadoras."
            : "Informe o CEP para ver as opções de entrega e o total."}
        </p>
      ) : null}

      {quote && quote.options.length === 0 ? (
        <p className="text-small text-muted">
          Nenhuma transportadora entrega neste CEP. Confira o número ou use
          outro endereço.
        </p>
      ) : null}

      {quote && quote.options.length > 0 ? (
        <div className="border-t border-hairline">
          {quote.options.map((option) => (
            <FreightRow
              key={option.code}
              option={option}
              checked={option.code === selectedCode}
              onSelect={() => onSelect(option.code)}
            />
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}

/**
 * One option. `carrier` and `estimatedDays` are both nullable, and the
 * deployed table returns a null carrier on every option it has, so the meta
 * line is built from whichever of the two exists and disappears when neither
 * does.
 */
function FreightRow({
  option,
  checked,
  onSelect,
}: {
  option: ShippingOption;
  checked: boolean;
  onSelect: () => void;
}) {
  const meta = [option.carrier, formatEta(option.estimatedDays)]
    .filter(Boolean)
    .join(" · ");

  return (
    <label className="grid cursor-pointer grid-cols-[20px_1fr_auto] items-center gap-4 border-b border-hairline py-4">
      <input
        type="radio"
        name="shipping-option"
        className="peer sr-only"
        checked={checked}
        onChange={onSelect}
      />

      {/* The design's own radio: a hairline ring that fills with ink. Round is
          the one exception to the square corners — a radio that is not a
          circle stops reading as a radio. */}
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full border border-hairline",
          "peer-checked:border-ink peer-checked:bg-ink",
          "peer-focus-visible:outline-1 peer-focus-visible:outline-ink peer-focus-visible:outline-offset-2",
        )}
      />

      <span className="flex flex-col gap-1">
        <span className="type-meta">{option.label}</span>
        {meta ? <span className="text-small text-muted">{meta}</span> : null}
      </span>

      <span className="type-price">{formatBRL(option.priceCents)}</span>
    </label>
  );
}

/**
 * Section 02, and what it can honestly claim.
 *
 * The design draws a card-shaped strip inside this box. On a hosted checkout
 * there is no field here to draw — the buyer types the number on Stripe's own
 * page — and a box shaped like an input that never accepts one is exactly the
 * kind of thing the rest of this store refuses to render. The design's
 * sentence about who sees the number survives verbatim; what is added is the
 * one fact the artboard did not have to state, because it was drawn for the
 * embedded mode this deployment does not run. See README.md.
 */
function PaymentNote() {
  return (
    <div className="flex flex-col gap-4 border border-hairline bg-paper p-6">
      <p className="type-meta text-muted">Pagamento processado pela Stripe</p>

      <p className="text-body">
        Ao finalizar, você segue para a página segura da Stripe, informa o
        cartão e volta para acompanhar o pedido.
      </p>

      <div className="type-meta flex gap-4 text-muted">
        <span>Visa</span>
        <span>Mastercard</span>
        <span>Elo</span>
        <span>Amex</span>
      </div>

      <p className="text-small text-muted">
        Os dados do cartão são digitados no campo da Stripe. A AVESSO não
        recebe nem armazena o número.
      </p>
    </div>
  );
}

/** Artboard 07's review line: name, size, quantity, line total. */
function CompactRow({ item }: { item: CartItem }) {
  return (
    <div className="flex justify-between border-b border-hairline py-3">
      <span className="text-small">
        {item.product.name} · Tamanho {item.variant.label} · {item.quantity} un
      </span>
      <span className="font-mono text-[14px] leading-[1.5] font-medium tabular-nums">
        {formatBRL(item.product.priceCents * item.quantity)}
      </span>
    </div>
  );
}

/**
 * Artboard 10's row. A removed piece is greyed, struck and badged rather than
 * deleted from the screen: the customer has to see what left the sacola, or
 * the new total is a number that changed for no reason they were shown.
 */
function ConflictRow({ item, gone }: { item: CartItem; gone: boolean }) {
  return (
    <div className="grid grid-cols-[64px_1fr_160px_120px] items-center gap-6 border-b border-hairline py-5">
      <ToneBlock
        tone={toneFor(item.product.slug)}
        className={cn("w-16", gone && "grayscale")}
      />

      <div className="flex flex-col gap-2">
        <span className={cn("text-body", gone && "text-clay")}>
          {item.product.name}
        </span>
        <span className="type-meta text-muted">
          Tamanho {item.variant.label} · {item.quantity} un
        </span>
      </div>

      <div>{gone ? <Badge tone="clay">Esgotado</Badge> : null}</div>

      <span
        className={cn("type-price text-right", gone && "text-muted line-through")}
      >
        {formatBRL(item.product.priceCents * item.quantity)}
      </span>
    </div>
  );
}

/**
 * Subtotal, freight, total — and no total at all until freight is known. A
 * number called "Total" that is missing the freight is precisely the number a
 * checkout must never show, which is why GET /cart refuses to produce one.
 */
function TotalsRows({
  subtotalCents,
  option,
  emptied,
}: {
  subtotalCents: number;
  option: ShippingOption | null;
  emptied: boolean;
}) {
  if (emptied) {
    return null;
  }

  return (
    <>
      <div className="flex justify-between border-b border-hairline py-3">
        <span className="text-small text-muted">Subtotal</span>
        <span className="font-mono text-[14px] leading-[1.5] font-medium tabular-nums">
          {formatBRL(subtotalCents)}
        </span>
      </div>

      <div className="flex justify-between border-b border-hairline py-3">
        <span className="text-small text-muted">
          {option ? `Frete · ${option.label}` : "Frete"}
        </span>
        {option ? (
          <span className="font-mono text-[14px] leading-[1.5] font-medium tabular-nums">
            {formatBRL(option.priceCents)}
          </span>
        ) : (
          <span className="text-small text-muted">calculado a partir do CEP</span>
        )}
      </div>

      {option ? (
        <div className="flex items-baseline justify-between py-4">
          <span className="text-h3">Total</span>
          <span className="font-mono text-[20px] leading-[1.2] font-medium tabular-nums">
            {formatBRL(option.orderTotalCents)}
          </span>
        </div>
      ) : null}
    </>
  );
}

/**
 * The button carries the amount, because the amount is what the customer is
 * agreeing to. It is `orderTotalCents` straight from the chosen option — the
 * same number POST /orders will answer with as `totalCents`.
 *
 * After a conflict it turns rust and counts what is left: the recovery CTA is
 * one of the four places §1 lets rust appear at all.
 */
function CheckoutButton({
  conflict,
  emptied,
  itemCount,
  option,
  disabled,
  placing,
  onClick,
}: {
  conflict: boolean;
  emptied: boolean;
  itemCount: number;
  option: ShippingOption | null;
  disabled: boolean;
  placing: boolean;
  onClick: () => void;
}) {
  if (emptied) {
    return (
      <Button asChild variant="secondary" className="self-start">
        <Link href="/catalogo">Ver o catálogo</Link>
      </Button>
    );
  }

  const amount = option ? ` — ${formatBRL(option.orderTotalCents)}` : "";
  const pieces = `${String(itemCount)} ${itemCount === 1 ? "peça" : "peças"}`;

  return (
    <Button
      type="button"
      variant={conflict ? "recovery" : "default"}
      disabled={disabled}
      onClick={onClick}
    >
      {placing
        ? "Finalizando"
        : conflict
          ? `Finalizar com ${pieces}${amount}`
          : `Finalizar pedido${amount}`}
    </Button>
  );
}

/**
 * The sticky column: what is being bought, and what it costs.
 *
 * On a conflict it grows the banner from artboard 10 — a clay hairline, a meta
 * label and one sentence saying what happened and what was done about it, in
 * that order — and the old total stays beside the new one, struck through. No
 * modal, no red box.
 */
function OrderSummary({
  cart,
  conflict,
  removed,
  emptied,
  subtotalCents,
  option,
  previousTotalCents,
}: {
  cart: Cart;
  conflict: boolean;
  removed: CartItem[];
  emptied: boolean;
  subtotalCents: number;
  option: ShippingOption | null;
  previousTotalCents: number | null;
}) {
  return (
    <aside className="sticky top-24 flex flex-col border border-hairline bg-paper">
      {conflict ? (
        <div className="flex flex-col gap-2 border-b border-clay p-6">
          <p className="type-meta text-clay">Sacola atualizada</p>
          <p className="text-small">
            {sentenceFor(removed)} Removemos da sacola — o total foi
            atualizado.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 p-6">
        <h2 className="type-meta text-muted">Seu pedido</h2>

        {emptied ? (
          <p className="text-small text-muted">
            Não restou nenhuma peça na sacola.
          </p>
        ) : (
          cart.items.map((item) => (
            <div
              key={item.variantId}
              className="grid grid-cols-[64px_1fr_auto] items-center gap-4"
            >
              <ToneBlock tone={toneFor(item.product.slug)} className="w-16" />

              <div className="flex flex-col gap-1">
                <span className="text-small">{item.product.name}</span>
                <span className="type-meta text-muted">
                  {item.variant.label} · {item.quantity} un
                </span>
              </div>

              <span className="font-mono text-[14px] leading-[1.4] font-medium tabular-nums">
                {formatBRL(item.product.priceCents * item.quantity)}
              </span>
            </div>
          ))
        )}

        {emptied ? null : (
          <>
            <div className="flex flex-col gap-3 border-t border-hairline pt-4">
              <div className="text-small flex justify-between">
                <span className="text-muted">
                  Subtotal · {cart.itemCount}{" "}
                  {cart.itemCount === 1 ? "peça" : "peças"}
                </span>
                <span className="font-mono font-medium tabular-nums">
                  {formatBRL(subtotalCents)}
                </span>
              </div>

              <div className="text-small flex justify-between">
                <span className="text-muted">
                  {option ? `Frete · ${option.label}` : "Frete"}
                </span>
                {option ? (
                  <span className="font-mono font-medium tabular-nums">
                    {formatBRL(option.priceCents)}
                  </span>
                ) : (
                  <span className="text-muted">calculado a partir do CEP</span>
                )}
              </div>
            </div>

            {option ? (
              <div className="flex items-baseline justify-between border-t border-hairline pt-4">
                <span className="text-h3">Total</span>
                <span className="flex items-baseline gap-3">
                  {/* The number the customer was looking at before the sacola
                      changed under them, kept beside the new one so the
                      difference is visible rather than announced. */}
                  {previousTotalCents === null ? null : (
                    <span className="type-price text-muted line-through">
                      {formatBRL(previousTotalCents)}
                    </span>
                  )}
                  {/* Ink, not the canvas's rust. §1 rations rust to four
                      places and a total is none of them — the same call the
                      sacola's CTA made, recorded in README.md. */}
                  <span className="font-mono text-[20px] leading-[1.2] font-medium tabular-nums">
                    {formatBRL(option.orderTotalCents)}
                  </span>
                </span>
              </div>
            ) : null}
          </>
        )}

        {conflict ? (
          <p className="text-small text-muted">Nada foi cobrado ainda.</p>
        ) : null}
      </div>
    </aside>
  );
}

/**
 * What left the sacola, named. The design writes one piece; the backend can
 * empty several at once, and listing them is the difference between a customer
 * who knows what happened and one who has to compare two totals to find out.
 */
function sentenceFor(removed: CartItem[]): string {
  const names = removed.map((item) => item.product.name);

  if (names.length === 1) {
    return `A ${names[0]} esgotou enquanto você finalizava.`;
  }

  const last = names[names.length - 1];
  const rest = names.slice(0, -1).join(", ");

  return `${rest} e ${last} esgotaram enquanto você finalizava.`;
}
