import Link from "next/link";

import { textLinkClass } from "@/components/text-link";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho minimalista do checkout.
 *
 * Exibe apenas o logo e indicador de conexão segura, sem links de navegação
 * concorrentes para manter o foco do usuário na conclusão da compra.
 */
export function CheckoutHeader() {
  return (
    <header className="flex h-20 flex-none items-center justify-between border-b border-hairline px-24">
      <Link
        href="/"
        className={cn(
          textLinkClass,
          "text-[20px] font-semibold tracking-[0.22em]",
        )}
      >
        AVESSO
      </Link>

      <p className="type-meta text-muted">Checkout · conexão segura</p>
    </header>
  );
}
