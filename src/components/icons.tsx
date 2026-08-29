/**
 * The four icons this store has, traced from the canvas exactly.
 *
 * §7 forbids an icon library, and this is why that is workable rather than
 * austere: the whole design needs search, account, bag and a chevron, and
 * nothing else. Every one is 20×20, `fill:none`, `stroke-width:1.5` (§2).
 *
 * `currentColor` rather than the canvas's hard-coded hex — the canvas uses ink
 * in the header and muted in the catalogue's search field, which is one icon in
 * two colours, not two icons.
 */
type IconProps = {
  className?: string;
};

function Icon({
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
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

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.2 13.2 L17 17" />
    </Icon>
  );
}

export function AccountIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="7" r="3.2" />
      <path d="M4 17c0-3.3 2.7-5 6-5s6 1.7 6 5" />
    </Icon>
  );
}

export function BagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 6.5h11l1 11h-13z" />
      <path d="M7.5 6.5V5.2a2.5 2.5 0 015 0V6.5" />
    </Icon>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 8l5 5 5-5" />
    </Icon>
  );
}
