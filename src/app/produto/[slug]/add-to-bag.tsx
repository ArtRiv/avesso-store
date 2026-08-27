"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import { AuthPanel } from "@/components/auth-panel";
import { SignInForm } from "@/components/sign-in-form";
import { SizeCell } from "@/components/size-cell";
import { StockBadge } from "@/components/badge";
import { Button } from "@/components/ui/button";

/**
 * The sizes the design shows, and the one place this store still draws
 * something the API cannot back.
 *
 * `POST /cart/items` takes `{ productId, quantity }` and nothing else, so the
 * chosen size is held in state and **sent nowhere**. Inventing a field the
 * OpenAPI document does not have is the one thing this build must never do.
 *
 * That is temporary rather than permanent: product variants are open upstream
 * as commerce-core PR #19, which makes the size the sellable unit and gives
 * every size its own stock. When it deploys, this list stops being a constant
 * and becomes `product.variants`, `GG` stops being hard-coded as unavailable
 * and becomes a variant with zero stock, and the request body carries
 * `variantId`. Until then the row is the design's target state, honestly
 * inert. See README.md under "Divergências conhecidas".
 */
const SIZES = ["P", "M", "G", "GG", "XGG"] as const;
const UNAVAILABLE: readonly string[] = ["GG"];

type Panel = "none" | "signIn";

export function AddToBag({
  productId,
  stockQuantity,
}: {
  productId: string;
  stockQuantity: number;
}) {
  const router = useRouter();
  const [size, setSize] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const soldOut = stockQuantity <= 0;

  async function addToBag() {
    setPending(true);
    setError(null);

    try {
      const response = await apiFetch("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
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
      // The header's sacola is rendered on the server, so it only learns about
      // this if the route re-renders.
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof SessionEndedError
          ? "A sessão expirou. Entre novamente."
          : "Não conseguimos falar com o servidor. Tente de novo.",
      );

      if (caught instanceof SessionEndedError) {
        setPanel("signIn");
      }
    } finally {
      setPending(false);
    }
  }

  if (panel === "signIn") {
    return (
      <div className="flex flex-col gap-6">
        <SizeRow size={size} onSelect={setSize} soldOut={soldOut} />

        <AuthPanel
          title="Entre para montar sua sacola"
          note={`A peça${size ? ` e o tamanho ${size}` : ""} ${size ? "ficam" : "fica"} guardad${size ? "os" : "a"}. Você continua nesta página.`}
        >
          <SignInForm
            onDone={() => {
              setPanel("none");
              // Finish what the customer was doing before the wall appeared.
              void addToBag();
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
      <SizeRow size={size} onSelect={setSize} soldOut={soldOut} />

      <div className="flex flex-col gap-4">
        <StockBadge stockQuantity={stockQuantity} />

        <Button
          className="w-full"
          disabled={soldOut || !size || pending}
          onClick={() => void addToBag()}
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

        {!soldOut && !size ? (
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
  size,
  onSelect,
  soldOut,
}: {
  size: string | null;
  onSelect: (value: string) => void;
  soldOut: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="type-meta text-muted">Tamanho</h2>
        <span className="type-meta text-muted">Guia de medidas</span>
      </div>

      <div className="flex gap-2">
        {SIZES.map((label) => {
          const unavailable = soldOut || UNAVAILABLE.includes(label);

          return (
            <SizeCell
              key={label}
              label={label}
              state={
                unavailable
                  ? "unavailable"
                  : size === label
                    ? "selected"
                    : "available"
              }
              onSelect={() => onSelect(label)}
            />
          );
        })}
      </div>

      <p className="text-small text-muted">GG indisponível nesta cor.</p>
    </div>
  );
}
