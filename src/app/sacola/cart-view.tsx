"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import type { components } from "@/lib/api/schema";

type Cart = components["schemas"]["CartResponse"];
type CartItem = components["schemas"]["CartItemResponse"];

/**
 * Tela da sacola de compras.
 *
 * Exibe a lista de itens com stepper de quantidade, remoção por linha e
 * resumo com subtotal. Todos os valores numéricos são derivados da resposta
 * da API (`itemsSubtotalCents`, `itemCount`).
 */
export function CartView({ initialCart }: { initialCart: Cart }) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function mutate(variantId: string, init: RequestInit) {
    setBusyVariantId(variantId);
    setError(null);

    try {
      const response = await apiFetch(`/api/cart/items/${variantId}`, init);

      if (!response.ok) {
        setError(await problemMessage(response));

        return;
      }

      const next = (await response.json()) as Cart;

      if (next.items.length === 0) {
        // Quando a sacola esvazia, atualiza via transição para renderizar
        // a tela de sacola vazia do servidor sem piscar.
        startTransition(() => {
          router.refresh();
        });

        return;
      }

      setCart(next);
      // The header's count is rendered on the server.
      router.refresh();
    } catch (caught) {
      if (caught instanceof SessionEndedError) {
        router.push(`/entrar?next=${encodeURIComponent("/sacola")}`);

        return;
      }

      setError("Não conseguimos falar com o servidor. Tente de novo.");
    } finally {
      setBusyVariantId(null);
    }
  }

  function setQuantity(variantId: string, quantity: number) {
    void mutate(variantId, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
  }

  function remove(variantId: string) {
    void mutate(variantId, { method: "DELETE" });
  }

  return (
    <section className="grid grid-cols-[8fr_4fr] items-start gap-16 px-24 py-16">
      <div className="flex flex-col gap-8">
        <div className="flex items-baseline gap-4">
          <h1 className="text-h1">Sua sacola</h1>
          <p className="type-meta text-muted">
            {cart.itemCount} {cart.itemCount === 1 ? "peça" : "peças"}
          </p>
        </div>

        <div className="border-t border-hairline">
          {cart.items.map((item) => (
            <CartRow
              key={item.variantId}
              item={item}
              busy={busyVariantId === item.variantId}
              onSetQuantity={setQuantity}
              onRemove={remove}
            />
          ))}
        </div>

        {error ? (
          <p role="alert" className="text-small text-clay">
            {error}
          </p>
        ) : null}

        <Button asChild variant="secondary" className="self-start">
          <Link href="/catalogo">Continuar comprando</Link>
        </Button>
      </div>

      <aside className="sticky top-24 flex flex-col gap-6 border border-hairline bg-paper p-8">
        <h2 className="type-meta text-muted">Resumo</h2>

        <div className="flex items-baseline justify-between">
          <span className="text-body">Subtotal</span>
          <span className="type-price">
            {formatBRL(cart.itemsSubtotalCents)}
          </span>
        </div>

        <div className="text-small flex items-baseline justify-between text-muted">
          <span>Frete</span>
          <span>calculado no checkout</span>
        </div>

        <div className="flex items-baseline justify-between border-t border-hairline pt-6">
          <span className="text-h3">Total</span>
          <span className="font-mono text-[20px] leading-[1.2] font-medium tabular-nums">
            {formatBRL(cart.itemsSubtotalCents)}
          </span>
        </div>

        <Button asChild>
          <Link href="/checkout">Ir para o checkout</Link>
        </Button>

        <p className="text-small text-muted">
          O estoque não é reservado. A peça sai da sacola se acabar antes do
          pagamento.
        </p>
      </aside>
    </section>
  );
}

function CartRow({
  item,
  busy,
  onSetQuantity,
  onRemove,
}: {
  item: CartItem;
  busy: boolean;
  onSetQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
}) {
  const { product, variant, quantity, variantId } = item;

  return (
    <div
      className={cn(
        "grid grid-cols-[64px_1fr_120px_140px_120px] items-center gap-6 border-b border-hairline py-6",
        busy && "opacity-60",
      )}
    >
      <ProductImage
        slug={product.slug}
        name={product.name}
        showLabel={false}
        className="w-16"
      />

      <div className="flex flex-col gap-2">
        <Link href={`/produto/${product.slug}`} className="text-body hover:text-rust">
          {product.name}
        </Link>

        <p className="type-meta text-muted">
          Tamanho {variant.label}
          <span aria-hidden> · </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(variantId)}
            className="type-meta text-muted hover:text-rust disabled:pointer-events-none"
          >
            Remover
          </button>
        </p>

        <LineNote item={item} />
      </div>

      <span className="type-price text-muted">
        {formatBRL(product.priceCents)}
      </span>

      <Stepper
        quantity={quantity}
        max={variant.stockQuantity}
        busy={busy}
        onChange={(next) => onSetQuantity(variantId, next)}
      />

      {/* The one multiplication on this screen. A line's own total is not
          broken out by the API, and unit × quantity is the definition of it
          rather than a policy — the money that decides anything (subtotal,
          freight, order total) is still the server's. */}
      <span className="type-price text-right">
        {formatBRL(product.priceCents * quantity)}
      </span>
    </div>
  );
}

/**
 * Nota informativa da linha (estoque insuficiente, produto esgotado ou inativo).
 */
function LineNote({ item }: { item: CartItem }) {
  const note =
    item.product.status !== "ACTIVE"
      ? "Esta peça saiu do catálogo. Remova para finalizar o pedido."
      : item.variant.stockQuantity <= 0
        ? "Este tamanho esgotou. Remova para finalizar o pedido."
        : item.variant.stockQuantity < item.quantity
          ? `Restam ${item.variant.stockQuantity} neste tamanho. Ajuste a quantidade para finalizar.`
          : null;

  if (!note) {
    return null;
  }

  return <p className="text-small text-clay">{note}</p>;
}

/**
 * Controle de incremento/decremento de quantidade (`− N +`).
 * A quantidade mínima é 1; para remover o item, utiliza-se a ação de remoção.
 */
function Stepper({
  quantity,
  max,
  busy,
  onChange,
}: {
  quantity: number;
  max: number;
  busy: boolean;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="flex h-10 w-30 border border-hairline">
      <StepperButton
        label="Diminuir a quantidade"
        disabled={busy || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        className="border-r border-hairline"
      >
        −
      </StepperButton>

      <span
        aria-live="polite"
        className="flex flex-1 items-center justify-center font-mono text-[16px] leading-none font-medium tabular-nums"
      >
        {quantity}
      </span>

      <StepperButton
        label="Aumentar a quantidade"
        disabled={busy || quantity >= max}
        onClick={() => onChange(quantity + 1)}
        className="border-l border-hairline"
      >
        +
      </StepperButton>
    </div>
  );
}

function StepperButton({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center font-mono text-[16px] leading-none",
        "hover:text-rust disabled:pointer-events-none disabled:text-hairline",
        className,
      )}
    >
      {children}
    </button>
  );
}
