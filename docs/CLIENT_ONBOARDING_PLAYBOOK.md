# Playbook de Onboarding, Provisionamento e Entrega para Clientes

Este documento é o guia operacional definitivo para arquitetos de software, engenheiros de implantação e gestores de projeto na configuração, parametrização, auditoria legal e entrega de instâncias da plataforma de e-commerce (`avesso-store` e `commerce-core`) para lojistas e clientes finais.

---

## 1. Formulário de Coleta de Informações (Briefing do Lojista)

Envie este questionário para o cliente preencher antes de iniciar o deploy e parametrização da loja:

### A. Identidade da Marca
- [ ] **Nome fantasia da loja:** (ex: *Usina Fashion*) $\rightarrow$ Mapeia para `NEXT_PUBLIC_STORE_NAME`
- [ ] **Slogan ou frase de efeito:** (ex: *Moda contemporânea feita para durar*) $\rightarrow$ Mapeia para `NEXT_PUBLIC_STORE_TAGLINE`
- [ ] **Descrição institucional (SEO):** (ex: *Básicos premium e alfaiataria atemporal produzidos em pequena escala.*) $\rightarrow$ Mapeia para `NEXT_PUBLIC_STORE_DESCRIPTION`
- [ ] **Arquivos visuais:**
  - Logotipo em alta resolução (preferencialmente formato `.svg` ou `.png` com fundo transparente). URL pública mapeia para `NEXT_PUBLIC_STORE_LOGO_URL` (se omitido, a loja renderiza o logotipo tipográfico elegante com tracking largo).
  - Ícone da marca para favicon (quadrado, mínimo 512x512px).
  - Cores institucionais (Hexadecimal):
    - Cor primária (textos e botões): `NEXT_PUBLIC_THEME_PRIMARY` (padrão: `#0a0a0a`)
    - Cor de destaque (links hover, wait bar, badges): `NEXT_PUBLIC_THEME_ACCENT` (padrão: `#b0431e`)
    - Cor de fundo da página: `NEXT_PUBLIC_THEME_BACKGROUND` (padrão: `#f5f3ef`)
    - Cor dos cards/superfícies: `NEXT_PUBLIC_THEME_CARD` (padrão: `#ffffff`)

### B. Informações Legais Obrigatórias (Decreto Federal do E-commerce nº 7.962/2013)
*Obrigatório por lei constar de forma clara no rodapé e nos termos contratuais de qualquer comércio eletrônico no Brasil:*
- [ ] **Razão Social completa:** (ex: *Usina Confecções e Comércio Ltda*) $\rightarrow$ `NEXT_PUBLIC_STORE_LEGAL_NAME`
- [ ] **CNPJ com pontuação:** (ex: *42.318.907/0001-55*) $\rightarrow$ `NEXT_PUBLIC_STORE_CNPJ`
- [ ] **Endereço físico completo da sede:**
  - Logradouro: `NEXT_PUBLIC_STORE_STREET`
  - Número: `NEXT_PUBLIC_STORE_NUMBER`
  - Complemento (opcional): `NEXT_PUBLIC_STORE_COMPLEMENT`
  - Bairro: `NEXT_PUBLIC_STORE_NEIGHBORHOOD`
  - Cidade: `NEXT_PUBLIC_STORE_CITY`
  - UF: `NEXT_PUBLIC_STORE_STATE`
  - CEP: `NEXT_PUBLIC_STORE_CEP`
- [ ] **Canais oficiais de atendimento ao consumidor (SAC):**
  - E-mail de suporte (ex: *atendimento@usinafashion.com.br*) $\rightarrow$ `NEXT_PUBLIC_STORE_EMAIL`
  - Telefone / WhatsApp comercial (com DDD) $\rightarrow$ `NEXT_PUBLIC_STORE_PHONE` e `NEXT_PUBLIC_STORE_WHATSAPP`
  - Horário de atendimento (ex: *Segunda a Sexta, das 09h às 18h*) $\rightarrow$ `NEXT_PUBLIC_STORE_HOURS`

### C. Domínio na Web
- [ ] **Endereço do site desejado:** (ex: *www.usinafashion.com.br*)
- [ ] **Onde o domínio foi registrado:** (Registro.br, GoDaddy, Hostinger, Cloudflare, etc.)
- [ ] **Acesso ao painel DNS:** Acesso técnico delegado ou credenciais seguras.

### D. Dados Financeiros & Gateways de Pagamento
*O cliente deve criar suas próprias contas corporativas para que o faturamento seja creditado diretamente na conta bancária de sua titularidade:*
- [ ] **Conta Asaas (para recebimento de PIX com taxa fixa reduzida):**
  - Cadastro aprovado no [Asaas](https://www.asaas.com/).
  - Chave de API de Produção: *Configurações de Conta > Integrações > Chaves de API* $\rightarrow$ `ASAAS_API_KEY`
  - Token de validação de Webhook configurado $\rightarrow$ `ASAAS_WEBHOOK_SECRET`
- [ ] **Conta Mercado Pago (para Cartão de Crédito nacional parcelado em até 12x):**
  - Cadastro aprovado no [Mercado Pago Developers](https://www.mercadopago.com.br/developers).
  - *Public Key* e *Access Token* de produção $\rightarrow$ `MP_PUBLIC_KEY` e `MP_ACCESS_TOKEN`
  - Assinatura secreta de Webhook $\rightarrow$ `MP_WEBHOOK_SECRET`

### E. Logística e ERP
- [ ] **CEP de Origem (endereço do centro de distribuição de onde os pacotes sairão):** (ex: *01209-000*)
- [ ] **Conta no Melhor Envio (cotação dinâmica Correios, Jadlog, Loggi e emissão de etiquetas):**
  - Token de API de produção gerado no painel do [Melhor Envio](https://melhorenvio.com.br/) $\rightarrow$ `MELHOR_ENVIO_API_TOKEN`
- [ ] **Conta no Bling ERP v3 (emissão automática de Notas Fiscais Eletrônicas - NF-e):**
  - Chave de API v3 gerada em: *Preferências > Sistema > Usuários e Gerenciamento de Acesso > API* $\rightarrow$ `BLING_API_KEY`

---

## 2. Provisionamento Técnico & Infraestrutura

> Para detalhes visuais e diagramas de fluxo de dados de ponta a ponta, consulte [architecture.md](architecture.md).

### A. Escolha das Plataformas de Hospedagem (Custo Otimizado)

1. **Frontend BFF (`avesso-store`):**
   - **Plataforma recomendada:** **Vercel**
   - **Plano:** Hobby (Gratuito) ou Pro ($20/mês).
   - **Vantagens:** Otimizado nativamente para Next.js 16 (Turbopack), Edge Middleware, SSL automático e CDN global com baixa latência no Brasil.

2. **Backend API (`commerce-core`):**
   - **Plataforma recomendada:** **Render**, **Fly.io** ou **Railway**
   - **Plano:** Starter (~$5 a $7/mês) para garantir processo persistente sem hibernação (evitando atrasos de cold start no checkout e nos webhooks).

3. **Banco de Dados (PostgreSQL):**
   - **Plataforma recomendada:** **Supabase** ou **Neon**
   - **Plano:** Gratuito (cobre perfeitamente até dezenas de milhares de registros e conexões concorrentes via PgBouncer).

4. **E-mails Transacionais:**
   - **Plataforma recomendada:** **Resend**
   - **Plano:** Gratuito (até 3.000 e-mails/mês).
   - **Configuração DNS:** Adicionar registros SPF, DKIM e DMARC no domínio do lojista para garantir taxa de entrega máxima na caixa de entrada.

---

### B. Matriz de Variáveis de Ambiente (`.env`)

#### No Backend (`commerce-core`):
```env
NODE_ENV="production"
PORT=3000

# Conexão PostgreSQL (Supabase / Neon)
DATABASE_URL="postgresql://postgres:[SENHA]@[HOST]:5432/postgres?sslmode=require"

# Segurança JWT
JWT_SECRET="gerar-chave-com-openssl-rand-base64-48"
JWT_ACCESS_TTL="15m"

# E-mail Transacional (Resend)
RESEND_API_KEY="re_..."
MAIL_FROM="Nome da Loja <pedidos@sualoja.com.br>"

# URLs Canônicas
APP_URL="https://www.sualoja.com.br"
API_URL="https://api.sualoja.com.br"

# Proxy e Timezone
TRUST_PROXY_HOPS="1"
REPORTS_TIMEZONE="America/Sao_Paulo"

# Pagamentos Híbridos (PIX Asaas + Cartão Mercado Pago)
ASAAS_API_KEY="$aact_..."
ASAAS_WEBHOOK_SECRET="whsec_..."
MP_ACCESS_TOKEN="APP_USR-..."
MP_PUBLIC_KEY="APP_USR-..."
MP_WEBHOOK_SECRET="..."

# Logística (Melhor Envio) & ERP Fiscal (Bling v3)
MELHOR_ENVIO_API_TOKEN="..."
MELHOR_ENVIO_POSTAL_CODE_ORIGIN="01209000"
BLING_API_KEY="..."

# Regras de Negócio Opcionais
SHIPPING_FREE_ABOVE_CENTS="29900" # Frete grátis acima de R$ 299,00
```

#### No Frontend (`avesso-store`):
```env
# Backend BFF (Server-only — nunca expor com NEXT_PUBLIC_)
API_URL="https://api.sualoja.com.br"
NEXT_PUBLIC_SITE_URL="https://www.sualoja.com.br"

# Parametrização de Identidade Visual
NEXT_PUBLIC_STORE_NAME="Usina Fashion"
NEXT_PUBLIC_STORE_TAGLINE="Moda contemporânea feita para durar"
NEXT_PUBLIC_STORE_DESCRIPTION="Básicos premium e alfaiataria em lotes limitados."
NEXT_PUBLIC_STORE_LOGO_URL="" # Deixe vazio para logotipo tipográfico ou cole URL de PNG/SVG

# Personalização Opcional de Cores (Hexadecimal)
NEXT_PUBLIC_THEME_PRIMARY="#111111"
NEXT_PUBLIC_THEME_ACCENT="#c45a38"
NEXT_PUBLIC_THEME_BACKGROUND="#f8f7f5"

# Conformidade Legal (Decreto Federal nº 7.962/2013)
NEXT_PUBLIC_STORE_LEGAL_NAME="Usina Confecções e Comércio LTDA"
NEXT_PUBLIC_STORE_CNPJ="12.345.678/0001-90"
NEXT_PUBLIC_STORE_STREET="Rua Augusta"
NEXT_PUBLIC_STORE_NUMBER="1500"
NEXT_PUBLIC_STORE_COMPLEMENT="Conjunto 42"
NEXT_PUBLIC_STORE_NEIGHBORHOOD="Consolação"
NEXT_PUBLIC_STORE_CITY="São Paulo"
NEXT_PUBLIC_STORE_STATE="SP"
NEXT_PUBLIC_STORE_CEP="01304-001"

# Atendimento ao Consumidor (SAC)
NEXT_PUBLIC_STORE_EMAIL="atendimento@usinafashion.com.br"
NEXT_PUBLIC_STORE_PHONE="(11) 98765-4321"
NEXT_PUBLIC_STORE_WHATSAPP="5511987654321"
NEXT_PUBLIC_STORE_HOURS="Seg a sex 9h às 18h"
```

---

### C. Execução do Deploy & Migrações de Banco de Dados

1. **Deploy das Tabelas do Prisma:**
   Conecte o terminal ao banco de produção e execute:
   ```bash
   pnpm --filter commerce-core prisma migrate deploy
   ```
2. **Seed de Permissões e Perfis Básicos:**
   Garante que o catálogo de permissões (`PERMISSIONS`) e os papéis padrão (`admin`, `operator`, `customer`) estejam criados no banco:
   ```bash
   pnpm --filter commerce-core prisma db seed
   ```
3. **Apontamentos de DNS no Registro.br ou Cloudflare:**
   - Tipo `CNAME`: `www` $\rightarrow$ `cname.vercel-dns.com`
   - Tipo `A`: `@` (raiz) $\rightarrow$ `76.76.21.21` (Vercel)
   - Tipo `CNAME`: `api` $\rightarrow$ `seu-backend.onrender.com`

---

## 3. Provisionamento do Primeiro Administrador (`admin:create`)

Para garantir máxima segurança operacional e aderência às boas práticas de segurança (OWASP), nunca trafegue senhas por canais abertos inseguros. O provisionamento do primeiro administrador da loja é realizado via CLI:

### Executando o Script CLI

Dentro da raiz ou do repositório `commerce-core`:
```bash
# Opção A: Gerando automaticamente uma senha forte de 16 caracteres
pnpm run admin:create --email="admin@usinafashion.com.br" --name="Nome do Lojista"

# Opção B: Definindo senha manual pré-acordada
pnpm run admin:create --email="admin@usinafashion.com.br" --name="Nome do Lojista" --password="SenhaSegura123!"
```

Também é possível executar diretamente a partir do `avesso-store`:
```bash
pnpm run admin:create -- --email="admin@usinafashion.com.br" --name="Nome do Lojista"
```

### O que o script realiza automaticamente:
1. **Normalização e Validação:** Converte o e-mail para caixa baixa (`normalizeEmail`) e valida sintaxe.
2. **Criptografia Argon2id:** Gera o hash da senha utilizando os parâmetros recomendados de memória e custo.
3. **Auto-Bootstrap de Papel:** Se o banco ainda não possuir o perfil `admin`, cria o papel e associa todas as permissões do sistema.
4. **Verificação Imediata (`emailVerifiedAt`):** Marca o e-mail do administrador como verificado no ato da criação, eliminando barreiras de primeiro login caso o servidor de e-mail ainda esteja em fase de validação DNS.
5. **Elevação Transparente:** Se o usuário já possuir cadastro prévio como cliente ou operador, eleva imediatamente a conta para `admin` sem duplicar registros.
6. **Emissão de Resumo Seguro no Terminal:** Imprime painel formatado com ID, Nome, E-mail, Papel e credenciais para entrega segura ao lojista.

---

## 4. Checklist de Conformidade Legal (Decreto Federal nº 7.962/2013 & CDC)

O Decreto Federal nº 7.962/2013 regulamenta a Lei nº 8.078/1990 (Código de Defesa do Consumidor) para contratação no comércio eletrônico. A plataforma atende integralmente a cada um dos dispositivos legais exigidos:

| Artigo Legal | Exigência da Lei | Como a Plataforma Atende |
|---|---|---|
| **Art. 2º, I** | Razão Social, CNPJ e endereço físico visíveis no site | Exibição em destaque no rodapé de todas as páginas (`SiteFooter`), parametrizado via `siteConfig.legal` (`formatLegalFooter`). |
| **Art. 2º, I** | Meios eletrônicos eficazes para contato e SAC | E-mail de atendimento com link direto `mailto:`, telefone/WhatsApp e horários de suporte presentes no rodapé e na página de trocas. |
| **Art. 2º, II** | Características essenciais do produto, dimensões e peso | Páginas de produto (`/produto/[slug]`) com descrição detalhada, fotos, medidas de cubagem ($A \times L \times C$) e cálculo de frete por peso real/volumétrico. |
| **Art. 2º, III** | Discriminação clara de preços, despesas adicionais e frete | No checkout (`/checkout`), o cliente visualiza separadamente o subtotal das peças, o valor individualizado de cada opção de frete e o total consolidado. |
| **Art. 4º, I** | Apresentação de sumário do contrato antes da contratação | Carrinho e tela de checkout exibem resumo completo dos itens, variante de tamanho selecionada, endereço de entrega confirmado e prazo estimado de transporte. |
| **Art. 4º, II** | Confirmação imediata do recebimento da aceitação da oferta | Tela imediata `/pedido/[id]` com identificador único, chave PIX com QR Code ou comprovante de aprovação de cartão, somada ao e-mail transacional instantâneo. |
| **Art. 5º** | Direito de arrependimento em até 7 (sete) dias corridos | Página dedicada `/trocas-e-devolucoes` detalhando o direito de cancelamento sem custos, devolução integral do valor (peça + frete) e logística reversa. |
| **LGPD (Lei 13.709)** | Tratamento ético de dados e não armazenamento de cartões | Página dedicada `/privacidade` detalhando cookies de segurança `httpOnly`, transação de cartões exclusivamente em ambiente PCI-DSS e canais do titular. |

---

## 5. Roteiro de Treinamento e Handover do Lojista

Grave um vídeo curto de 8 a 10 minutos (usando [Loom](https://www.loom.com/) ou gravador de tela) ou conduza uma videochamada de entrega guiada cobrindo estes 4 tópicos essenciais:

### Bloco 1: Gestão de Catálogo, Variantes e Frete Cubado (3 min)
1. Acessar `/admin/produtos` e clicar em **"Novo Produto"**.
2. Preencher Nome, Preço (em Reais) e Descrição.
3. Cadastrar a grade de tamanhos (ex: P, M, G) com estoque inicial.
4. **Ponto Crítico de Frete:** Explicar a importância de preencher o peso em gramas e as dimensões físicas ($A \times L \times C$ em cm) de cada variante. Demonstrar que itens leves e volumosos (como casacos pesados) utilizam cubagem para evitar que o lojista tome prejuízo na cobrança do frete.
5. Inserir imagens e salvar o produto.

### Bloco 2: Gestão do Fluxo de Pedidos em Tempo Real (2 min)
1. Acessar `/admin/pedidos`.
2. Explicar o significado dos filtros de status:
   - **Criado (`CREATED`):** O cliente finalizou o carrinho e está na tela de pagamento (aguardando leitura do QR Code PIX ou autorização do cartão).
   - **Pago (`PAID`):** O webhook do gateway confirmou o pagamento. O pacote já pode ser separado no estoque.
3. Demonstrar a busca textual por nome do cliente ou número do pedido.

### Bloco 3: Expedição em 1-Clique com Melhor Envio & Bling ERP (3 min)
1. Abrir um pedido com status **PAGO** em `/admin/pedidos/[id]`.
2. **Integração Fiscal Bling:** Mostrar o card "Fiscal & ERP (Bling)", explicando que a exportação da venda é automática para emissão da NF-e sem digitação manual.
3. **Cotação em Tempo Real:** Demonstrar o painel de expedição, que busca na API do Melhor Envio os preços atualizados para envio daquele pacote (Correios Sedex, PAC, Jadlog, Loggi).
4. **Compra em 1-Clique:** Clicar no botão da transportadora desejada. Explicar que a etiqueta é gerada instantaneamente, o código de rastreamento é salvo no pedido, o status avança para **Despachado (`SHIPPED`)** e o botão **"Baixar Etiqueta (PDF)"** fica disponível para impressão imediata.
5. Explicar que o cliente final recebe e-mail automático com o código de rastreamento e acompanha a entrega sozinho.

### Bloco 4: Inteligência Comercial & Relatórios (2 min)
1. Acessar `/admin/relatorios`.
2. Alternar entre os filtros de período (*Últimos 7 dias*, *Este mês*, *Este ano*).
3. Analisar os 4 cartões consolidados:
   - **Receita Total:** Volume bruto faturado em pedidos pagos no período.
   - **Produtos Vendidos:** Quantidade total de peças expedidas.
   - **Frete Arrecadado:** Total de taxas de transporte pagas pelos compradores.
   - **Pedidos Pagos:** Quantidade líquida de pedidos finalizados com sucesso.

---

## 6. Checklist de Virada de Chave (Go-Live)

Antes de anunciar a loja ao público, execute este checklist de validação final:

- [ ] **1. Teste de Pagamento Real (PIX):**
  - Efetuar uma compra real no valor mínimo (ex: R$ 10,00) via PIX.
  - Escanear o QR Code no aplicativo do banco e efetuar o pagamento.
  - Verificar se a tela `/pedido/[id]` atualiza automaticamente para "Pagamento confirmado" e se o status no admin avança para `PAID`.
- [ ] **2. Teste de Pagamento Real (Cartão de Crédito):**
  - Finalizar um pedido com cartão de crédito e verificar redirecionamento/aprovação.
- [ ] **3. Validação de E-mails Transacionais:**
  - Conferir na caixa de entrada se os e-mails de confirmação de pedido e boas-vindas chegaram com layout correto e sem cair na caixa de spam.
- [ ] **4. Teste de Expedição e Etiqueta:**
  - Gerar a etiqueta de envio do pedido de teste no admin e validar se o PDF abre com o código de barras legível.
- [ ] **5. Estorno de Teste:**
  - Acessar o painel do Asaas / Mercado Pago e estornar os pagamentos de teste para a conta de origem.
- [ ] **6. Auditoria de Layout Mobile:**
  - Navegar pelo catálogo, sacola e checkout em um smartphone real (iOS e Android) para garantir usabilidade touch perfeita.
- [ ] **7. Entrega das Credenciais:**
  - Fornecer ao lojista o link de acesso ao painel (`https://www.sualoja.com.br/admin`), o e-mail de administrador provisionado e a senha mestra segura gerada via CLI.
