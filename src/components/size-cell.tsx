import { cn } from "@/lib/utils";

/**
 * docs/design-system.md §2. 48×48, and an unavailable size is **struck
 * through, never hidden** — the customer learns the piece exists in their size
 * and is out, which a missing cell would not tell them.
 */
export function SizeCell({
  label,
  state,
  onSelect,
}: {
  label: string;
  state: "selected" | "available" | "unavailable";
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={state === "unavailable"}
      aria-pressed={state === "selected"}
      onClick={onSelect}
      className={cn(
        "size-12 border font-mono text-[14px] leading-none font-medium tracking-[0.04em]",
        "outline-none focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2",
        state === "selected" && "border-ink bg-paper",
        state === "available" && "border-hairline bg-transparent",
        state === "unavailable" &&
          "border-hairline bg-transparent text-muted line-through",
      )}
    >
      {label}
    </button>
  );
}
