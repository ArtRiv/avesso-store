"use client";

import Link from "next/link";

/**
 * Boundary de erro do segmento /pedido/[id].
 *
 * Disparado quando o carregamento dos dados do pedido falha — por exemplo,
 * durante um cold-start do backend (502) ou indisponibilidade da API (503).
 * Oferece link direto para /minha-conta onde o pedido pode ser acessado
 * posteriormente.
 */
export default function OrderError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8 py-24 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-h1">Não foi possível carregar o pedido</h1>
        <p className="text-body text-muted">
          Houve um problema ao buscar os dados do pedido. Tente novamente ou
          acesse seus pedidos pela conta.
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
        <Link
          href="/minha-conta/pedidos"
          className="type-meta border border-hairline px-6 py-3 hover:border-ink"
        >
          Meus pedidos
        </Link>
      </div>
    </main>
  );
}
