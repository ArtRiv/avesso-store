"use client";

import { Checkbox, Dialog } from "radix-ui";
import { useState } from "react";

import { CheckIcon } from "@/components/admin-icons";
import { Button } from "@/components/ui/button";

/**
 * Removing a size — the one place the panel destroys data that belongs to
 * someone else.
 *
 * The API asks for two things and this asks for one. `discardCartLines=true`
 * authorises the destruction and `expectedCartLineCount=N` confirms its size,
 * and they travel together as a single checkbox whose sentence contains the
 * number:
 *
 *     Autorizo descartar as 3 linhas de carrinho que revisei.
 *
 * There is no second field for the count, and there must never be one. A
 * separate number input would let an operator authorise a quantity they never
 * read — which is exactly the thing the two-part confirmation exists to
 * prevent. The count lives inside the sentence being accepted, so it cannot be
 * agreed to without being read.
 *
 * If the count changes between the warning and the confirmation, the API
 * refuses in either direction and returns the new number. The box then
 * unchecks itself, because the authorisation was for three and three is no
 * longer true.
 *
 * ## One divergence from the canvas, and why
 *
 * The canvas opens this dialog already knowing "está em 3 sacolas". No route
 * reports that count without attempting the deletion — the number only exists
 * inside the 409. So the first step here is a plain confirmation carrying no
 * number, and the checkbox appears only once the API has said there is cart
 * data at risk. The invariant the design cares about is intact: no cart line
 * is destroyed without the operator reading the count and accepting it.
 * Recorded in README under "Divergências conhecidas".
 */
type Stage =
  /** Opened. The count is unknown until the API is asked. */
  | { kind: "confirm" }
  /** Carts hold this size. `count` is what the API just said. */
  | { kind: "carts"; count: number; changedFrom: number | null }
  /** Sold, or the last size. No confirmation passes over this. */
  | { kind: "blocked" }
  | { kind: "error"; message: string };

export function RemoveVariantDialog({
  label,
  isLast,
  open,
  onOpenChange,
  onRemove,
  onRename,
}: {
  label: string;
  /** Known locally — a product always keeps at least one size. */
  isLast: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Attempts the deletion. `expected` null means "no authorisation sent",
   * which is how the count is learned in the first place.
   */
  onRemove: (expected: number | null) => Promise<
    | { ok: true }
    | { ok: false; reason: "carts"; count: number }
    | { ok: false; reason: "blocked" }
    | { ok: false; reason: "error"; message: string }
  >;
  onRename: () => void;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "confirm" });
  const [authorised, setAuthorised] = useState(false);
  const [busy, setBusy] = useState(false);

  function reset() {
    setStage(isLast ? { kind: "blocked" } : { kind: "confirm" });
    setAuthorised(false);
    setBusy(false);
  }

  async function attempt(expected: number | null) {
    setBusy(true);
    const result = await onRemove(expected);
    setBusy(false);

    if (result.ok) {
      onOpenChange(false);
      return;
    }

    if (result.reason === "carts") {
      setStage((current) => ({
        kind: "carts",
        count: result.count,
        // Only a SECOND refusal is "the number moved". The first one is the
        // panel learning the number for the first time.
        changedFrom:
          current.kind === "carts" && current.count !== result.count
            ? current.count
            : null,
      }));
      // The authorisation was for the old number. It is not for this one.
      setAuthorised(false);
      return;
    }

    if (result.reason === "blocked") {
      setStage({ kind: "blocked" });
      return;
    }

    setStage({ kind: "error", message: result.message });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next) {
          reset();
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/25" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[min(440px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 border border-ink bg-paper p-7 outline-none">
          {stage.kind === "blocked" ? (
            <Blocked
              label={label}
              isLast={isLast}
              onClose={() => {
                onOpenChange(false);
              }}
              onRename={() => {
                onOpenChange(false);
                onRename();
              }}
            />
          ) : (
            <form
              className="flex flex-col gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                void attempt(stage.kind === "carts" ? stage.count : null);
              }}
            >
              <Dialog.Title className="font-heading text-h3">
                Remover o tamanho {label}?
              </Dialog.Title>

              {stage.kind === "carts" ? (
                <>
                  {stage.changedFrom === null ? (
                    <Dialog.Description className="text-[15px] leading-relaxed">
                      Este tamanho está em{" "}
                      <strong className="font-mono text-[15px] tabular-nums">
                        {stage.count}
                      </strong>{" "}
                      {stage.count === 1 ? "sacola" : "sacolas"}. Removê-lo
                      apaga {stage.count === 1 ? "essa linha" : "essas linhas"}{" "}
                      — as pessoas perdem o item sem aviso.
                    </Dialog.Description>
                  ) : (
                    <div className="flex flex-col gap-1.5 border-l-2 border-rust py-3 pl-3.5">
                      <span className="type-meta text-rust">
                        Nada foi removido
                      </span>
                      <Dialog.Description className="text-[15px] leading-relaxed">
                        A contagem mudou enquanto você lia. {" "}
                        {stage.changedFrom > stage.count ? "Eram" : "Era"}{" "}
                        <span className="font-mono text-[15px] tabular-nums">
                          {stage.changedFrom}
                        </span>
                        , agora{" "}
                        {stage.count === 1 ? "é" : "são"}{" "}
                        <strong className="font-mono text-[15px] tabular-nums">
                          {stage.count}
                        </strong>
                        .
                      </Dialog.Description>
                    </div>
                  )}

                  {/*
                    The two halves of the API's confirmation, as one gesture.
                    The number is inside the sentence being accepted — never a
                    field of its own, which would let someone authorise a
                    quantity they never read.
                  */}
                  <label className="flex cursor-pointer items-start gap-3 border-t border-admin-hairline pt-4.5">
                    <Checkbox.Root
                      checked={authorised}
                      onCheckedChange={(next) => {
                        setAuthorised(next === true);
                      }}
                      className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[2px] border border-ink bg-paper outline-none data-[state=checked]:bg-ink focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2"
                    >
                      <Checkbox.Indicator className="text-paper">
                        <CheckIcon />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span className="text-[15px] leading-relaxed">
                      Autorizo descartar{" "}
                      {stage.count === 1 ? "a" : "as"}{" "}
                      <strong className="font-mono text-[15px] tabular-nums">
                        {stage.count}
                      </strong>{" "}
                      {stage.count === 1
                        ? "linha de carrinho que revisei"
                        : "linhas de carrinho que revisei"}
                      .
                    </span>
                  </label>
                </>
              ) : stage.kind === "error" ? (
                <Dialog.Description className="text-[15px] leading-relaxed text-clay">
                  {stage.message}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="text-[15px] leading-relaxed">
                  O tamanho sai do catálogo. Se alguém estiver com ele na
                  sacola, você vai ser avisado antes de qualquer coisa ser
                  apagada.
                </Dialog.Description>
              )}

              <div className="flex justify-end gap-2.5">
                <Dialog.Close asChild>
                  <Button type="button" variant="secondary" size="admin-lg">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  variant="danger"
                  size="admin-lg"
                  disabled={
                    busy || (stage.kind === "carts" && !authorised)
                  }
                >
                  {busy ? "Removendo" : "Remover tamanho"}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The refusal with no door.
 *
 * A size somebody bought stays forever: order items point at it and the
 * database RESTRICTs the delete. Renaming is the way out, and it costs history
 * nothing — `OrderItem.variantLabel` is a snapshot taken at purchase, so
 * changing the label here cannot rewrite a sale.
 *
 * The last size is the same dialog with a different reason: a product with no
 * sizes is unbuyable, so archiving the product is the other door.
 */
function Blocked({
  label,
  isLast,
  onClose,
  onRename,
}: {
  label: string;
  isLast: boolean;
  onClose: () => void;
  onRename: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Dialog.Title className="font-heading text-h3">
        O tamanho {label} não pode ser removido
      </Dialog.Title>

      <Dialog.Description className="text-[15px] leading-relaxed">
        {isLast
          ? "É o último tamanho deste produto, e um produto sem tamanho não pode ser comprado. Para tirar a peça da loja, arquive o produto."
          : "Alguém comprou este tamanho. Pedido é registro financeiro, e o banco recusa apagar o que ele aponta — não há confirmação que passe por cima."}
      </Dialog.Description>

      <div className="flex flex-col gap-2 border-t border-admin-hairline pt-4.5">
        <span className="type-meta text-muted">O que dá para fazer</span>
        <p className="text-[15px] leading-relaxed">
          {isLast ? (
            <>
              <strong>Arquivar o produto</strong> tira a peça da loja e mantém o
              histórico intacto.
            </>
          ) : (
            <>
              <strong>Renomear</strong> resolve o mesmo problema: o rótulo do
              pedido é uma cópia congelada, então trocar o nome não reescreve
              venda nenhuma.
            </>
          )}
        </p>
      </div>

      <div className="flex justify-end gap-2.5">
        <Button variant="secondary" size="admin-lg" onClick={onClose}>
          Fechar
        </Button>
        {isLast ? null : (
          <Button size="admin-lg" onClick={onRename}>
            Renomear
          </Button>
        )}
      </div>
    </div>
  );
}
