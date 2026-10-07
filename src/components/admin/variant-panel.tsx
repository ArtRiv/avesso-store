"use client";

import { useRef, useState } from "react";

import {
  DragHandleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/admin-icons";
import { RemoveVariantDialog } from "@/components/admin/remove-variant-dialog";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apiFetch,
  GENERIC_FALLBACK,
  problemMessage,
  SessionEndedError,
} from "@/lib/api/browser";
import type { components } from "@/lib/api/schema";

type Product = components["schemas"]["ProductResponse"];
type Variant = components["schemas"]["ProductVariantResponse"];

/**
 * The sizes panel — the unit the store actually sells.
 *
 * Every operation here is its own route with its own refusals, which is why
 * this saves independently of the details card above it. Each one answers with
 * the whole product, so the panel never patches its own state from a request
 * body: it replaces what it holds with what the server said, and the two
 * cannot drift.
 *
 * Removal goes through its own dialog, because two of its three refusals are
 * things only the API can tell us and the third destroys other people's cart
 * lines. The panel knows exactly one of them locally — a product always keeps
 * at least one size — so the trash on a lone size opens straight into the
 * refusal rather than spending a request to be told.
 */
export function VariantPanel({
  productId,
  variants,
  totalStock,
  onProductChange,
}: {
  productId: string;
  variants: Variant[];
  totalStock: number;
  onProductChange: (product: Product) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  /**
   * The order being dragged, held apart from the server's copy so the rows
   * follow the pointer without a round trip per pixel. Null whenever a drag is
   * not in progress — the server's list is the truth the rest of the time.
   */
  const [dragOrder, setDragOrder] = useState<Variant[] | null>(null);
  const dragFrom = useRef<number | null>(null);

  /** The size whose removal dialog is open, if any. */
  const [removing, setRemoving] = useState<Variant | null>(null);

  const rows = dragOrder ?? variants;

  async function send(
    path: string,
    init: RequestInit,
    onDone?: () => void,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch(path, init);

      if (!response.ok) {
        setError(await problemMessage(response));
        return false;
      }

      onProductChange((await response.json()) as Product);
      onDone?.();
      return true;
    } catch (caught) {
      setError(
        caught instanceof SessionEndedError
          ? caught.message
          : GENERIC_FALLBACK,
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  function commitOrder(next: Variant[]) {
    // Optimistic: the rows stay where they were dropped while the request is
    // in flight. `dragOrder` is cleared only when the server has answered, so
    // a refusal snaps them back to the ordering that is actually stored.
    setDragOrder(next);

    void send(
      `/api/admin/products/${productId}/variants/order`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        // The whole list, every time. A partial one is a 400 upstream rather
        // than a partial reorder — it does not say where the omitted sizes go.
        body: JSON.stringify({ variantIds: next.map((v) => v.id) }),
      },
    ).finally(() => {
      setDragOrder(null);
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) {
      return;
    }

    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commitOrder(next);
  }

  return (
    <section className="flex flex-col gap-5 border border-admin-hairline bg-paper p-7">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="type-meta">Tamanhos</h2>
          <p className="text-[13px] text-muted">
            A unidade vendável. Arraste para reordenar — a ordem é salva como
            lista inteira.
          </p>
        </div>
        <span className="type-meta shrink-0 text-muted">
          Estoque total
          <span className="ml-1.5 font-mono text-[14px] tabular-nums text-ink">
            {totalStock}
          </span>
        </span>
      </div>

      {error ? (
        <p role="alert" className="text-[13px] text-clay">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col">
        <div className="grid grid-cols-[32px_1fr_120px_96px] items-center gap-4 border-b border-admin-hairline pb-2.5">
          <span />
          <span className="type-meta text-admin-dim">Rótulo</span>
          <span className="type-meta text-right text-admin-dim">Estoque</span>
          <span />
        </div>

        {rows.map((variant, index) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            index={index}
            renaming={renaming === variant.id}
            renameError={renaming === variant.id ? renameError : null}
            busy={busy}
            onDragStart={() => {
              dragFrom.current = index;
              setDragOrder(rows);
            }}
            onDragOver={(over) => {
              const from = dragFrom.current;

              if (from === null || from === over) {
                return;
              }

              const next = [...rows];
              const [moved] = next.splice(from, 1);
              next.splice(over, 0, moved);
              dragFrom.current = over;
              setDragOrder(next);
            }}
            onDrop={() => {
              dragFrom.current = null;
              commitOrder(rows);
            }}
            onMove={(direction) => {
              move(index, index + direction);
            }}
            onStartRename={() => {
              setRenameError(null);
              setRenaming(variant.id);
            }}
            onCancelRename={() => {
              setRenameError(null);
              setRenaming(null);
            }}
            onRename={async (data) => {
              if (
                data.label === variant.label &&
                data.heightCm === (variant.heightCm ?? null) &&
                data.widthCm === (variant.widthCm ?? null) &&
                data.lengthCm === (variant.lengthCm ?? null)
              ) {
                setRenaming(null);
                return;
              }

              setRenameError(null);

              const response = await apiFetch(
                `/api/admin/products/${productId}/variants/${variant.id}`,
                {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(data),
                },
              );

              if (!response.ok) {
                setRenameError(await problemMessage(response));
                return;
              }

              onProductChange((await response.json()) as Product);
              setRenaming(null);
            }}
            onStock={(quantity) =>
              send(
                `/api/admin/products/${productId}/variants/${variant.id}/stock`,
                {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ quantity }),
                },
              )
            }
            onRemove={() => {
              setRemoving(variant);
            }}
            onUnarchive={async () => {
              await send(
                `/api/admin/products/${productId}/variants/${variant.id}/unarchive`,
                { method: "PATCH" },
              );
            }}
          />
        ))}
      </div>

      {removing ? (
        <RemoveVariantDialog
          key={removing.id}
          label={removing.label}
          isLast={variants.length === 1}
          open
          onOpenChange={(next) => {
            if (!next) {
              setRemoving(null);
            }
          }}
          onRename={() => {
            setRenameError(null);
            setRenaming(removing.id);
          }}
          onArchive={async () => {
            const ok = await send(
              `/api/admin/products/${productId}/variants/${removing.id}/archive`,
              { method: "PATCH" },
            );
            if (ok) {
              setRemoving(null);
            }
          }}
          onRemove={async (expected) => {
            const query =
              expected === null
                ? ""
                : `?discardCartLines=true&expectedCartLineCount=${String(expected)}`;

            try {
              const response = await apiFetch(
                `/api/admin/products/${productId}/variants/${removing.id}${query}`,
                { method: "DELETE" },
              );

              if (response.ok) {
                onProductChange((await response.json()) as Product);
                return { ok: true as const };
              }

              if (response.status === 409) {
                const body = (await response.json()) as {
                  reason?: string;
                  cartLineCount?: number;
                };

                // The count is the whole mechanism — it renumbers the sentence
                // and clears the box. A refusal without one has no way through.
                return body.reason === "carts" &&
                  typeof body.cartLineCount === "number"
                  ? {
                      ok: false as const,
                      reason: "carts" as const,
                      count: body.cartLineCount,
                    }
                  : { ok: false as const, reason: "blocked" as const };
              }

              return {
                ok: false as const,
                reason: "error" as const,
                message: await problemMessage(response),
              };
            } catch (caught) {
              return {
                ok: false as const,
                reason: "error" as const,
                message:
                  caught instanceof SessionEndedError
                    ? caught.message
                    : "Não foi possível remover. Tente novamente em instantes.",
              };
            }
          }}
        />
      ) : null}

      <div className="flex items-center justify-between gap-4">
        {adding ? (
          <AddVariant
            busy={busy}
            onCancel={() => {
              setAdding(false);
            }}
            onAdd={async (newVariant) => {
              const ok = await send(
                `/api/admin/products/${productId}/variants`,
                {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(newVariant),
                },
              );

              if (ok) {
                setAdding(false);
              }
            }}
          />
        ) : (
          <Button
            variant="secondary"
            size="admin"
            onClick={() => {
              setAdding(true);
            }}
          >
            <PlusIcon />
            Adicionar tamanho
          </Button>
        )}
        <span className="type-meta text-[11px] text-admin-dim">
          Um produto nunca fica sem tamanho
        </span>
      </div>
    </section>
  );
}

function VariantRow({
  variant,
  index,
  renaming,
  renameError,
  busy,
  onDragStart,
  onDragOver,
  onDrop,
  onMove,
  onStartRename,
  onCancelRename,
  onRename,
  onStock,
  onRemove,
  onUnarchive,
}: {
  variant: Variant;
  index: number;
  renaming: boolean;
  renameError: string | null;
  busy: boolean;
  onDragStart: () => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
  onMove: (direction: 1 | -1) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onRename: (data: {
    label: string;
    heightCm?: number | null;
    widthCm?: number | null;
    lengthCm?: number | null;
  }) => Promise<void>;
  onStock: (quantity: number) => Promise<boolean>;
  onRemove: () => void;
  onUnarchive: () => Promise<void>;
}) {
  const soldOut = variant.stockQuantity === 0;

  return (
    <div
      draggable={!renaming}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(index);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDrop}
      className={`grid grid-cols-[32px_1fr_120px_96px] items-center gap-4 border-b border-admin-hairline py-3 ${
        renaming ? "items-start bg-[#FAF9F7]" : ""
      }`}
    >
      {/*
        A real button, not a decorative grip. Dragging is a pointer gesture and
        some people do not have one — ArrowUp and ArrowDown move the row, which
        costs a keyboard user nothing to discover and costs everyone else
        nothing at all.
      */}
      <button
        type="button"
        aria-label={`Mover ${variant.label}`}
        disabled={busy || renaming}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            onMove(-1);
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            onMove(1);
          }
        }}
        className="cursor-grab text-admin-dim outline-none focus-visible:outline-1 focus-visible:outline-ink disabled:cursor-default"
      >
        <DragHandleIcon />
      </button>

      {renaming ? (
        <RenameField
          label={variant.label}
          heightCm={variant.heightCm}
          widthCm={variant.widthCm}
          lengthCm={variant.lengthCm}
          error={renameError}
          onCancel={onCancelRename}
          onSubmit={onRename}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[15px] font-medium">
            {variant.label}
          </span>
          {variant.isArchived ? (
            <Badge tone="dim" className="px-1.5 py-0.5 text-[11px]">
              Arquivado
            </Badge>
          ) : soldOut ? (
            <Badge tone="clay" className="px-1.5 py-0.5 text-[11px]">
              Esgotado
            </Badge>
          ) : null}
          {variant.heightCm && variant.widthCm && variant.lengthCm ? (
            <span className="font-mono text-[11px] text-admin-dim">
              {variant.heightCm}×{variant.widthCm}×{variant.lengthCm} cm
            </span>
          ) : null}
        </div>
      )}

      <StockField
        key={variant.stockQuantity}
        value={variant.stockQuantity}
        disabled={busy || renaming || variant.isArchived}
        onCommit={onStock}
      />

      <div className="flex justify-end gap-3">
        {renaming ? null : variant.isArchived ? (
          <button
            type="button"
            aria-label={`Desarquivar ${variant.label}`}
            disabled={busy}
            onClick={onUnarchive}
            className="type-meta text-[11px] text-muted outline-none hover:text-ink focus-visible:outline-1 focus-visible:outline-ink disabled:text-admin-hairline cursor-pointer"
          >
            Desarquivar
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label={`Renomear ${variant.label}`}
              disabled={busy}
              onClick={onStartRename}
              className="text-muted outline-none hover:text-ink focus-visible:outline-1 focus-visible:outline-ink disabled:text-admin-hairline"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              aria-label={`Remover ${variant.label}`}
              disabled={busy}
              onClick={onRemove}
              className="text-muted outline-none hover:text-clay focus-visible:outline-1 focus-visible:outline-ink disabled:text-admin-hairline"
            >
              <TrashIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** The inline rename, where a duplicate label lands as a field error. */
function RenameField({
  label,
  heightCm: initialHeight,
  widthCm: initialWidth,
  lengthCm: initialLength,
  error,
  onCancel,
  onSubmit,
}: {
  label: string;
  heightCm?: number | null;
  widthCm?: number | null;
  lengthCm?: number | null;
  error: string | null;
  onCancel: () => void;
  onSubmit: (data: {
    label: string;
    heightCm?: number | null;
    widthCm?: number | null;
    lengthCm?: number | null;
  }) => Promise<void>;
}) {
  const [value, setValue] = useState(label);
  const [height, setHeight] = useState(initialHeight ? String(initialHeight) : "");
  const [width, setWidth] = useState(initialWidth ? String(initialWidth) : "");
  const [length, setLength] = useState(initialLength ? String(initialLength) : "");

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();

        if (trimmed.length > 0) {
          void onSubmit({
            label: trimmed,
            heightCm: height ? Number(height) : null,
            widthCm: width ? Number(width) : null,
            lengthCm: length ? Number(length) : null,
          });
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          autoFocus
          inputSize="admin-sm"
          maxLength={20}
          value={value}
          aria-invalid={error !== null}
          aria-label="Novo rótulo"
          className="w-24 font-mono"
          onChange={(event) => {
            setValue(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onCancel();
            }
          }}
        />
        <Input
          inputSize="admin-sm"
          type="number"
          min={1}
          placeholder="Alt (cm)"
          value={height}
          className="w-16 font-mono text-[12px]"
          onChange={(e) => setHeight(e.target.value)}
        />
        <Input
          inputSize="admin-sm"
          type="number"
          min={1}
          placeholder="Larg (cm)"
          value={width}
          className="w-16 font-mono text-[12px]"
          onChange={(e) => setWidth(e.target.value)}
        />
        <Input
          inputSize="admin-sm"
          type="number"
          min={1}
          placeholder="Comp (cm)"
          value={length}
          className="w-16 font-mono text-[12px]"
          onChange={(e) => setLength(e.target.value)}
        />
      </div>
      {error ? <p className="text-[13px] text-clay">{error}</p> : null}
      <div className="flex gap-3">
        <button type="submit" className="type-meta text-[11px] hover:text-rust">
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="type-meta text-[11px] text-muted hover:text-rust"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/**
 * Stock for one size, committed on blur or Enter.
 *
 * Absolute, never a delta — "the shelf holds N". The field is keyed on the
 * server's value upstream, so a successful save remounts it and an abandoned
 * edit cannot linger looking saved.
 */
function StockField({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (quantity: number) => Promise<boolean>;
}) {
  const [text, setText] = useState(String(value));

  function commit() {
    const quantity = Number(text);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setText(String(value));
      return;
    }

    if (quantity !== value) {
      void onCommit(quantity);
    }
  }

  return (
    <Input
      inputSize="admin-sm"
      inputMode="numeric"
      disabled={disabled}
      value={text}
      aria-label="Estoque"
      className="text-right font-mono tabular-nums"
      onChange={(event) => {
        setText(event.target.value);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          setText(String(value));
        }
      }}
    />
  );
}

/** The new-size row. Position is the API's to choose: it appends. */
function AddVariant({
  busy,
  onAdd,
  onCancel,
}: {
  busy: boolean;
  onAdd: (data: {
    label: string;
    heightCm?: number;
    widthCm?: number;
    lengthCm?: number;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [height, setHeight] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");

  return (
    <form
      className="flex flex-wrap items-center gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = label.trim();

        if (trimmed.length > 0) {
          void onAdd({
            label: trimmed,
            heightCm: height ? Number(height) : undefined,
            widthCm: width ? Number(width) : undefined,
            lengthCm: length ? Number(length) : undefined,
          });
        }
      }}
    >
      <Input
        autoFocus
        inputSize="admin"
        maxLength={20}
        value={label}
        placeholder="P, M, G…"
        aria-label="Rótulo do novo tamanho"
        className="w-28 font-mono"
        onChange={(event) => {
          setLabel(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
        }}
      />
      <Input
        inputSize="admin"
        type="number"
        min={1}
        placeholder="Alt (cm)"
        value={height}
        className="w-24 font-mono text-[12px]"
        onChange={(e) => setHeight(e.target.value)}
      />
      <Input
        inputSize="admin"
        type="number"
        min={1}
        placeholder="Larg (cm)"
        value={width}
        className="w-24 font-mono text-[12px]"
        onChange={(e) => setWidth(e.target.value)}
      />
      <Input
        inputSize="admin"
        type="number"
        min={1}
        placeholder="Comp (cm)"
        value={length}
        className="w-24 font-mono text-[12px]"
        onChange={(e) => setLength(e.target.value)}
      />
      <Button type="submit" size="admin" disabled={busy || label.trim() === ""}>
        Adicionar
      </Button>
      <Button type="button" variant="ghost" size="admin" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  );
}
