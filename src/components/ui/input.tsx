import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Restyled to docs/design-system.md §2: 48px tall, 1px hairline border, 2px
 * radius, paper fill, 16px Archivo. Filled turns the border ink, error turns
 * it clay, and focus is a 1px ink border rather than a coloured glow.
 *
 * CEP and other numeric fields carry `font-mono` from the caller (§2). It is
 * not a prop because it is a typographic choice about one field's content, not
 * a state the component can work out for itself.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-[2px] border border-hairline bg-paper px-4",
        "text-[16px] text-ink transition-colors duration-100 outline-none",
        "placeholder:text-muted",
        // A field the customer has filled reads as ink (§2). This only fires
        // where there is a placeholder to stop showing, which is every field in
        // the design.
        "[&:not(:placeholder-shown)]:border-ink",
        "focus-visible:border-ink",
        "aria-invalid:border-clay",
        "disabled:pointer-events-none disabled:bg-warm disabled:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
