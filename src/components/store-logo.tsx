import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export interface StoreLogoProps {
  className?: string;
  imageClassName?: string;
}

/**
 * Componente reutilizável de logotipo da loja.
 * Renderiza uma imagem caso `NEXT_PUBLIC_STORE_LOGO_URL` esteja presente,
 * ou o wordmark tipográfico estilizado por padrão.
 */
export function StoreLogo({ className, imageClassName }: StoreLogoProps) {
  const { name, logo } = siteConfig;

  if (logo?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo.url}
        alt={logo.alt || name}
        width={logo.width || 140}
        height={logo.height || 32}
        className={cn("h-7 w-auto object-contain", imageClassName)}
      />
    );
  }

  return (
    <span
      className={cn(
        "text-[20px] font-semibold tracking-[0.22em] uppercase select-none",
        className,
      )}
    >
      {name}
    </span>
  );
}
