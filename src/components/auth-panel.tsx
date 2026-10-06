import { cn } from "@/lib/utils";

/**
 * Painel com borda destacada para fluxos de autenticação e formulários de login.
 * Utilizado tanto no modal/painel inline quanto nas páginas dedicadas.
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
