/**
 * The icons the back office needs and the storefront never did, traced from
 * the canvas exactly.
 *
 * §7 forbids an icon library and that stays true here: this is a closed list
 * of nine, drawn once. The store's four live in src/components/icons.tsx —
 * `SearchIcon` and `ChevronIcon` are reused by the panel rather than redrawn,
 * because the same glyph in a second file is how two of them start to drift.
 *
 * The canvas draws these at 16×16 inside a 16 viewBox (and 14 for the back
 * arrow), unlike the store's 20×20. Rather than rescale the paths, each icon
 * keeps the box it was drawn in and `size` sets the rendered dimensions —
 * `currentColor` throughout, so a row that dims its controls dims its icons
 * with it.
 */
type AdminIconProps = {
  className?: string;
  /** Rendered size in px. The canvas uses 16 everywhere except the crumb. */
  size?: number;
};

function Icon({
  className,
  size = 16,
  viewBox,
  children,
}: AdminIconProps & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** The wordmark's mark: a framed panel. 20×20 in the canvas's top bar. */
export function BackOfficeIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 20 20" size={props.size ?? 20} {...props}>
      <rect x="2.5" y="2.5" width="15" height="15" />
      <path d="M2.5 7.5h15M7.5 7.5v10" />
    </Icon>
  );
}

/** Rail: Produtos. */
export function ProductsIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 16 16" {...props}>
      <rect x="2" y="2" width="12" height="12" />
      <path d="M2 6h12" />
    </Icon>
  );
}

/** Rail: Categorias. */
export function CategoriesIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 16 16" {...props}>
      <path d="M2 4h12M2 8h12M2 12h7" />
    </Icon>
  );
}

/** Rail: Pedidos. */
export function OrdersIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 16 16" {...props}>
      <path d="M2 3h2l1.5 8h7L14 5H4.5" />
      <circle cx="6.5" cy="13.5" r="1" />
      <circle cx="12" cy="13.5" r="1" />
    </Icon>
  );
}

/**
 * The drag handle on a size row. Purely decorative — the row it sits on is
 * what carries the reordering, including from the keyboard.
 */
export function DragHandleIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 16 16" {...props}>
      <path d="M3 5h10M3 8h10M3 11h10" />
    </Icon>
  );
}

/** Rename. */
export function PencilIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 16 16" {...props}>
      <path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" />
    </Icon>
  );
}

/** Remove. */
export function TrashIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 16 16" {...props}>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5" />
    </Icon>
  );
}

/**
 * A size that was sold and therefore cannot be removed. The padlock is the
 * whole message on that row — the sentence beside it explains, but the glyph
 * is what makes the row read as closed rather than broken.
 */
export function LockIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 12 12" size={props.size ?? 12} {...props}>
      <rect x="2.5" y="5.5" width="7" height="5" />
      <path d="M4 5.5V3.5a2 2 0 014 0v2" />
    </Icon>
  );
}

/** Add — a size, a product, a category. */
export function PlusIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 14 14" size={props.size ?? 14} {...props}>
      <path d="M7 2.5v9M2.5 7h9" />
    </Icon>
  );
}

/** The breadcrumb's back arrow. */
export function BackIcon(props: AdminIconProps) {
  return (
    <Icon viewBox="0 0 14 14" size={props.size ?? 14} {...props}>
      <path d="M8.5 3L4.5 7l4 4" />
    </Icon>
  );
}

/** The tick inside a checked box. Drawn on the box's own fill. */
export function CheckIcon(props: AdminIconProps) {
  return (
    <svg
      width={props.size ?? 12}
      height={props.size ?? 12}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      focusable="false"
      className={props.className}
    >
      <path d="M2.5 6l2.5 2.5L9.5 3.5" />
    </svg>
  );
}
