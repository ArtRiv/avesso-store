"use client";

import Link from "next/link";

/**
 * Boundary de erro raiz da aplicação.
 *
 * Captura qualquer exceção não tratada em Server Components abaixo do layout
 * raiz que não tenha um boundary de segmento específico. Exibida quando a
 * API está indisponível, retorna um erro inesperado ou ocorre qualquer outra
 * falha de renderização não prevista.
 *
 * Deve ser `"use client"` — requisito do Next.js para boundaries de erro,
 * pois precisam capturar erros em tempo de execução do lado do cliente também.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8 py-24 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-h1">Algo deu errado</h1>
        <p className="text-body text-muted">
          Não conseguimos carregar esta página. Tente novamente ou volte ao
          início.
        </p>
        {error.digest ? (
          <p className="type-meta text-muted">Código: {error.digest}</p>
        ) : null}
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="type-meta border border-ink px-6 py-3 hover:bg-ink hover:text-paper"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="type-meta border border-hairline px-6 py-3 hover:border-ink"
        >
          Ir ao início
        </Link>
      </div>
    </main>
  );
}
