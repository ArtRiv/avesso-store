import Link from "next/link";

import { StoreLogo } from "@/components/store-logo";

/**
 * Estrutura de layout para páginas de fluxo de autenticação e e-mail
 * (confirmação de e-mail, recuperação de senha, etc.).
 *
 * Utiliza cabeçalho simplificado com logo e área centralizada com largura máxima.
 */
export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-20 items-center border-b border-hairline px-24">
        <Link
          href="/"
          className="flex items-center outline-none hover:text-rust focus-visible:outline-1 focus-visible:outline-ink focus-visible:outline-offset-4"
        >
          <StoreLogo />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-24 py-24">
        <div className="w-full max-w-[480px]">{children}</div>
      </main>
    </div>
  );
}
