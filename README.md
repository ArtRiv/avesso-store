# avesso-store

Storefront de e-commerce moderno e responsivo desenvolvido com Next.js 16 (App Router), consumindo o backend headless [commerce-core](https://github.com/ArtRiv/commerce-core).

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS v4
- Cliente de API tipado gerado a partir do OpenAPI (`pnpm api:types`)
- Autenticação BFF com cookies `httpOnly` seguros
- Testes unitários com [Vitest](https://vitest.dev/) e Testing Library
- Testes end-to-end (E2E) com [Playwright](https://playwright.dev/)

## Funcionalidades

- **Catálogo & PDP**: Navegação por categorias, filtros, ordenação e seleção dinâmica de variantes de produtos.
- **Sacola de Compras**: Gestão de itens reativa com cálculo de subtotal e quantidades no servidor.
- **Cálculo de Frete**: Integração com Melhor Envio e faixas de CEP com consulta automática de endereço via CEP.
- **Checkout Híbrido**: Pagamentos transparentes com Pix (QR Code dinâmico do Asaas) e Cartão de crédito (Mercado Pago).
- **Área do Cliente**: Histórico e detalhamento de pedidos em tempo real (`/minha-conta/pedidos`).
- **Painel Administrativo (`/admin`)**: Gestão de catálogo e variantes, acompanhamento de pedidos, emissão de etiquetas de envio e relatórios de vendas.
- **Customização de Marca**: Identidade visual (cores, logo, nome da loja) centralizada em `src/config/site.ts`.
- **Conformidade Legal**: Páginas de Trocas e Devoluções, Termos de Uso e Política de Privacidade conforme o Decreto Federal 7.962/2013 e CDC Art. 49.

## Rodando o projeto

Requisitos: Node >= 22.18 e pnpm 10.

```bash
# 1. Dependências
pnpm install

# 2. Variáveis de ambiente
cp .env.example .env.local

# 3. Sincronizar tipos com a API (OpenAPI)
pnpm api:types

# 4. Iniciar em desenvolvimento
pnpm dev
```

A aplicação estará disponível em `http://localhost:3001` (ou `http://localhost:3000`).

```bash
# Build e execução em produção
pnpm build
pnpm start
```

## Testes

```bash
# Testes unitários e de componentes
pnpm test

# Testes end-to-end
pnpm test:e2e
```

## Documentação

- [Playbook de Onboarding do Lojista](docs/CLIENT_ONBOARDING_PLAYBOOK.md)
- [Arquitetura do Storefront](docs/architecture.md)
- [Roadmap de Desenvolvimento](ROADMAP.md)
