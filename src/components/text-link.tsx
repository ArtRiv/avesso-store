import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Estilo base para links textuais: sem sublinhado por padrão e transição para rust no hover.
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
