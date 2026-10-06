"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Boundary de erro do segmento /sacola.
 *
 * Disparado quando `loadCart()` lança uma exceção não capturada — por exemplo,
 * durante um cold-start do backend (502) ou indisponibilidade da API (503).
 * Redireciona para o catálogo após um breve aviso, pois não há estado de
 * sacola para exibir.
 */
export default function BagError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/catalogo");
    }, 4000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-24 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-h1">Sacola temporariamente indisponível</h1>
        <p className="text-body text-muted">
          Não foi possível carregar a sacola agora. Redirecionando para o
          catálogo em instantes.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="type-meta border border-ink px-6 py-3 hover:bg-ink hover:text-paper"
        >
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
