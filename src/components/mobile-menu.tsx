"use client";

import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { StoreLogo } from "@/components/store-logo";
import { textLinkClass } from "@/components/text-link";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation menu for the storefront.
 *
 * It provides access to the categories when the screen is too narrow for the
 * header's main nav. It follows the design's "no icon library" rule by using
 * plain text "Menu" and "Fechar" triggers.
 */
export function MobileMenu({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={cn(textLinkClass, "type-meta md:hidden")}>
        Menu
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/10 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[280px] flex-col border-l border-hairline bg-paper p-8 outline-none">
          <div className="mb-16 flex items-center justify-between">
            <span className="type-meta text-muted">Menu</span>
            <Dialog.Close className={cn(textLinkClass, "type-meta")}>
              Fechar
            </Dialog.Close>
          </div>

          <nav className="flex flex-col gap-6">
            <Link
              href="/catalogo"
              className={cn(textLinkClass, "text-h3")}
              onClick={() => setOpen(false)}
            >
              Todas as peças
            </Link>
            <div className="h-px w-full bg-hairline" />
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalogo?categoria=${category.slug}`}
                className={cn(textLinkClass, "text-h3")}
                onClick={() => setOpen(false)}
              >
                {category.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-8">
            <div className="type-meta text-muted">
              <StoreLogo className="text-[12px] tracking-[0.16em]" />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
