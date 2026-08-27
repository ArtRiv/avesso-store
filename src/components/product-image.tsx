import { ToneBlock } from "@/components/tone-block";
import { toneFor } from "@/lib/product-tone";

/**
 * A piece's image. Until real photography exists this is the piece's tone with
 * its name in the corner — see ToneBlock and docs/design-system.md §4.
 *
 * `imageUrls` on the API is a list of plain URLs and is empty for all twelve
 * products today. When it fills, the photo goes in this same box at this same
 * ratio and the label comes off.
 */
export function ProductImage({
  slug,
  name,
  aspect,
  className,
  /** Off at thumbnail size — see ToneBlock. */
  showLabel = true,
}: {
  slug: string;
  name: string;
  aspect?: string;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <ToneBlock
      tone={toneFor(slug)}
      label={showLabel ? name : undefined}
      aspect={aspect}
      className={className}
    />
  );
}
