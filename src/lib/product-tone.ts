/**
 * The design uses no photography: every image is a solid block of colour with
 * the piece's name in mono at the bottom left (docs/design-system.md §4). The
 * tone per piece is a design decision listed in §5, and the API has no field
 * for it — `imageUrls` is empty on all twelve products today.
 *
 * So this map lives here, on the presentation side, and it is not a backend
 * gap: a colour chosen for a mockup is not domain data. When real photography
 * exists it arrives through `imageUrls`, the block gives way to the image at
 * the same 4:5, and the label goes.
 */
export type Tone = "bone" | "stone" | "ink-wash" | "clay-wash" | "sage-wash";

const TONE_BY_SLUG: Readonly<Record<string, Tone>> = {
  "camiseta-pesada-preta": "ink-wash",
  "camiseta-pesada-off-white": "bone",
  "camiseta-pesada-areia": "clay-wash",
  "camiseta-manga-longa-off-white": "bone",
  "camiseta-listrada-marinho": "stone",
  "moletom-careca-cinza-mescla": "stone",
  "moletom-careca-preto": "ink-wash",
  "calca-cargo-bege": "clay-wash",
  "calca-alfaiataria-preta": "ink-wash",
  "jaqueta-corta-vento-preta": "ink-wash",
  "bone-aba-curva-preto": "sage-wash",
  "meia-canelada-kit-com-3": "bone",
};

/** Written out rather than built, so Tailwind can see each class name. */
const TONE_CLASS: Readonly<Record<Tone, string>> = {
  bone: "bg-bone",
  stone: "bg-stone",
  "ink-wash": "bg-ink-wash",
  "clay-wash": "bg-clay-wash",
  "sage-wash": "bg-sage-wash",
};

/** The one dark tone, where the name has to sit in translucent white (§1). */
const DARK_TONES: ReadonlySet<Tone> = new Set<Tone>(["ink-wash"]);

export function toneFor(slug: string): Tone {
  return TONE_BY_SLUG[slug] ?? "bone";
}

export function toneClass(tone: Tone): string {
  return TONE_CLASS[tone];
}

export function toneLabelClass(tone: Tone): string {
  return DARK_TONES.has(tone) ? "text-tone-label-inverse" : "text-tone-label";
}
