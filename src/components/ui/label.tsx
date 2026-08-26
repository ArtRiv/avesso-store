"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Sits above its field, in the meta role and muted (docs/design-system.md §2).
 * The error state is clay, which the caller passes as `text-clay` — the label
 * cannot see its field's validity, and guessing it from the DOM would be a
 * worse lie than an explicit prop at the call site.
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "type-meta flex items-center gap-2 text-muted select-none",
        "group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
