import { cn } from "@/lib/utils";
import { toneClass, toneFor, toneLabelClass } from "@/lib/product-tone";

/**
 * A piece's image (docs/design-system.md §4). Until real photography exists
 * this is a solid block in the piece's tone with its name in mono at the bottom
 * left — deliberately, because a broken-image icon is worse and an empty box
 * lies about the layout.
 *
 * `imageUrls` on the API is a list of plain URLs and is empty for all twelve
 * products today. When it fills, the photo goes in this same box at this same
 * ratio and the label comes off.
 */
export function ProductImage({
  slug,
  name,
  ratio = "4/5",
  className,
}: {
  slug: string;
  name: string;
  ratio?: "4/5" | "16/9";
  className?: string;
}) {
  const tone = toneFor(slug);

  return (
    <div
      className={cn(
        "relative border border-hairline",
        ratio === "4/5" ? "aspect-4/5" : "aspect-video",
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
        {name}
      </span>
    </div>
  );
}
