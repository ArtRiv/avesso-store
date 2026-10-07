import { cn } from "@/lib/utils";

/**
 * Barra de progresso indeterminada de 2px com animação contínua.
 * Utilizada como indicador de espera visual durante transições de estado
 * (ex: confirmação de pagamento).
 */
export function WaitBar({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <div
      className={cn("h-0.5 w-full overflow-hidden bg-hairline", className)}
      role="progressbar"
      aria-label={label}
    >
      <div className="animate-wait-bar h-full w-[30%] bg-rust" />
    </div>
  );
}
