# AVESSO Store & Commerce-Core — Audit & Multi-Session Roadmap

Este documento centraliza o diagnóstico de arquitetura, qualidade de código, estratégia de testes e plano de evolução para os repositórios **avesso-store** (Next.js 16) e **commerce-core** (NestJS).

---

## 1. Diagnóstico de Arquitetura & Estruturas de Dados

### Pontos Fortes
- **Separação de responsabilidades:** Arquitetura desacoplada entre backend headless (`commerce-core`) e storefront BFF (`avesso-store`).
- **Segurança de tokens:** O BFF em Next.js mantém tokens sensíveis em cookies `httpOnly`, isolando a camada de apresentação de vazamentos via XSS.
- **Precisão financeira:** Uso consistente de inteiros em centavos (`Cents`) para preços e fretes, e snapshot imutável no momento do checkout.

### Pontos de Atenção & Riscos de Escalabilidade
1. **Estrutura de Endereço (Padrão Brasileiro Ausente):**
   - *Atual:* `ShippingAddressDto` e `Order` usam `line1`, `line2`, `city`, `state`, `postalCode`.
   - *Problema:* No Brasil, transportadoras (Correios, Melhor Envio, Jadlog) e emissão de notas fiscais exigem campos separados: **Logradouro**, **Número**, **Complemento** e **Bairro**. Colocar tudo em `line1` impede integrações automáticas.
2. **Dimensões Físicas dos Produtos:**
   - *Atual:* Apenas `weightGrams` é armazenado.
   - *Problema:* Transportadoras reais calculam frete por **peso cúbico / cubagem** (`(A × L × C) / 6000`). Itens volumosos e leves ficam com frete subdimensionado.
3. **Ausência de Consulta Dinâmica de CEP:**
   - O usuário precisa preencher cidade e UF manualmente; não há integração com ViaCEP ou BrasilAPI.
4. **Duplicação de Rotas no BFF:**
   - Praticamente todo endpoint do backend é espelhado manualmente no Next.js (`src/app/api/...`), aumentando o esforço de manutenção.
5. **Endpoint `/auth/me` Inexistente:**
   - O JWT carrega apenas `{ sub: userId }`. Não há rota para obter o perfil do usuário logado (nome, e-mail, permissões).

---

## 2. Qualidade de Código & Robustez

### Limpeza de Comentários de IA
- **Problema identificado:** Diversos arquivos contêm comentários extensos, em tom de conversa ou ecoando prompts e artboards (ex: *"the brief insists on"*, *"which #24 unblocked"*, *"Artboard 07 — three numbered sections"*).
- **Ação:** Substituir comentários conversacionais por documentações técnicas e objetivas no topo dos módulos (TSDoc/JSDoc), explicando o propósito do arquivo, entradas/saídas e regras de negócio sem referências a prompts ou conversas.

### Robustez & Mensagens de Erro Específicas
- **Problema identificado:** Erros genéricos como `"Não foi possível concluir. Tente novamente em instantes."` ou `"A API respondeu 500"`.
- **Ação:**
  - Padronizar erros de domínio tipados (`code`, `message`, `details`, `fieldErrors`).
  - Mensagens claras em português para cenários comuns: CEP não atendido, estoque insuficiente (indicando a quantidade restante), frete desatualizado com novo valor, etc.

---

## 3. Avaliação da Cobertura de Testes

### Situação Atual
- **`commerce-core` (Bom nas regras de negócio, mas pesado):**
  - Os testes E2E (`test/*.e2e-spec.ts`) testam cenários reais no PostgreSQL, transações e limites de taxa.
  - *Gargalo:* Exigem um banco de dados real com schema `e2e` dedicado e executam `TRUNCATE`. Faltam testes unitários isolados para regras de cálculo sem banco.
- **`avesso-store` (Frágil e dependente do backend):**
  - Os testes atuais em `test/*.mjs` são scripts Node que fazem requisições HTTP e verificam strings no HTML (`r.text.includes('Pedidos')`). Qualquer mudança visual pode quebrá-los.
  - Exigem que o `commerce-core` esteja rodando localmente na porta 3000 com dados pré-populados.
  - **Zero testes unitários de componentes React, hooks, validações de formulário ou formatadores.**

### Estratégia de Melhoria
- Configurar **Vitest** + **React Testing Library** no frontend para testes unitários rápidos e desacoplados.
- Testar regras de formulário (validação de CEP, campos obrigatórios de endereço).
- Criar testes unitários para a camada de cálculo de frete e transições de pedidos no backend.

---

## 4. Estruturação do Frete (Shipping)

```
[Cliente digita CEP]
       │
       ├─► [ViaCEP / BrasilAPI] ──► Preenche Logradouro, Bairro, Cidade, UF
       │
       └─► [POST /shipping/quote] ──► Calcula opções (PAC, Sedex, Econômica)
                                            │
                                            ▼
                             [Exibe opções e prazos no Carrinho / Checkout]
```

- **Modelo de Endereço Estruturado:**
  - `postalCode` (CEP - 8 dígitos)
  - `street` (Logradouro)
  - `number` (Número)
  - `complement` (Complemento, opcional)
  - `neighborhood` (Bairro)
  - `city` (Cidade)
  - `state` (UF)
- **Consulta de CEP:** Preenchimento automático ao digitar 8 dígitos no checkout.
- **Simulação de Frete:** Disponibilizar simulação na página do produto (`/produto/[slug]`) e na sacola (`/sacola`), além do checkout.
- **Interface Extensível:** Manter o `TableShippingProvider` robusto e preparar a interface para integração com transportadoras reais (Melhor Envio / Correios).

---

## 5. Funcionalidades Faltantes do E-Commerce

- [x] **Admin / Produtos:** CRUD completo de variantes (remoção / arquivamento).
- [x] **Admin / Relatórios:** Totais agregados (Receita, Itens vendidos, Frete arrecadado, Pedidos).
- [x] **Admin / Categorias:** Contagem de produtos por categoria.
- [x] **Admin / Pedidos:** Busca por número/cliente e contadores de status.
- [x] **Autenticação:** Rota `/auth/me` para perfil do usuário atual.
- [x] **Catálogo:** Campos de dimensões (`heightCm`, `widthCm`, `lengthCm`) nas variantes para cálculo de frete volumétrico.

---

## 6. Planejamento das Sessões

### Sessão 1 — Alinhamento, Diagnóstico & Estruturação (Concluída)
- [x] Exploração das bases de código e mapeamento arquitetural.
- [x] Elaboração do plano mestre de auditoria e roadmap.
- [x] Criação deste documento de rastreamento (`ROADMAP.md`) e do plano de implementação.
- [x] Validação das decisões técnicas com o usuário.

### Sessão 2 — Arquitetura de Frete & Endereço (Concluída)
- [x] Atualização do schema de endereço no backend (`commerce-core`) com campos estruturados (`street`, `number`, `complement`, `neighborhood`) e migração do Prisma (`20260922180000_add_structured_shipping_address`).
- [x] Implementação do `CepService` no backend com resolução via BrasilAPI + fallback ViaCEP e cache em memória (TTL 24h).
- [x] Criação do endpoint público `GET /shipping/cep/:postalCode` documentado no OpenAPI/Swagger com rate limit.
- [x] Sincronização dos tipos TypeScript no frontend (`pnpm exec openapi-typescript ../commerce-core/openapi.json -o src/lib/api/schema.d.ts`).
- [x] Criação da rota BFF `GET /api/shipping/cep/[cep]` no Next.js 16.
- [x] Atualização do formulário de checkout no `avesso-store` com preenchimento automático por CEP, foco dinâmico no número e envio dos campos estruturados.
- [x] Validação completa de compilação: `pnpm build` no frontend e `pnpm lint:check; pnpm typecheck; pnpm test` no backend.

### Sessão 3 — Qualidade de Código & Tratamento de Erros (Concluída)
- [x] Criação de Error Boundaries no Next.js 16 (`error.tsx` na raiz e nos segmentos `/sacola`, `/checkout`, `/pedido/[id]`).
- [x] Implementação do `AllExceptionsFilter` global via `APP_FILTER` no NestJS.
- [x] Conversão de `new Error()` brutos para `InternalServerErrorException` em serviços de autenticação e estoque.
- [x] Observabilidade de falhas externas com logging em `CepService`.
- [x] Padronização e humanização de mensagens de erro em português no frontend e backend (eliminação de fallbacks técnicos e strings expostas).
- [x] Limpeza completa de comentários de IA, menções a artboards, seções internas e ecos de prompts em mais de 35 arquivos.
- [x] Documentação técnica concisa em formato TSDoc/JSDoc nos módulos principais.

### Sessão 4 — Cobertura & Confiabilidade de Testes (Concluída)
- [x] Instalação e configuração de Vitest + React Testing Library + jsdom no `avesso-store` (`vitest.config.mts`, `test/setup.ts`).
- [x] Suíte de testes unitários para formatadores (`format.spec.ts`), tratamento de erros (`errors.spec.ts`), status de pedidos (`order-status.spec.ts`) e componentes UI (`Badge`, `StockBadge`, `Button`).
- [x] Testes unitários e de integração de formulários no frontend (`sign-in-form.spec.tsx` e `checkout-view.spec.tsx` cobrindo máscara de CEP, busca automática de endereço, foco dinâmico, validação de preenchimento e conflitos 409).
- [x] Testes unitários expandidos no `commerce-core` para cálculo de frete (`TableShippingProvider` com limiar 0 e faixas de peso) e matriz de transições de status de pedidos (`OrdersService`) desacoplados de banco de dados.
- [x] Validação completa de compilação e qualidade: `pnpm test` (43 testes no front em 4.7s, 591 testes no back em 15s), `pnpm build`, `pnpm typecheck` e `pnpm lint:check` com 100% de sucesso.

### Sessão 5 — Funcionalidades Faltantes & Painel Admin (Concluída)
- [x] Endpoint `GET /auth/me` no `commerce-core` retornando `CurrentUserResponse` (id, email, name, role, permissions) e integrado ao BFF `/api/auth/me` e cookies de sessão (`name`) no `avesso-store`.
- [x] Remoção segura e arquivamento/desarquivamento de variantes no backend (`PATCH /products/:id/variants/:variantId/archive` e `unarchive`, `isArchived` no schema) e frontend (diálogo de exclusão com alternativa de arquivar para variantes com histórico de pedidos, badge `Arquivado` e botão desarquivar).
- [x] Campos de dimensões físicas (`heightCm`, `widthCm`, `lengthCm`) no modelo `ProductVariant`, migração Prisma `20260927233000_add_variant_archiving_and_dimensions`, edição no painel de variantes e cálculo de peso volumétrico (`(A × L × C) / 6000` kg) integrado em `TableShippingProvider`.
- [x] Filtros, contadores e métricas no painel admin:
  - Pedidos: busca textual por número/cliente (`search`), contadores por status em tempo real via `statusCounts` e paginação com preservação de query params.
  - Produtos: filtro por categoria integrada (`/categories`), ordenação e status com preservação de parâmetros na paginação.
  - Relatórios: métricas agregadas do período (Receita total, Produtos, Frete e Pedidos pagos) via `totals` no `RevenueReportResponse`.
- [x] Validação total de testes e compilação: `pnpm test` (43 testes no front, 606 testes no back) e `pnpm build` com 100% de sucesso em ambos os repositórios.

---

### Sessão 6 — Estratégia Híbrida de Pagamentos (Asaas + Mercado Pago) (Concluída)
- [x] Schema Prisma & Migração: Adicionados campos `paymentMethod`, `pixPayload` e `pixQrCode` ao modelo `Order` (`20260929010000_add_hybrid_payment_fields`).
- [x] Adaptador `AsaasPaymentProvider`: Integração com API v3 do Asaas para PIX dinâmico (QR Code base64 + Copia e Cola EMV), lookup de status, cancelamento, estorno e webhook com validação timing-safe de `asaas-access-token`.
- [x] Adaptador `MercadoPagoPaymentProvider`: Checkout Preferences com parcelamento em até 12x para cartões nacionais, exclusão de meios em dinheiro, lookup, estorno e webhook autenticado via HMAC-SHA256 (`x-signature` + `x-request-id`).
- [x] Roteador `HybridPaymentProvider`: Roteamento inteligente por método (`PIX` → Asaas, `CREDIT_CARD` → Mercado Pago, `STRIPE`/default → Stripe/Fake) e por prefixo de referência (`asaas_`, `mp_`, `cs_`, `fake_`), com auto-detecção de webhooks por cabeçalho.
- [x] `FakePaymentProvider` expandido: Simulação nativa de PIX (com payload Copia e Cola e QR Code base64 simulados) e Cartão de Crédito para dev/test.
- [x] DTOs e Endpoints: `CheckoutDto` e `PayOrderDto` com `paymentMethod`, endpoints dedicados de webhook `/payments/webhook/{asaas,mercadopago,stripe}` e generic retrocompatível `/payments/webhook`.
- [x] Frontend `checkout-view.tsx`: Seletor nativo entre PIX (aprovação imediata) e Cartão de Crédito (até 12x parcelado), redirecionamento seguro para hosted preferences ou tela de pedido.
- [x] Frontend `order-view.tsx`: Bloco dedicado para PIX com exibição do QR Code, Copia e Cola com botão "Copiar código PIX" e feedback visual "Copiado!", botão de verificação manual e polling automático até confirmação em tempo real.
- [x] Sincronização OpenAPI & Tipos: `57 operations` geradas no OpenAPI backend e sincronizadas com `src/lib/api/schema.d.ts` no frontend.
- [x] Testes & Builds: 640 testes backend (38 suítes), 48 testes frontend (8 suítes) e builds de produção em Next.js 16 (Turbopack) e NestJS 100% aprovados.


### Sessão 7 — Confiabilidade End-to-End & Carga (Playwright E2E + k6) (Concluída)
- [x] Configuração do Playwright no `avesso-store` com Chromium real e orquestração de servidores (`mock-backend.mjs` na porta 3099 e Next.js na porta 5173).
- [x] Testes E2E cobrindo a jornada completa do cliente: navegação no catálogo, seleção de variante/tamanho, adição à sacola, preenchimento automático por CEP com foco dinâmico, checkout com PIX (QR Code e Copia e Cola) e Cartão de Crédito.
- [x] Testes E2E do painel administrativo: bloqueio de acesso deslogado, autenticação de operador (`operador@avesso.test`), listagem de produtos com chips de variantes/estoque e gestão/transição de pedidos (`CREATED -> PAID -> SHIPPED`).
- [x] Scripts de teste de carga com k6 (`concurrent-buyers.js`, `rate-limiting.js` e documentação detalhada em `load-tests/README.md`) no `commerce-core` simulando compradores concorrentes e limites de taxa.
- [x] 100% de sucesso em testes unitários (`pnpm test`), testes E2E (`pnpm test:e2e`), linting (`pnpm lint`) e compilações de produção (`pnpm build`).

### Sessão 8 — Integrações Externas: ERP/Fiscal (Bling v3) & Logística Dinâmica (Melhor Envio) (Concluída)
- [x] Schema & Migração Prisma: Adicionados campos `blingOrderId`, `blingExportedAt`, `labelUrl`, `labelPurchasedAt` na tabela `orders` (`20261004000000_add_bling_and_label_fields`).
- [x] Mapeamento e conexão com API v3 do Bling: `BlingErpService` e `NoOpErpService` sob a porta `ErpService` (`ERP_SERVICE`), com exportação automática e resiliente de pedidos confirmados (`PAID`) para emissão automatizada de NF-e sem bloqueio de checkout.
- [x] Provedores dinâmicos de frete: `MelhorEnvioShippingProvider` para cotações em tempo real de Correios, Jadlog e Loggi via API v2 com consolidação de pacotes (peso e dimensões), e `HybridShippingProvider` com fallback transparente para a tabela offline.
- [x] Expedição e geração de etiquetas com 1-clique: `ShippingLabelService` (e `FakeShippingLabelService` para dev/test) orquestrando o fluxo de carrinho, checkout e emissão de PDF; endpoint `POST /orders/:id/label` que compra a etiqueta, grava `trackingCode` e `labelUrl` e avança o pedido para `SHIPPED`.
- [x] Cotação para pedidos existentes: Endpoint `GET /orders/:id/shipping-quotes` para consulta em tempo real de fretes e prazos no momento do despacho.
- [x] Sincronização OpenAPI & BFF: 59 operações documentadas no backend, tipos sincronizados no frontend (`schema.d.ts`), e rotas BFF em `/api/admin/orders/[id]/label` e `/api/admin/orders/[id]/shipping-quotes`.
- [x] Painel Administrativo (`/admin/pedidos/[id]`): Modal interativo de seleção de transportadora e compra de etiqueta com 1-clique, botão direto de download do PDF da etiqueta, e Card "Fiscal & ERP (Bling)" com rastreabilidade da NF-e.
- [x] Garantia de Qualidade: 683 testes Jest no backend (43 suítes, 100% aprovados), 48 testes Vitest no frontend (100% aprovados), 6/6 testes E2E Playwright reais (100% aprovados) e builds de produção `pnpm build` bem-sucedidos em ambos os repositórios.

### Sessão 9 — Onboarding Automatizado, Provisionamento & Go-Live (Concluída)
- [x] Script CLI para provisionamento do primeiro administrador da loja (`admin:create`):
  - Criado módulo `src/auth/admin-provisioning.ts` e executável `scripts/create-admin.ts` no `commerce-core`, suportando argumentos flexíveis (`--email`, `--name`, `--password`, `--help`).
  - Geração automática de senha de alta entropia (16 caracteres) com hash criptográfico Argon2id quando a senha não for informada.
  - Auto-bootstrap do papel `admin` com catálogo de permissões caso o banco ainda não tenha sido populado por seed.
  - Verificação imediata do e-mail (`emailVerifiedAt`) para permitir login instantâneo no painel `/admin` sem dependência inicial de DNS de e-mail.
  - Suporte à elevação direta de usuários existentes para o papel de administrador e resumo seguro formatado no terminal.
  - Scripts configurados em ambos os repositórios (`pnpm run admin:create` no backend e front).
- [x] Parametrização centralizada de identidade visual (cores, logo, nome da loja) no Next.js:
  - Módulo central `src/config/site.ts` com tipagem forte para nome, slogan, descrição, URL, logotipo e tokens de tema CSS.
  - Injeção dinâmica de CSS variables (`--color-ink`, `--color-rust`, `--color-warm`, etc.) no `RootLayout` via `generateThemeCss()` com validação contra injeção de CSS.
  - Componente reutilizável `StoreLogo` suportando logotipo por imagem (`NEXT_PUBLIC_STORE_LOGO_URL`) ou wordmark tipográfico nativo estilizado, integrado no `SiteHeader`, `AuthPageShell` e `MobileMenu`.
  - Atualização completa de `layout.tsx` e `page.tsx` para consumir metadados centralizados.
- [x] Validação do checklist de conformidade legal (Decreto Federal do E-commerce nº 7.962/2013 & CDC):
  - Dados corporativos fiscais no rodapé (`formatLegalFooter`): Razão Social, CNPJ, endereço físico completo e canais de SAC com links `mailto:` e horários.
  - Criação da página `/trocas-e-devolucoes` detalhando o direito de arrependimento em 7 dias corridos (Art. 49 CDC / Art. 5º Decreto 7.962/2013), reembolso integral com frete e logística reversa.
  - Criação da página `/termos` com condições contratuais, regras de pagamento e prazos de entrega (Art. 2º e Art. 4º).
  - Criação da página `/privacidade` em conformidade com a LGPD (Lei 13.709/2018), segurança PCI-DSS e cookies HttpOnly.
  - Ativação de links reais no rodapé da loja (`SiteFooter`).
- [x] Guia de deploy em produção e roteiro de treinamento/handover documentado em [`docs/CLIENT_ONBOARDING_PLAYBOOK.md`](file:///c:/Users/Arthu/Desktop/code/avesso-store/docs/CLIENT_ONBOARDING_PLAYBOOK.md):
  - Formulário completo de briefing do lojista mapeado para as variáveis de ambiente.
  - Matriz exaustiva de variáveis `.env` para frontend e backend.
  - Passo a passo de deploy e infraestrutura (Vercel, Render/Fly.io, Supabase/Neon, Resend).
  - Tabela comparativa do checklist do Decreto 7.962/2013.
  - Roteiro detalhado de treinamento do lojista em 4 blocos e checklist de virada de chave (Go-Live).
- [x] Garantia de Qualidade: 701 testes Jest no backend (44 suítes, 100% aprovados), 57 testes Vitest no frontend (10 suítes, 100% aprovados), 6/6 testes E2E Playwright reais (100% aprovados) e builds de produção `pnpm build` bem-sucedidos em ambos os repositórios.

### Sessão 10 — Hub Multi-Tenant de Credenciais & Integração Mercado Livre (Concluída)
*(Referência arquitetural: [`docs/architecture/marketplaces_multi_tenant_roadmap.md`](file:///c:/Users/Arthu/Desktop/code/commerce-core/docs/architecture/marketplaces_multi_tenant_roadmap.md))*
- [x] Modelo de Credenciais Multi-Tenant: Tabelas `tenant_integrations` e `marketplace_item_mappings` com migração Prisma `20261006000000_add_tenant_integrations`, relacionamentos reversos, suporte a múltiplos provedores e criptografia simétrica AES-256-GCM em repouso (`EncryptionService`).
- [x] Fluxo de federação OAuth 2.0 Authorization Code do Mercado Livre: Parâmetro `state` assinado com HMAC-SHA256 (10m TTL, mitigação timing-safe contra CSRF), troca atômica por tokens e armazenamento seguro de credenciais.
- [x] Conector Mercado Livre com rotação segura de refresh token de uso único: Trava atômica em nível de linha no PostgreSQL via `SELECT ... FOR UPDATE` em transação Prisma (dispensando Redis e mantendo infraestrutura enxuta e econômica), garantindo rotação atômica de refresh token sob concorrência.
- [x] Sincronização atômica de catálogo e estoque: Serviço `MercadoLivreSyncService` mapeando variantes locais para anúncios via `marketplace_item_mappings`, sincronização em lote e decremento de estoque integrado ao `OrdersService.checkout` para prevenção rigorosa de overselling.
- [x] Webhook receiver de alta velocidade: Endpoint `/integrations/mercadolivre/webhook` para tópicos `orders_v2`, `orders` e `items`, integrando pedidos do Mercado Livre diretamente na tabela central `orders` (com `originChannel: "MERCADO_LIVRE"`, `externalOrderId`), baixa imediata de estoque via `StockService.decrement` e exportação automática para o Bling ERP.
- [x] Painel Administrativo (`/admin/integracoes`): Interface minimalista no padrão visual da AVESSO com cards de canais (Mercado Livre, Shopee, Amazon SP-API), status de conexão com Badges nativas, conexão em 1-clique via OAuth seguro, sincronização manual de catálogo e desconexão assistida.
- [x] OpenAPI & BFF: 65 endpoints OpenAPI documentados no `commerce-core`, tipos sincronizados no `avesso-store` (`schema.d.ts`), e rotas BFF em `/api/admin/integrations/` repassando tokens de sessão.
- [x] Garantia de Qualidade: 727 testes Jest no backend (50 suítes, 100% aprovados), 61 testes Vitest no frontend (11 suítes, 100% aprovados), 7/7 testes E2E Playwright reais (100% aprovados) e builds de produção `pnpm build` bem-sucedidos em ambos os repositórios.

### Sessão 11 — Integração Shopee (Marketplace)
*(Referência arquitetural: [`docs/architecture/marketplaces_multi_tenant_roadmap.md`](file:///c:/Users/Arthu/Desktop/code/commerce-core/docs/architecture/marketplaces_multi_tenant_roadmap.md))*
- [ ] Autenticação Shopee Open Platform com assinaturas HMAC-SHA256 (`/api/v2/shop/auth_partner`).
- [ ] Mapeamento dinâmico de categorias e atributos obrigatórios da Shopee para variantes locais.
- [ ] Sincronização bidirecional de saldo de estoque em tempo real.
- [ ] Push Mechanism para captura imediata de novos pedidos da Shopee.

### Sessão 12 — Integração Amazon Selling Partner API (SP-API)
*(Referência arquitetural: [`docs/architecture/marketplaces_multi_tenant_roadmap.md`](file:///c:/Users/Arthu/Desktop/code/commerce-core/docs/architecture/marketplaces_multi_tenant_roadmap.md))*
- [ ] Infraestrutura de autenticação Login with Amazon (LWA) combinada com credenciais AWS IAM / STS assume-role.
- [ ] Conformidade estrita com Data Protection Policy (DPP) e criptografia de ponta a ponta de dados PII.
- [ ] Mensageria assíncrona orientada a eventos via AWS SQS / Amazon EventBridge.
- [ ] Sincronização em massa de produtos e preços via Feeds API v2021-06-30.

