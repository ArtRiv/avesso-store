import { cn } from "@/lib/utils";

/**
 * The design's only loading motion (docs/design-system.md §2): a 2px hairline
 * rail with a 30% rust fill sweeping across it, 1.8s linear, forever.
 *
 * §7 forbids a spinner outright, and the brief forbids installing one. This is
 * what goes on the screen while the payment webhook is still in flight
 * (artboard 08) and anywhere else the store is honestly waiting.
 */
export function WaitBar({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <div
      className={cn("h-0.5 w-full overflow-hidden bg-hairline", className)}
      role="progressbar"
      aria-label={label}
    >
      <div className="animate-wait-bar h-full w-[30%] bg-rust" />
    </div>
  );
}
