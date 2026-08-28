"use client";

import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/button";

/**
 * Deleting a category.
 *
 * Deliberately NOT the removal dialog's two-part confirmation, and the
 * difference is the point. Removing a size destroys other people's cart lines,
 * so it demands an authorisation carrying the count. Deleting a category
 * destroys nothing: no order references one, the pieces attached to it survive
 * and simply lose the association, and a product in no category is valid.
 *
 * So this is a plain confirmation that names the consequence honestly. Copy
 * that borrowed the size dialog's gravity would be teaching an operator to
 * click through a warning that usually does not matter — which is exactly how
 * the one that does matter stops being read.
 *
 * The piece count is shown because it is the only thing actually at stake:
 * those products lose a category and drop out of that filter on the store.
 */
export function DeleteCategoryDialog({
  name,
  pieceCount,
  open,
  busy,
  onOpenChange,
  onConfirm,
}: {
  name: string;
  pieceCount: number;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/25" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[min(440px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 border border-ink bg-paper p-7 outline-none">
          <div className="flex flex-col gap-5">
            <Dialog.Title className="font-heading text-h3">
              Apagar a categoria {name}?
            </Dialog.Title>

            <Dialog.Description className="text-[15px] leading-relaxed">
              {pieceCount === 0 ? (
                <>Nenhuma peça está nesta categoria. Nada mais muda.</>
              ) : (
                <>
                  <strong className="font-mono text-[15px] tabular-nums">
                    {pieceCount}
                  </strong>{" "}
                  {pieceCount === 1 ? "peça sai" : "peças saem"} desta
                  categoria e {pieceCount === 1 ? "deixa" : "deixam"} de
                  aparecer no filtro da loja.{" "}
                  {pieceCount === 1 ? "Ela continua" : "Elas continuam"}{" "}
                  existindo, sem categoria — o que é um estado válido.
                </>
              )}
            </Dialog.Description>

            <div className="flex justify-end gap-2.5">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" size="admin-lg">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                variant="destructive"
                size="admin-lg"
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? "Apagando" : "Apagar categoria"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
