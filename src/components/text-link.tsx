import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A link, as the canvas defines one: no underline, and rust on hover. That
 * hover is the single `a:hover { color:#B0431E }` rule in the whole design
 * file, and one of the four places §1 lets rust appear at all.
 *
 * Deliberately not a Button variant. Buttons in this design are 48px mono
 * uppercase controls, and artboard 05 sets "Esqueci minha senha" in 14px
 * Archivo, muted — the same role as body text. Dressing that up as a button
 * would put a control where the design put a sentence.
 */
export const textLinkClass = cn(
  "outline-none transition-colors duration-100 hover:text-rust",
  "focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-2",
);

export function TextLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(textLinkClass, className)}>
      {children}
    </Link>
  );
}

/** The same thing where the action is local and there is nowhere to navigate. */
export function TextButton({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(textLinkClass, className)}>
      {children}
    </button>
  );
}
