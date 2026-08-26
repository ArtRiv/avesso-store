import type { Metadata } from "next";

import { Badge, StockBadge } from "@/components/badge";
import { ProductTile } from "@/components/product-tile";
import { SizeCell } from "@/components/size-cell";
import { WaitBar } from "@/components/wait-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Style tile · AVESSO",
  description: "O contrato visual renderizado pelos componentes reais.",
};

/**
 * Artboard 01, as a route.
 *
 * This is the regression surface: everything here is drawn by the same
 * components the store uses, so a component that drifts from
 * docs/design-system.md shows up on this page before it shows up on a screen a
 * customer is looking at. Nothing here is mocked with one-off markup — if
 * something cannot be rendered by a real component, that is the finding.
 *
 * The first sections mirror the artboard exactly, so parity stays checkable
 * against the canvas. The last section holds the component states §2 defines
 * but artboard 01 does not happen to show.
 */
const SWATCHES = [
  { name: "ink", hex: "#0A0A0A", use: "texto, botão primário" },
  { name: "paper", hex: "#FFFFFF", use: "cartões, superfícies" },
  { name: "warm", hex: "#F5F3EF", use: "fundo de página" },
  { name: "hairline", hex: "#E4E0D8", use: "toda borda, todo fio" },
  { name: "muted", hex: "#6B6560", use: "meta, placeholder" },
  { name: "rust", hex: "#B0431E", use: "único acento, CTA" },
  { name: "moss", hex: "#1F6F52", use: "em estoque, pago" },
  { name: "clay", hex: "#8C2F2F", use: "esgotado, erro" },
] as const;

const TYPE_ROLES = [
  { label: "display 72", className: "text-display", text: "Doze peças" },
  { label: "h1 48", className: "text-h1", text: "Camiseta pesada" },
  { label: "h2 32", className: "text-h2", text: "Feito para durar" },
  { label: "h3 20", className: "text-h3", text: "Resumo do pedido" },
  {
    label: "body 16",
    className: "text-body max-w-[420px]",
    text: "Malha 100% algodão penteado, 240 g/m². Costura reforçada nos ombros, modelagem reta e unissex.",
  },
  {
    label: "small 14",
    className: "text-small text-muted",
    text: "Frete calculado no checkout a partir do CEP.",
  },
  { label: "meta 12 mono", className: "type-meta", text: "Últimas 2 unidades" },
  {
    label: "price 16 mono",
    className: "type-price",
    text: "R$ 149,90 · R$ 1.249,00 · PEDIDO #A3F2-91C4",
  },
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="type-meta text-muted">{children}</h2>;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[12px] leading-[1.4] text-muted">
      {children}
    </h3>
  );
}

export default function StyleTilePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-24 py-24">
      <header className="flex items-end justify-between border-b border-hairline pb-6">
        <span className="text-[48px] leading-[1.05] font-semibold tracking-[0.18em]">
          AVESSO
        </span>
        <span className="type-meta text-muted">
          Contrato visual · v1 · pt-BR · BRL
        </span>
      </header>

      <section className="flex flex-col gap-4">
        <SectionLabel>Cor</SectionLabel>
        <div className="grid grid-cols-8 gap-6">
          {SWATCHES.map((swatch) => (
            <div key={swatch.name} className="flex flex-col gap-2">
              <div
                className="h-24 border border-hairline"
                style={{ background: swatch.hex }}
              />
              <span className="type-meta">{swatch.name}</span>
              <span className="font-mono text-[12px] leading-[1.4] text-muted">
                {swatch.hex}
              </span>
              <span className="text-[12px] leading-[1.5] text-muted">
                {swatch.use}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-[7fr_5fr] gap-6 border-t border-hairline pt-8">
        <section className="flex flex-col gap-6 border-r border-hairline pr-12">
          <SectionLabel>Tipografia</SectionLabel>
          {TYPE_ROLES.map((role) => (
            <div key={role.label} className="flex items-baseline gap-6">
              <span className="w-[120px] shrink-0 font-mono text-[12px] leading-[1.4] text-muted">
                {role.label}
              </span>
              <span className={role.className}>{role.text}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-8">
          <SectionLabel>Componentes</SectionLabel>

          <div className="flex flex-col gap-3">
            <GroupLabel>botões</GroupLabel>
            <div className="flex flex-wrap gap-3">
              <Button>Adicionar à sacola</Button>
              <Button variant="secondary">Continuar comprando</Button>
              <Button disabled>Esgotado</Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <GroupLabel>campos</GroupLabel>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="st-cep">CEP</Label>
                <Input
                  id="st-cep"
                  className="font-mono"
                  placeholder="00000-000"
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="st-cep-filled">CEP preenchido</Label>
                <Input
                  id="st-cep-filled"
                  className="font-mono"
                  placeholder="00000-000"
                  defaultValue="01310-200"
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="st-email">E-mail</Label>
                <Input
                  id="st-email"
                  type="email"
                  placeholder="voce@exemplo.com.br"
                  defaultValue="ana@exemplo.com.br"
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="st-email-error" className="text-clay">
                  E-mail · erro
                </Label>
                <Input
                  id="st-email-error"
                  type="email"
                  aria-invalid
                  aria-describedby="st-email-error-message"
                  placeholder="voce@exemplo.com.br"
                  defaultValue="ana@exemplo"
                  readOnly
                />
                <p id="st-email-error-message" className="text-small text-clay">
                  Endereço incompleto. Confira o domínio.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <GroupLabel>badges</GroupLabel>
            <div className="flex flex-wrap gap-3">
              <Badge tone="moss">Em estoque</Badge>
              <Badge tone="rust">Últimas 2 unidades</Badge>
              <Badge tone="clay">Esgotado</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <GroupLabel>tile de produto · 4:5</GroupLabel>
            <div className="grid grid-cols-2 gap-6">
              <ProductTile
                slug="camiseta-pesada-off-white"
                name="Camiseta Pesada Off-White"
                priceCents={14990}
                stockQuantity={24}
              />
              <ProductTile
                slug="camiseta-listrada-marinho"
                name="Camiseta Listrada Marinho"
                priceCents={16990}
                stockQuantity={0}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-8 border-t border-hairline pt-8">
        <SectionLabel>Além do artboard 01</SectionLabel>
        <p className="text-small max-w-[640px] text-muted">
          Estados que a §2 define e que o artboard 01 não chega a mostrar. Ficam
          aqui pelo mesmo motivo que o resto: é nesta página que um componente
          fora do contrato aparece primeiro.
        </p>

        <div className="grid grid-cols-[7fr_5fr] gap-6">
          <div className="flex flex-col gap-8 border-r border-hairline pr-12">
            <div className="flex flex-col gap-3">
              <GroupLabel>
                células de tamanho · indisponível é riscada
              </GroupLabel>
              <div className="flex flex-wrap gap-2">
                <SizeCell label="P" state="selected" />
                <SizeCell label="M" state="available" />
                <SizeCell label="G" state="available" />
                <SizeCell label="GG" state="unavailable" />
                <SizeCell label="XGG" state="available" />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <GroupLabel>barra de espera · a única animação da loja</GroupLabel>
              <div className="flex max-w-[360px] flex-col gap-3">
                <span className="type-meta text-muted">
                  Confirmando o pagamento
                </span>
                <WaitBar label="Confirmando o pagamento" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <GroupLabel>
                botão de recuperação · só no conflito de estoque
              </GroupLabel>
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="recovery">Finalizar com 2 peças</Button>
                <Button variant="link" size="inline">
                  Esqueci minha senha
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <GroupLabel>badge de estoque no PDP</GroupLabel>
              <div className="flex flex-wrap gap-3">
                <StockBadge stockQuantity={24} />
                <StockBadge stockQuantity={2} />
                <StockBadge stockQuantity={0} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
