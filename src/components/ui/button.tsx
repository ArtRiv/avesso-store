import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Restyled to docs/design-system.md §2. Nothing of stock shadcn survives here
 * except the API — the rounded corners, the shadow, the ring-3 focus glow, the
 * opacity-based disabled state and the 32px default height were all replaced.
 *
 * Hover is the one place this goes past the contract. The canvas declares
 * exactly one hover rule, `color:#B0431E` on links, and no transitions at all,
 * so the design says nothing about how a button should answer a pointer. A
 * button with no feedback is worse than the design intends rather than truer
 * to it, so: links take the rust the canvas specifies, the secondary button
 * inverts into ink and paper — tokens it already owns — and the filled buttons
 * dim slightly. No new colour is invented, and rust stays rationed to the four
 * places §1 allows it.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none",
    "font-mono text-[12px] leading-none font-medium tracking-[0.08em] uppercase",
    "rounded-[2px] border border-transparent",
    "transition-colors duration-100",
    "outline-none focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2",
    // Disabled is a real colour change (§2), not a translucent version of the
    // enabled button: hairline fill, muted label, no border.
    "disabled:pointer-events-none disabled:border-transparent disabled:bg-hairline disabled:text-muted",
    // The design has four icons and they are all 20x20 (§2).
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: "bg-ink text-paper hover:opacity-90",
        secondary:
          "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
        // Stock conflict only (artboard 10). Rust is rationed — see §1 before
        // reaching for this anywhere else.
        recovery: "bg-rust text-paper hover:opacity-90",
        ghost: "bg-transparent text-ink hover:text-rust",
        // Back office. `destructive` cancels an order and `danger` removes a
        // size or refunds — clay for the state that ends a thing, rust for
        // the one that destroys data or moves money back. Rust here is the
        // same ration §1 allows: it marks the act you cannot undo.
        destructive:
          "border-clay bg-transparent text-clay hover:bg-clay hover:text-paper",
        danger: "bg-rust text-paper hover:opacity-90",
        "danger-outline":
          "border-rust bg-transparent text-rust hover:bg-rust hover:text-paper",
        // There is no `link` variant on purpose. A link in this design is body
        // text with a rust hover, not a 48px mono uppercase control — see
        // src/components/text-link.tsx.
      },
      size: {
        // The 48px control height everything in the design snaps to.
        default: "h-12 gap-2 px-6",
        icon: "size-12",
        // The sacola stepper and other inline controls sitting on a hairline.
        compact: "h-8 gap-1.5 px-3",
        "icon-compact": "size-8",
        // The back office runs tighter than the store: the canvas draws page
        // actions at 40px and dialog actions at 44px, against the store's 48.
        // A denser screen earns a denser control; the type inside is unchanged.
        admin: "h-10 gap-2.5 px-[18px]",
        "admin-lg": "h-11 gap-2.5 px-5",
        "icon-admin": "size-10",
        // A link is text, so it carries no control box at all.
        inline: "h-auto p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
