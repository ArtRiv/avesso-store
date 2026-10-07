import { cn } from "@/lib/utils";
import { toneClass, toneLabelClass, type Tone } from "@/lib/product-tone";

/**
 * Bloco tonal de placeholder para imagem de produto: preenchimento em tom neutro,
 * borda de 1px hairline e rótulo descritivo em mono no canto inferior.
 */
export function ToneBlock({
  tone,
  label,
  aspect = "aspect-4/5",
  className,
}: {
  tone: Tone;
  /** Rótulo descritivo do produto (opcional em miniaturas pequenas). */
  label?: string;
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
      {label ? (
        <span
          className={cn(
            "absolute bottom-3 left-3 font-mono text-[11px] leading-[1.2] tracking-[0.06em] uppercase",
            toneLabelClass(tone),
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
