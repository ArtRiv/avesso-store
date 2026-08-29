"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import { AuthPanel } from "@/components/auth-panel";
import { SignInForm } from "@/components/sign-in-form";
import { SizeCell } from "@/components/size-cell";
import { StockBadge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import type { components } from "@/lib/api/schema";

type Variant = components["schemas"]["ProductVariantResponse"];

/**
 * The size selector, now backed by real data.
 *
 * Sizes used to be a constant here with `GG` hard-coded as unavailable,
 * because the API had one product, one price, one stock count. commerce-core
 * PR #19 made the size the sellable unit, so every cell on this row is a
 * variant the backend knows about, its struck-through state is that variant's
 * stock actually being zero, and the sacola receives a `variantId`.
 *
 * A piece with a single `Único` variant — an accessory, or anything seeded
 * before sizes existed — shows no row at all and selects itself. That is a
 * rule about real data rather than a rule about categories: nothing here needs
 * to know what a cap is.
 */
type Panel = "none" | "signIn";

export function AddToBag({
  variants,
  stockQuantity,
}: {
  variants: Variant[];
  stockQuantity: number;
}) {
  const router = useRouter();

  const sized = variants.length > 1 || variants[0]?.label !== "Único";
  const [selected, setSelected] = useState<Variant | null>(
    sized ? null : (variants[0] ?? null),
  );

  const [panel, setPanel] = useState<Panel>("none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const soldOut = stockQuantity <= 0;
  // Once a size is chosen the badge describes that size, which is the number
  // the customer is actually buying against. Before that it describes the
  // piece.
  const shownStock = selected ? selected.stockQuantity : stockQuantity;

  async function addToBag(variant: Variant) {
    setPending(true);
    setError(null);

    try {
      const response = await apiFetch("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
      });

      if (response.status === 401) {
        // Artboard 05: the panel replaces the CTA, the piece stays on screen
        // and the page does not navigate.
        setPanel("signIn");

        return;
      }

      if (!response.ok) {
        setError(await problemMessage(response));

        return;
      }

      setAdded(true);
      // The header's sacola count is rendered on the server.
      router.refresh();
    } catch (caught) {
      if (caught instanceof SessionEndedError) {
        setError("A sessão expirou. Entre novamente.");
        setPanel("signIn");

        return;
      }

      setError("Não conseguimos falar com o servidor. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  if (panel === "signIn") {
    return (
      <div className="flex flex-col gap-6">
        {sized ? (
          <SizeRow
            variants={variants}
            selected={selected}
            onSelect={setSelected}
          />
        ) : null}

        <AuthPanel
          title="Entre para montar sua sacola"
          note={
            selected && sized
              ? `A peça e o tamanho ${selected.label} ficam guardados. Você continua nesta página.`
              : "A peça fica guardada. Você continua nesta página."
          }
        >
          <SignInForm
            onDone={() => {
              setPanel("none");

              // Finish what the customer was doing before the wall appeared.
              if (selected) {
                void addToBag(selected);
              }

              router.refresh();
            }}
            onForgotPassword={() =>
              router.push(
                `/entrar?next=${encodeURIComponent(window.location.pathname)}`,
              )
            }
            onCreateAccount={() => router.push("/criar-conta")}
          />
        </AuthPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {sized ? (
        <SizeRow
          variants={variants}
          selected={selected}
          onSelect={setSelected}
        />
      ) : null}

      <div className="flex flex-col gap-4">
        <StockBadge stockQuantity={shownStock} />

        <Button
          className="w-full"
          disabled={soldOut || !selected || pending}
          onClick={() => selected && void addToBag(selected)}
        >
          {soldOut
            ? "Esgotado"
            : pending
              ? "Adicionando"
              : added
                ? "Na sacola"
                : "Adicionar à sacola"}
        </Button>

        {error ? (
          <p role="alert" className="text-small text-clay">
            {error}
          </p>
        ) : null}

        {!soldOut && sized && !selected ? (
          <p className="text-small text-muted">Escolha um tamanho.</p>
        ) : null}

        <p className="text-small text-muted">
          Frete calculado no checkout a partir do seu CEP.
        </p>
      </div>
    </div>
  );
}

function SizeRow({
  variants,
  selected,
  onSelect,
}: {
  variants: Variant[];
  selected: Variant | null;
  onSelect: (variant: Variant) => void;
}) {
  // A size with no stock is struck through, never hidden (§2): the customer
  // learns the piece exists in their size and is out, which a missing cell
  // would not tell them.
  const unavailable = variants.filter((v) => v.stockQuantity <= 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="type-meta text-muted">Tamanho</h2>
        <span className="type-meta text-muted">Guia de medidas</span>
      </div>

      <div className="flex gap-2">
        {variants.map((variant) => (
          <SizeCell
            key={variant.id}
            label={variant.label}
            state={
              variant.stockQuantity <= 0
                ? "unavailable"
                : selected?.id === variant.id
                  ? "selected"
                  : "available"
            }
            onSelect={() => onSelect(variant)}
          />
        ))}
      </div>

      {unavailable.length > 0 ? (
        <p className="text-small text-muted">
          {unavailable.map((v) => v.label).join(", ")}{" "}
          {unavailable.length === 1 ? "indisponível" : "indisponíveis"} nesta
          cor.
        </p>
      ) : null}
    </div>
  );
}
