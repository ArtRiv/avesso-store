## Status Atual do Projeto

- **Sessões Concluídas:** 
  - Sessão 1 (Auditoria, Diagnóstico Arquitetural e Planejamento).
  - Sessão 2 (Arquitetura de Frete & Modelo de Endereço).
  - Sessão 3 (Qualidade de Código, Limpeza de Comentários de IA e Tratamento de Erros).
  - Sessão 4 (Cobertura & Confiabilidade de Testes).
  - Sessão 5 (Funcionalidades Faltantes & Painel Admin).
  - **Sessão 6 (Estratégia Híbrida de Pagamentos — Asaas + Mercado Pago)**:
    - **Schema & Migração**: Adicionados campos `paymentMethod`, `pixPayload` e `pixQrCode` ao modelo `Order` no Prisma com migração `20260929010000_add_hybrid_payment_fields`.
    - **`AsaasPaymentProvider`**: Adaptador completo para API v3 do Asaas com geração de cobrança PIX, recuperação instantânea de QR Code (imagem PNG em base64) e Copia e Cola EMV, lookup de status, cancelamento, estorno e webhook autenticado via verificação timing-safe do header `asaas-access-token`.
    - **`MercadoPagoPaymentProvider`**: Adaptador para Cartão de Crédito nacional via Checkout Preferences com parcelamento em até 12x, exclusão de meios em dinheiro, lookup, estorno e webhook autenticado via assinatura HMAC-SHA256 (`x-signature` + `x-request-id`).
    - **`HybridPaymentProvider`**: Roteador inteligente que despacha `createPayment` por método (`PIX` → Asaas, `CREDIT_CARD` → Mercado Pago, `STRIPE`/default → Stripe/Fake), faz lookup e estorno por prefixo de referência (`asaas_`, `mp_`, `cs_`, `fake_`), e auto-detecta webhooks por inspeção de cabeçalhos.
    - **`FakePaymentProvider` expandido**: Simulação nativa de PIX (QR Code e Copia e Cola fake) e Cartão para desenvolvimento local e CI sem dependências externas.
    - **Endpoints de Webhook**: Dedicated endpoints `/payments/webhook/asaas`, `/payments/webhook/mercadopago`, `/payments/webhook/stripe` e endpoint genérico retrocompatível `/payments/webhook`.
    - **DTOs & OpenAPI**: Atualizados `CheckoutDto` e `PayOrderDto` com `paymentMethod`, `OrderResponse` e `PaymentSessionResponse` com dados de PIX e gateway. 57 operações geradas no OpenAPI.
    - **Frontend BFF**: Rotas `/api/orders` e `/api/orders/[id]/pay` preparadas para validar e repassar `paymentMethod`.
    - **Interface de Checkout**: Seletor nativo no `/checkout` entre PIX (aprovação imediata) e Cartão de Crédito (até 12x), com visual minimalista e redirecionamento condicional.
    - **Tela de Pedido com PIX**: Exibição do QR Code dinâmico, código Copia e Cola com botão "Copiar código PIX" e feedback de sucesso ("Copiado!"), botão de verificação manual e polling contínuo até confirmação em tempo real.
    - **Garantia de Qualidade**: 640 testes unitários no backend (38 suítes) e 48 testes unitários no frontend (8 suítes), builds de produção em Next.js 16 (Turbopack) e NestJS 100% aprovados.
  - **Sessão 7 (Confiabilidade End-to-End & Carga — Playwright E2E + k6)**:
    - **Playwright com Navegadores Reais**: Configurado `@playwright/test` no `avesso-store` (`playwright.config.ts`) com Chromium e orquestração automatizada de múltiplos `webServer`: mock backend nativo de alta velocidade (`e2e/mock-backend.mjs` na porta 3099) e Next.js 16 (`next dev` na porta 5173).
    - **Jornada Completa do Cliente (`customer-journey.spec.ts`)**:
      - Cenário 1 (PIX): Navegação no catálogo (`/catalogo`), seleção do produto e variante de tamanho (`/produto/camiseta-oversized-preta`), adição à sacola via modal de autenticação inline, visualização da sacola (`/sacola`), preenchimento automático de endereço por CEP com foco dinâmico no número (`/checkout`), cálculo de frete, finalização com PIX e validação da tela de sucesso do pedido (`/pedido/[id]`) com Badge "Aguardando pagamento", QR Code e botão Copia e Cola funcional.
      - Cenário 2 (Cartão de Crédito): Adição de item, preenchimento de endereço e CEP, seleção de Cartão de Crédito e submissão com redirecionamento de checkout validado.
    - **Painel Administrativo (`admin-panel.spec.ts`)**:
      - Cenário 1: Proteção de rota e bloqueio de visitante não autenticado tentando acessar `/admin`.
      - Cenário 2: Autenticação de operador (`operador@avesso.test`), carregamento do painel administrativo, navegação na listagem de produtos com chips visuais de variantes e contadores de estoque.
      - Cenário 3: Gestão do ciclo de vida de pedidos em `/admin/pedidos/[id]`, com avanço de status transicional `CREATED -> PAID` (botão "Confirmar pagamento") e `PAID -> SHIPPED` (botão "Despachar pedido").
    - **Testes de Carga com k6 (`commerce-core/load-tests/`)**:
      - `concurrent-buyers.js`: Simulação concorrente de múltiplos compradores (rampa de até 50 VUs) cobrindo navegação no catálogo, adição à sacola, cotação de frete e checkout, com thresholds de latência (p95 < 500ms, p99 < 1.2s) e taxa de erro < 1%.
      - `rate-limiting.js`: Teste de estresse disparando 50 reqs/s contra endpoints públicos com rate limit (`/shipping/cep/:postalCode` e `/auth/login`), validando que as primeiras requisições respondem 200/400 e as subsequentes recebem HTTP 429 Too Many Requests com header `Retry-After`.
      - `README.md`: Documentação executiva completa com comandos de execução, variáveis de ambiente e critérios de aceitação.
    - **Garantia de Qualidade**: 5/5 testes E2E Playwright aprovados (100%), 48/48 testes unitários Vitest no frontend aprovados, 640 testes Jest no backend aprovados, zero warnings no ESLint e builds de produção `pnpm build` bem-sucedidos em ambos os repositórios.
  - **Sessão 8 (Integrações Externas — Bling ERP v3 + Melhor Envio)**:
    - **Schema & Migração Prisma**: Colunas `blingOrderId`, `blingExportedAt`, `labelUrl`, `labelPurchasedAt` adicionadas no modelo `Order` (`20261004000000_add_bling_and_label_fields`).
    - **Integração Bling ERP v3**: Implementada porta `ErpService` (`ERP_SERVICE`), adaptador de produção `BlingErpService` e `NoOpErpService` para desenvolvimento/testes. Exportação automática de pedidos confirmados (`PAID`) via `OrdersService.markPaid()`, desacoplada e resiliente (falhas no ERP são logadas sem abortar a confirmação do pagamento).
    - **Cotação Dinâmica Melhor Envio**: `MelhorEnvioShippingProvider` integrando a API v2 do Melhor Envio (Correios PAC/SEDEX, Jadlog, Loggi), cálculo consolidado de pacotes (peso e dimensões) e `HybridShippingProvider` com fallback inteligente para tabela offline (`TableShippingProvider`).
    - **Expedição e Etiquetas em 1-Clique**: `ShippingLabelService` (e `FakeShippingLabelService` para simulação) orquestrando o fluxo de carrinho, checkout e emissão de PDF; endpoint `POST /orders/:id/label` com permissão `ORDERS_UPDATE_STATUS` que compra a etiqueta, grava o `trackingCode` e `labelUrl`, e transiciona o pedido para `SHIPPED`.
    - **Cotação para Pedidos Existentes**: Endpoint `GET /orders/:id/shipping-quotes` que calcula taxas em tempo real diretamente a partir do CEP e dos itens do pedido.
    - **Sincronização OpenAPI & BFF**: 59 operações registradas no OpenAPI do NestJS, tipos sincronizados no frontend (`schema.d.ts`), e rotas BFF em `/api/admin/orders/[id]/label` e `/api/admin/orders/[id]/shipping-quotes`.
    - **Painel Administrativo (`/admin/pedidos/[id]`)**: Painel de expedição interativo com cotações em tempo real e compra em 1-clique, botão de download do PDF da etiqueta, e Card "Fiscal & ERP (Bling)" exibindo ID e data de sincronização da NF-e.
   - **Sessão 9 (Onboarding Automatizado, Provisionamento & Go-Live)**:
     - **CLI `admin:create`**: Implementado módulo `src/auth/admin-provisioning.ts` e executável `scripts/create-admin.ts` no `commerce-core` (com delegação no `avesso-store`). Suporta flags `--email`, `--name`, `--password` e `--help`, gera senhas de alta entropia (16 caracteres) com Argon2id, faz auto-bootstrap de papéis/permissões se o banco estiver vazio, verifica o e-mail no ato e eleva usuários existentes.
     - **Parametrização de Identidade Visual**: Módulo centralizador `src/config/site.ts` com tipagem forte para nome, slogan, descrição, URL, logo e tokens de tema CSS. Injeção dinâmica de CSS variables no `RootLayout` via `generateThemeCss()`, componente `StoreLogo` (imagem ou wordmark tipográfico) integrado em `SiteHeader`, `AuthPageShell` e `MobileMenu`.
     - **Conformidade Legal (Decreto Federal nº 7.962/2013 & CDC)**: Identificação física/fiscal completa no rodapé (`formatLegalFooter`), páginas institucionais `/trocas-e-devolucoes` (Art. 49 CDC / Art. 5º Decreto 7.962/2013 - 7 dias de arrependimento sem custos e frete estornado), `/termos` (condições de compra e prazos) e `/privacidade` (LGPD e segurança PCI-DSS).
      - **Playbook de Onboarding do Cliente (`CLIENT_ONBOARDING_PLAYBOOK.md`)**: Documentação operacional completa com briefing do lojista, matriz `.env`, guia de deploy (Vercel, Render, Supabase, Resend), tabela de auditoria do Decreto 7.962/2013, roteiro de treinamento em 4 blocos e checklist de Go-Live.
      - **Garantia de Qualidade**: 701 testes Jest no backend (44 suítes, 100% aprovados), 57 testes Vitest no frontend (10 suítes, 100% aprovados), 6/6 testes E2E Playwright reais (100% aprovados), zero warnings no ESLint e builds de produção `pnpm build` bem-sucedidos em ambos os repositórios.
    - **Sessão 10 (Hub Multi-Tenant de Credenciais & Integração Mercado Livre)**:
      - **Modelo de Credenciais Multi-Tenant**: Tabelas `tenant_integrations` e `marketplace_item_mappings` com migração Prisma `20261006000000_add_tenant_integrations`, relacionamentos reversos, suporte a múltiplos provedores (`MERCADO_LIVRE`, `SHOPEE`, `AMAZON`) e criptografia simétrica AES-256-GCM em repouso (`EncryptionService`).
      - **Fluxo OAuth 2.0 com Mitigação CSRF**: Parâmetro `state` assinado com HMAC-SHA256 (10m TTL, validação timing-safe contra CSRF), troca atômica do código por tokens de acesso/refresh e armazenamento seguro das credenciais.
      - **Rotação Atômica de Refresh Token de Uso Único**: Lock atômico em nível de linha no PostgreSQL via transações Prisma com `SELECT ... FOR UPDATE` (`mercadolivre-connector.ts`), eliminando a necessidade de infraestrutura Redis externa e garantindo que apenas uma requisição renove o refresh token em cenários de alta concorrência.
      - **Sincronização Atômica de Catálogo e Estoque**: `MercadoLivreSyncService` com mapeamento de-para de SKUs locais para IDs do Mercado Livre (`marketplace_item_mappings`), e sincronização atômica de estoque integrada ao `OrdersService.checkout` para prevenção rigorosa de overselling.
      - **Webhook Receiver de Alta Performance**: Endpoint `/integrations/mercadolivre/webhook` para tópicos `orders_v2`, `orders` e `items`, deduplicação idempotente, persistência imediata na tabela central `orders` (`originChannel: "MERCADO_LIVRE"`, `externalOrderId`), baixa imediata de estoque via `StockService.decrement` e exportação automática para o Bling ERP.
      - **Painel Administrativo (`/admin/integracoes`)**: Interface minimalista com visual refinado da AVESSO contendo cards para Mercado Livre, Shopee e Amazon SP-API, status de conexão com Badges nativas, fluxo de autorização em 1-clique via OAuth, sincronização manual de catálogo e desconexão assistida.
      - **Sincronização OpenAPI & BFF**: 65 operações OpenAPI registradas no `commerce-core`, tipos sincronizados no `avesso-store` (`schema.d.ts`), e rotas BFF em `/api/admin/integrations/` repassando credenciais e cookies de sessão administrativa.
      - **Sessão 11 (Integração Shopee Marketplace)**:
        - **Autenticação Shopee Open Platform**: Assinaturas HMAC-SHA256 para rotas públicas e autenticadas (`/api/v2/shop/auth_partner`), state assinado contra CSRF (10m TTL) e persistência segura em `tenant_integrations` com criptografia simétrica AES-256-GCM em repouso (`ShopeeAuthService`).
        - **Conector Shopee com Rotação Atômica de Tokens**: Renovação sob lock exclusivo no PostgreSQL via `SELECT ... FOR UPDATE` (`ShopeeConnector`), prevenindo invalidação concorrente do token de 4h e refresh de 30 dias sem custo com Redis adicional.
        - **Mapeamento de Atributos Mandatários e Taxonomia**: Mapeamento dinâmico de categorias de moda e atributos obrigatórios (Marca, Material, País de Origem, Garantia) para aprovação instantânea de anúncios na Shopee Brasil (`ShopeeCategoryMappingService`).
        - **Sincronização Bidirecional & Prevenção de Overselling**: Sincronização atômica de saldo de estoque em tempo real (`ShopeeSyncService`) acoplada ao `OrdersService.checkout` e propagação para o Mercado Livre.
        - **Push Mechanism & Webhook Receiver**: Receptor seguro de notificações da Shopee (`ShopeeWebhookService`) com verificação criptográfica, deduplicação idempotente, baixa imediata de estoque em transação PostgreSQL, canal `originChannel: "SHOPEE"` e exportação automática para o Bling ERP.
        - **Painel Administrativo (`/admin/integracoes`)**: Ativação da conexão Shopee em 1-clique via Open Platform, exibição de loja conectada, shop ID, expiração de token com segurança AES-256-GCM, sincronização manual e desconexão assistida.
        - **Sincronização OpenAPI & BFF**: 70 operações registradas no OpenAPI do `commerce-core`, tipos sincronizados no `avesso-store` (`schema.d.ts`), e rotas BFF em `/api/admin/integrations/shopee/`.
        - **Garantia de Qualidade**: 756 testes Jest no backend (55 suítes, 100% aprovados), 63 testes Vitest no frontend (11 suítes, 100% aprovados), 7/7 testes E2E Playwright reais (100% aprovados), zero warnings no ESLint e builds de produção `pnpm build` bem-sucedidos em ambos os repositórios.
      - **Sessão 12 (Integração Amazon Selling Partner API — SP-API)**:
        - **Autenticação LWA & Assinatura AWS SigV4**: Integração completa com Login with Amazon (LWA) OAuth 2.0 com `state` assinado com HMAC-SHA256, credenciais AWS IAM e gerador de assinaturas AWS Signature Version 4 (SigV4) para endpoints REST da SP-API (`execute-api`). Persistência segura em `tenant_integrations` com criptografia simétrica AES-256-GCM em repouso (`AmazonAuthService`, `AmazonSigV4`).
        - **Conformidade Estrita com a Data Protection Policy (DPP)**: Criptografia em repouso de dados de identificação pessoal (PII) do comprador (AES-256-GCM) no campo `encryptedBuyerPii` do modelo `Order` (migração Prisma `20261007000000_add_amazon_dpp_pii_field`), rotina de higienização de pedidos após 30 dias de conclusão (`AmazonDppService.anonymizeOrderPii`) e monitoramento/relatório de rotação de credenciais a cada 180 dias.
        - **Conector SP-API com Rotação Atômica de Tokens**: Renovação sob lock exclusivo em nível de linha no PostgreSQL via `SELECT ... FOR UPDATE` (`AmazonConnector`), garantindo renovação atômica do token LWA de 1h sem dependência de Redis externo.
        - **Mapeamento de Catálogo de Moda/Vestuário**: Serviço de mapeamento `AmazonCatalogMappingService` traduzindo categorias e atributos locais para Product Types da Amazon (`SHIRT`, `SWEATSHIRT`, `PANTS`, `HAT`, `CLOTHING`) com patches JSON compatíveis com a Listings Items API v2021-08-01.
        - **Sincronização de Inventário & Prevenção de Overselling**: Atualização de saldo em tempo real acoplada ao checkout (`OrdersService.checkout`) e sincronização em lote de catálogo (`AmazonSyncService`).
        - **Receptor Assíncrono de Notificações de Pedidos**: Processamento de eventos de pedidos via Amazon EventBridge / SQS / Webhook Notifications API (`AmazonWebhookService`), deduplicação idempotente, baixa imediata de estoque em PostgreSQL, propagação para Mercado Livre e Shopee e exportação contábil para o Bling ERP.
        - **Painel Administrativo (`/admin/integracoes`)**: Card interativo da Amazon SP-API com conexão em 1-clique via LWA, badges nativos de status, exibição de Selling Partner ID, Marketplace Brasil (`A2Q3Y263D00KWC`), status de conformidade DPP, sincronização manual e desconexão assistida.
        - **Sincronização OpenAPI & BFF**: 75 operações OpenAPI documentadas no `commerce-core`, tipos sincronizados no `avesso-store` (`schema.d.ts`), e rotas BFF em `/api/admin/integrations/amazon/`.
        - **Garantia de Qualidade**: 795 testes unitários Jest no backend (62 suítes, 100% aprovados), 65 testes Vitest no frontend (11 suítes, 100% aprovados), 7/7 testes E2E Playwright reais (100% aprovados), zero warnings no ESLint e builds de produção `pnpm build` bem-sucedidos em ambos os repositórios.
      - **Sessão 13 (Observabilidade Estruturada com Pino & AsyncLocalStorage)**:
        - **Propagação de Contexto com `AsyncLocalStorage`**: Módulo `RequestContextService` utilizando `node:async_hooks` nativo do Node.js, com rastreamento isolado e thread-safe de `tenant_id`, `order_id`, `correlation_id` e `user_id` através de fluxos assíncronos e callbacks no `commerce-core`.
        - **Middleware HTTP de Contexto**: `RequestContextMiddleware` interceptando requisições, gerando `correlation_id` único (UUIDv4) ou propagando `x-correlation-id` / `x-request-id`, extraindo `tenant_id` e `order_id` (com suporte a rotas `/orders/:uuid`) e adicionando headers de resposta `X-Correlation-Id` e `X-Tenant-Id`.
        - **Logger Estruturado com Pino (`PinoLoggerService`)**: Logger de alta performance implementando NestJS `LoggerService`, com redação automática de dados sensíveis (LGPD / OWASP / PCI-DSS: tokens, senhas, chaves de API, secrets de webhooks, CPF, CVV e PII de compradores), formatação síncrona amigável (`pino-pretty`) em desenvolvimento e JSON estruturado com timestamps ISO 8601 em produção.
        - **Interceptor Global de Métricas HTTP (`HttpLoggingInterceptor`)**: Medição precisa de latência por requisição (`duration_ms`), status HTTP e rotas, com níveis dinâmicos (5xx ERROR, 4xx WARN, 2xx/3xx INFO, `/health` DEBUG).
        - **Injeção de Contexto no Domínio**: Enriquecimento automático de contexto com `order_id` e `tenant_id` em operações de checkout (`OrdersService.checkout`, cancelamento, reembolso, transições), webhooks de pagamentos (`PaymentEventsService`) e webhooks de marketplaces (`MercadoLivre`, `Shopee`, `Amazon`).
        - **Tratamento Estruturado de Exceções (`AllExceptionsFilter`)**: Enriquecimento de logs de exceções globais com payload HTTP, correlation ID, URL, método e stack trace sem vazar dados confidenciais.
        - **Garantia de Qualidade**: 818 testes unitários Jest no backend (68 suítes, 100% aprovados), 65 testes Vitest no frontend (11 suítes, 100% aprovados), zero erros de lint ou typecheck e builds de produção `pnpm build` bem-sucedidos em ambos os repositórios.
- **Documento Mestre de Acompanhamento:** [ROADMAP.md](file:///c:/Users/Arthu/Desktop/code/avesso-store/ROADMAP.md)
- **Playbook de Onboarding do Cliente:** [CLIENT_ONBOARDING_PLAYBOOK.md](file:///c:/Users/Arthu/Desktop/code/avesso-store/docs/CLIENT_ONBOARDING_PLAYBOOK.md)
- **Decisão Arquitetural de Pagamentos (ADR 001):** [registro_de_decis_o_arquitetural.md](file:///c:/Users/Arthu/Desktop/code/commerce-core/docs/architecture/registro_de_decis_o_arquitetural.md) e [documento_de_benchmarking.md](file:///c:/Users/Arthu/Desktop/code/commerce-core/docs/architecture/documento_de_benchmarking.md)
- **Diagramas e Visão de Arquitetura do Sistema:** [overview.md](file:///c:/Users/Arthu/Desktop/code/commerce-core/docs/architecture/overview.md) e [architecture.md](file:///c:/Users/Arthu/Desktop/code/avesso-store/docs/architecture.md)
- **Roadmap Arquitetural de Marketplaces & OAuth Multi-Tenant (Sessões 10, 11 e 12):** [marketplaces_multi_tenant_roadmap.md](file:///c:/Users/Arthu/Desktop/code/commerce-core/docs/architecture/marketplaces_multi_tenant_roadmap.md)

---

## Status da Sessão 13 e Próximos Passos

As Sessões 1 a 13 foram 100% concluídas com sucesso. O ecossistema de e-commerce e marketplaces (Mercado Livre, Shopee e Amazon SP-API), checkout híbrido (PIX e Cartão), logística dinâmica (Melhor Envio), ERP contábil (Bling v3) e a infraestrutura de observabilidade estruturada com Pino e AsyncLocalStorage encontram-se totalmente operacionais, testados e integrados com alta fidelidade arquitetural.



---

## Checklist de Regras Críticas (Não Negociáveis)

1. **Gestão de Git & Pull Requests por Sessão:** Cada sessão de trabalho DEVE rodar em sua própria branch dedicada (ex: `feat/session-11-shopee`). Todas as alterações devem ser commitadas com Conventional Commits e a sessão deve concluir com a branch pronta e instruções claras para o usuário revisar e aprovar o PR.
2. **Upstream-First:** Nunca inventar campos ou rotas no frontend (`avesso-store`). Mudanças de dados/regras de negócio sempre nascem no `commerce-core`, geram OpenAPI (`pnpm run openapi:generate`), e sincronizam tipos no front (`pnpm api:types`).
3. **Padrões Oficiais Next.js 16:**
   - Usar Server Components por padrão; `use client` apenas nas bordas interativas.
   - Usar `proxy.ts` (não `middleware.ts`).
   - `cookies()` e `headers()` são assíncronos.
   - Cache de dados com `fetch` e tags/revalidate nativos.
4. **Padrões Oficiais NestJS:**
   - Arquitetura modular com DTOs validados via `class-validator` e `class-transformer`.
   - Injeção de dependência via tokens (`Symbol`).
   - Sem regras de negócio nos controllers; controllers apenas delegam e definem OpenAPI/guards.
5. **Moeda e Valores:** Sempre inteiros em centavos (`Cents`). Nunca realizar operações aritméticas de moeda no cliente.
