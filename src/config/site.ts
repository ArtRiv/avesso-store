/**
 * Parametrização centralizada de identidade visual, dados cadastrais e conformidade legal.
 * Permite que a mesma base Next.js seja personalizada via variáveis de ambiente
 * ou arquivo de configuração sem necessidade de alterar código-fonte nos componentes.
 */

export interface SiteThemeConfig {
  /** Cor do texto principal, títulos e botões primários (padrão: #0a0a0a) */
  primaryColor?: string;
  /** Cor de destaque: links hover, wait bar, badges de escassez (padrão: #b0431e) */
  accentColor?: string;
  /** Cor de fundo principal da página (padrão: #f5f3ef) */
  backgroundColor?: string;
  /** Cor de fundo de cards, modais e superfícies (padrão: #ffffff) */
  cardColor?: string;
  /** Cor de divisores e bordas sutis (padrão: #e4e0d8) */
  borderColor?: string;
  /** Cor de texto atenuado / secundário (padrão: #6b6560) */
  mutedColor?: string;
}

export interface StoreAddressConfig {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface StoreContactConfig {
  email: string;
  phone?: string;
  whatsapp?: string;
  hours: string;
}

export interface StoreLegalConfig {
  /** Razão Social da empresa (obrigatório pelo Decreto 7.962/2013) */
  companyName: string;
  /** CNPJ com pontuação regular (obrigatório pelo Decreto 7.962/2013) */
  cnpj: string;
  /** Endereço físico completo da sede do e-commerce */
  address: StoreAddressConfig;
  /** Canais oficiais de atendimento ao consumidor (SAC) */
  contact: StoreContactConfig;
}

export interface StoreLogoConfig {
  /** URL absoluta ou caminho relativo para imagem (.svg ou .png com fundo transparente) */
  url?: string;
  /** Texto alternativo para acessibilidade */
  alt: string;
  width?: number;
  height?: number;
}

export interface SiteConfig {
  /** Nome fantasia da loja */
  name: string;
  /** Slogan institucional */
  tagline: string;
  /** Descrição geral para SEO e compartilhamento social */
  description: string;
  /** URL pública de produção da loja */
  url: string;
  /** Configuração do logotipo */
  logo?: StoreLogoConfig;
  /** Tokens de cores dinâmicos */
  theme: SiteThemeConfig;
  /** Dados corporativos e fiscais para conformidade legal */
  legal: StoreLegalConfig;
}

/**
 * Validador de cor hexadecimal seguro (#fff, #ffffff, etc.) para injeção em CSS inline.
 */
export function isValidCssColor(color: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(
    color.trim(),
  );
}

/**
 * Retorna a configuração consolidada da loja a partir do ambiente com fallbacks padrão.
 */
export function getSiteConfig(): SiteConfig {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "AVESSO";

  return {
    name: storeName,
    tagline:
      process.env.NEXT_PUBLIC_STORE_TAGLINE ||
      "Doze peças. Feitas para durar anos.",
    description:
      process.env.NEXT_PUBLIC_STORE_DESCRIPTION ||
      "Doze peças de algodão pesado, em lotes pequenos. Camisetas, moletons, calças e acessórios.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:5173",
    logo: {
      url: process.env.NEXT_PUBLIC_STORE_LOGO_URL || "",
      alt: storeName,
      width: 140,
      height: 32,
    },
    theme: {
      primaryColor: process.env.NEXT_PUBLIC_THEME_PRIMARY,
      accentColor: process.env.NEXT_PUBLIC_THEME_ACCENT,
      backgroundColor: process.env.NEXT_PUBLIC_THEME_BACKGROUND,
      cardColor: process.env.NEXT_PUBLIC_THEME_CARD,
      borderColor: process.env.NEXT_PUBLIC_THEME_BORDER,
      mutedColor: process.env.NEXT_PUBLIC_THEME_MUTED,
    },
    legal: {
      companyName:
        process.env.NEXT_PUBLIC_STORE_LEGAL_NAME || "AVESSO Confecções LTDA",
      cnpj: process.env.NEXT_PUBLIC_STORE_CNPJ || "42.318.907/0001-55",
      address: {
        street: process.env.NEXT_PUBLIC_STORE_STREET || "Rua Aurora",
        number: process.env.NEXT_PUBLIC_STORE_NUMBER || "148",
        complement: process.env.NEXT_PUBLIC_STORE_COMPLEMENT || "",
        neighborhood:
          process.env.NEXT_PUBLIC_STORE_NEIGHBORHOOD || "República",
        city: process.env.NEXT_PUBLIC_STORE_CITY || "São Paulo",
        state: process.env.NEXT_PUBLIC_STORE_STATE || "SP",
        postalCode: process.env.NEXT_PUBLIC_STORE_CEP || "01209-000",
      },
      contact: {
        email:
          process.env.NEXT_PUBLIC_STORE_EMAIL || "atendimento@avesso.com.br",
        phone: process.env.NEXT_PUBLIC_STORE_PHONE || "(11) 99999-0000",
        whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP || "5511999990000",
        hours: process.env.NEXT_PUBLIC_STORE_HOURS || "Seg a sex 9h às 18h",
      },
    },
  };
}

export const siteConfig = getSiteConfig();

/**
 * Constrói o texto legal formatado para o rodapé conforme exigência do Decreto 7.962/2013.
 */
export function formatLegalFooter(legal = siteConfig.legal): string {
  const { street, number, city, state } = legal.address;
  return `${legal.companyName} · CNPJ ${legal.cnpj} · ${street} ${number}, ${city} ${state}`;
}

/**
 * Gera regras CSS para sobrescrever dinamicamente as variáveis de tema no :root
 * caso propriedades válidas tenham sido definidas.
 */
export function generateThemeCss(theme: SiteThemeConfig): string {
  const rules: string[] = [];

  if (theme.primaryColor && isValidCssColor(theme.primaryColor)) {
    rules.push(`--color-ink: ${theme.primaryColor};`);
    rules.push(`--color-primary: ${theme.primaryColor};`);
    rules.push(`--color-ring: ${theme.primaryColor};`);
  }
  if (theme.accentColor && isValidCssColor(theme.accentColor)) {
    rules.push(`--color-rust: ${theme.accentColor};`);
  }
  if (theme.backgroundColor && isValidCssColor(theme.backgroundColor)) {
    rules.push(`--color-warm: ${theme.backgroundColor};`);
    rules.push(`--color-background: ${theme.backgroundColor};`);
  }
  if (theme.cardColor && isValidCssColor(theme.cardColor)) {
    rules.push(`--color-paper: ${theme.cardColor};`);
    rules.push(`--color-card: ${theme.cardColor};`);
  }
  if (theme.borderColor && isValidCssColor(theme.borderColor)) {
    rules.push(`--color-hairline: ${theme.borderColor};`);
    rules.push(`--color-border: ${theme.borderColor};`);
  }
  if (theme.mutedColor && isValidCssColor(theme.mutedColor)) {
    rules.push(`--color-muted: ${theme.mutedColor};`);
  }

  if (rules.length === 0) {
    return "";
  }

  return `:root {\n  ${rules.join("\n  ")}\n}`;
}
