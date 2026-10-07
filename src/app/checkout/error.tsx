"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Boundary de erro do segmento /checkout.
 *
 * Disparado quando `loadCart()` lança uma exceção não capturada — por exemplo,
 * durante um cold-start do backend (502) ou indisponibilidade da API (503).
 * Redireciona para /sacola após um breve aviso: o estado do checkout depende
 * do carrinho e não pode ser reconstituído sem ele.
 */
export default function CheckoutError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/sacola");
    }, 4000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-24 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-h1">Checkout temporariamente indisponível</h1>
        <p className="text-body text-muted">
          Não foi possível carregar o checkout agora. Redirecionando para a
          sacola em instantes.
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
