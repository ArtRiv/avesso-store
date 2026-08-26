import { cn } from "@/lib/utils";
import { toneClass, toneLabelClass, type Tone } from "@/lib/product-tone";

/**
 * A placeholder image (docs/design-system.md §4): a solid block in one of the
 * five image tones, hairline border, and a label in mono at the bottom left.
 *
 * The canvas uses no photography at all — every image on every artboard is one
 * of these. So this is not a fallback that shows when something failed; it is
 * what the design specifies, and it holds the layout honestly until real
 * photography exists.
 */
export function ToneBlock({
  tone,
  label,
  aspect = "aspect-4/5",
  className,
}: {
  tone: Tone;
  label: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative border border-hairline",
        aspect,
        toneClass(tone),
        className,
      )}
    >
      <span
        className={cn(
          "absolute bottom-3 left-3 font-mono text-[11px] leading-[1.2] tracking-[0.06em] uppercase",
          toneLabelClass(tone),
        )}
      >
        {label}
      </span>
    </div>
  );
}
