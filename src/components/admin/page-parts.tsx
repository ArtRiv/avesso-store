import Link from "next/link";

import { BackIcon } from "@/components/admin-icons";
import { cn } from "@/lib/utils";

/**
 * The furniture every panel screen repeats: a crumb, a title block, a card,
 * a hairline table.
 *
 * These are thin on purpose. Three screens draw the same table and two draw
 * the same header, which is enough repetition to name — and not enough to
 * justify a component that takes a column config and renders itself. The
 * markup stays where the screen can see it.
 */

/** The back link above a detail screen's title. */
export function Crumb({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="type-meta flex w-fit items-center gap-2.5 text-muted hover:text-rust"
    >
      <BackIcon />
      {label}
    </Link>
  );
}

/** Title on the left, actions on the right. */
export function PageHeader({
  title,
  meta,
  children,
}: {
  title: React.ReactNode;
  /** The line under the title — a count, a slug, a status chip. */
  meta?: React.ReactNode;
  /** The screen's actions. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex flex-col gap-2.5">
        <h1 className="font-heading text-h2">{title}</h1>
        {meta ? <div className="flex items-center gap-3">{meta}</div> : null}
      </div>
      {children ? (
        <div className="flex shrink-0 gap-2.5">{children}</div>
      ) : null}
    </div>
  );
}

/**
 * A panel. Hairline and square — §1 rules out both the shadow and the radius,
 * and the back office does not get an exception for being dense.
 */
export function Card({
  title,
  note,
  className,
  children,
}: {
  title?: string;
  /** The muted line under the heading, where the canvas explains a rule. */
  note?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-5 border border-admin-hairline bg-paper p-7",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-col gap-1.5">
          <h2 className="type-meta">{title}</h2>
          {note ? <p className="text-[13px] text-muted">{note}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** The bordered box a table sits in. */
export function TableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-admin-hairline bg-paper">
      {/* Wide tables scroll inside their own frame rather than pushing the
          page sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">{children}</table>
      </div>
    </div>
  );
}

export function Th({
  className,
  children,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "type-meta px-5 py-3.5 text-left font-medium text-admin-dim",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  className,
  children,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td className={cn("px-5 py-4 align-middle", className)} {...props}>
      {children}
    </td>
  );
}

/** A row that separates itself from the next one, and not from the frame. */
export function Tr({
  className,
  children,
  ...props
}: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-admin-hairline last:border-b-0",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

/**
 * What a listing says when it has nothing.
 *
 * Never a spinner and never a shrug: it names why the list is empty and, when
 * there is one, offers the action that would fill it.
 */
export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-small text-muted">
        {children}
      </td>
    </tr>
  );
}
