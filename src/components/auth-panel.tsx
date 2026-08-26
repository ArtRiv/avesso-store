import { cn } from "@/lib/utils";

/**
 * The bordered paper panel from artboard 05 — a 1px ink border rather than the
 * hairline everything else uses, which is how the design marks the one block
 * on a page that is asking for something.
 *
 * Shared by the sign-in wall on the PDP and by the pages the backend's e-mails
 * link to, so those pages are recognisably part of the same store rather than
 * bare utility screens.
 */
export function AuthPanel({
  title,
  note,
  className,
  children,
}: {
  title: string;
  note?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-6 border border-ink bg-paper p-8",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-h3">{title}</h1>
        {note ? <p className="text-small text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
