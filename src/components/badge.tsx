import { cn } from "@/lib/utils";

/**
 * Componente Badge. Caixa de 1px com texto na mesma cor e fundo transparente.
 * Utilizado para indicar status de estoque, status de pedidos e categorias.
 */
/**
 * Tons de badge suportados:
 * - moss, rust, clay: storefront (estoque, alertas, erros)
 * - shipped, delivered, neutral, dim: back office (status de pedidos e produtos)
 */
type BadgeTone =
  | "moss"
  | "rust"
  | "clay"
  | "shipped"
  | "delivered"
  | "neutral"
  | "dim";

const TONE_CLASS: Readonly<Record<BadgeTone, string>> = {
  moss: "border-moss text-moss",
  rust: "border-rust text-rust",
  clay: "border-clay text-clay",
  shipped: "border-shipped text-shipped",
  delivered: "border-delivered text-delivered",
  neutral: "border-muted text-muted",
  dim: "border-admin-dim text-admin-dim",
};

export function Badge({
  tone,
  className,
  children,
}: {
  tone: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "type-meta inline-block border bg-transparent px-2 py-1",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Limite de unidades para considerar o estoque escasso ("Últimas N unidades").
 */
const SCARCE_AT = 3;

/**
 * Badge completo de disponibilidade de estoque (Esgotado, Últimas unidades, Em estoque).
 */
export function StockBadge({ stockQuantity }: { stockQuantity: number }) {
  if (stockQuantity <= 0) {
    return <Badge tone="clay">Esgotado</Badge>;
  }

  if (stockQuantity <= SCARCE_AT) {
    return <Badge tone="rust">Últimas {stockQuantity} unidades</Badge>;
  }

  return <Badge tone="moss">Em estoque</Badge>;
}

/**
 * Badge de escassez para vitrines e listagens, exibido apenas quando o estoque
 * está baixo ou esgotado.
 */
export function ScarcityBadge({ stockQuantity }: { stockQuantity: number }) {
  if (stockQuantity > SCARCE_AT) {
    return null;
  }

  return <StockBadge stockQuantity={stockQuantity} />;
}
