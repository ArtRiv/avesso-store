# Handoff — próxima sessão

Arquivo temporário. Apague quando o checkout estiver de pé.

Leia primeiro `CLAUDE.md`, `AGENTS.md`, `README.md` e os três documentos de
`docs/`. Este arquivo só carrega o que **não** está neles: onde a construção
parou, o que já foi decidido, e o que ainda está aberto.

Branch: `feat/scaffold`, empurrada para `origin`. `pnpm lint` e `pnpm build`
limpos no último commit.

---

## O que já está de pé

| rota | artboard | estado |
| --- | --- | --- |
| `/` | 02 | pronta |
| `/catalogo` | 03 | pronta, filtros e faixas verificados contra a API |
| `/produto/[slug]` | 04 + 05 | pronta, vendendo por variante |
| `/sacola` | 06 + 09 | pronta |
| `/pedido/[id]` | 08 | pronta, com polling |
| `/entrar`, `/criar-conta`, `/reset-password`, `/verify-email` | — | prontas |
| `/checkout/success\|cancel\|return`, `/orders/[id]` | — | redirects para `/pedido/[id]` |

**Não construído ainda:**

- `/checkout` — artboard 07 e o 409 do artboard 10. **É o próximo.** Hoje é
  link morto: o CTA da sacola aponta para lá e não existe página.
- `/minha-conta/pedidos` — o botão `Ver meus pedidos` do artboard 08 aponta
  para lá e também é link morto. `GET /orders` já existe e já vem escopado
  pelo dono, então é uma tela pequena.

---

## O checkout, com o contrato já levantado

Não precisa redescobrir isto — está tudo em `src/lib/api/schema.d.ts`.

```
POST /shipping/quote  { postalCode }
  -> { options[], itemsSubtotalCents }
     option = { code, label, priceCents, estimatedDays, carrier,
                orderTotalCents }

POST /orders  { shippingAddress, shippingOptionCode,
                quotedShippingCents, paymentMode? }
  -> OrderWithPaymentResponse
     payment = { mode, url, clientSecret, expiresAt } | null
```

Pontos que decidem o desenho da tela:

- **`orderTotalCents` já vem pronto por opção de frete.** É o número do
  `Finalizar pedido — R$ 522,30`. Não somar nada no navegador.
- **`quotedShippingCents` é uma afirmação, não uma instrução.** Manda-se o
  preço de frete que foi *mostrado*; o servidor recotiza e cobra o dele,
  comparando só para pegar preço velho. Divergência é `409` com opções novas.
- **`options: []` com `200` é legítimo** — "nada carrega isto, para lá" é fato
  sobre o endereço, não erro. Provedor fora do ar é `503`, e os dois são
  separados de propósito: um vale retentar, o outro nunca.
- **Provedor de pagamento fora do ar não impede o pedido.** O pedido nasce e
  `payment` vem `null`; a recuperação é `POST /orders/{id}/pay`. Provedor de
  **frete** fora do ar é `503` e nenhum pedido existe, porque pedido nasce
  imutável e um total errado não teria conserto.
- **O retorno da Stripe não é prova de pagamento.** `/pedido/[id]` já faz o
  polling; o checkout só precisa mandar o comprador para lá.

### `paymentMode` — verificar antes de desenhar

`CheckoutDto.paymentMode` aceita `"hosted" | "embedded"` e o padrão é o da
implantação. O `CLAUDE.md` registra que a instância implantada é `hosted`.

O artboard 07 é desenhado para **embedded**: o campo de cartão da Stripe dentro
da nossa página, com a nota "A AVESSO não recebe nem armazena o número."

**Primeira coisa a fazer:** criar um pedido de teste pedindo
`paymentMode: "embedded"` e ver se volta `clientSecret`. Se voltar, o artboard
07 sai como desenhado. Se não voltar, o checkout redireciona para
`payment.url` e isso vira divergência registrada no `README.md` — não se
inventa uma tela para um modo que a API não responde.

Em qualquer um dos dois modos os campos de cartão são iframe da Stripe. Isso é
o desenho, não uma limitação: número de cartão tocando o nosso DOM traria
escopo PCI-DSS junto.

### Artboard 10 — o 409 de estoque

Já está registrado no `README.md` como adiado e resolvido aqui: o corpo do 409
é prosa e não diz *qual* linha riscar, então relê-se `GET /cart` e trata-se
como culpada a linha com `variant.stockQuantity < quantity` ou
`product.status !== 'ACTIVE'`, chamando `DELETE /cart/items/{variantId}`.
Sem modal, sem caixa vermelha.

---

## Decisões já tomadas nesta sessão (não relitigar)

- **`Total` da sacola mostra o subtotal.** `GET /cart` recusa dar total sem
  CEP, de propósito. A linha do frete diz o que falta, uma linha acima.
- **O CTA da sacola é ink, não o rust do canvas.** §1 raciona rust a quatro
  lugares e este não é nenhum. Ambas registradas no `README.md`.
- **`pickFeatured` vive em `src/lib/featured.ts`** e serve home e sacola vazia.
- **Toda mutação de sacola passa por rota BFF + `apiFetch`**, nunca por server
  action: `av_rt` é escopado em `/api/auth`, então nada fora dali consegue
  renovar sessão.

---

## Abertas — precisam do Arthur

### 1. E-mail do admin está com typo (bloqueia login/reset)

`public.users` guarda `arthurfelaco707@gmail.com.br` — com `.br` sobrando. Por
isso nenhum e-mail de "esqueci a senha" chegou: a API não achou usuário e, por
anti-enumeração, respondeu `200` sem mandar nada.

No projeto Supabase **`commerce-core-dev`** (`utnazosqofafekpxbtjg`), SQL editor:

```sql
update public.users
set email = 'arthurfelaco707@gmail.com', updated_at = now()
where email = 'arthurfelaco707@gmail.com.br';
```

Já está com `email_verified_at`, então não precisa reverificar. (O Studio em
**Auth → Users** mostra `auth.users`, que o commerce-core não usa; a conta está
em **Table Editor → public.users**, e o papel é `role_id` → `public.roles`.)

Ferramenta bloqueada pelo classificador de permissões duas vezes — precisa ser
rodado à mão.

### 2. Variantes: falta CRUD no commerce-core

commerce-core **tem** variantes (#19, implantado). O que falta é administrá-las.

| existe | falta |
| --- | --- |
| `POST /products` com `variants[]` | renomear variante |
| `POST /products/:id/variants` | reordenar variantes |
| `PATCH /products/:id/variants/:vid/stock` | **remover variante** |

A remoção ficou de fora de propósito: exige decidir o que acontece com um
tamanho que alguém já comprou. Resposta limpa: **recusar se a variante aparecer
em alguma linha de pedido, permitir caso contrário.**

Isso bloqueia dado real: a migration do #19 deu às doze peças existentes uma
variante `Único` carregando o estoque original, e sem rota de remoção não dá
para trocá-la por `P/M/G/GG/XGG`. O `scripts/seed-catalog.mjs` já sabe criar
produto com tamanhos reais; ele lista por nome as peças travadas ao fim da
execução e não mexe nelas. Enquanto isso o PDP não mostra linha de tamanhos
nessas peças — uma peça com só `Único` se autoseleciona e esconde a linha.

Arthur autorizou levar o CRUD ao commerce-core ("we need to add all that crud
stuff to commerce-core"). Fluxo: SDD + TDD, cerimônia completa em mudança
grande, mais leve em pequena; ele revisa o PR depois.

### 3. Modelo de variante — conversa separada, não bloqueia nada

Variante hoje é `{ id, label, position, stockQuantity }`. `label` é texto
livre, então "Com espada" / "Com espada e escudo" / "Sem acessórios" já
funciona igual a P/M/G — é um eixo genérico de escolha, não recurso de roupa.

O que ainda não existe, e Arthur precisa decidir antes da página de admin:

- **Preço por variante.** O preço vive no produto. A versão com espada
  provavelmente custa mais.
- **Imagem por variante.** `imageUrls` também é do produto; escolher cor sem a
  foto mudar é experiência ruim.
- **Só um eixo.** Tamanho × cor seriam dois; hoje achataria em `P Preto`,
  `P Branco`, `M Preto`…

Preço por variante mexe em checkout, subtotal da sacola e em todo caminho de
dinheiro — é PR próprio, não um campo a mais.

---

## Lembretes que já custaram caro

- **`pnpm build | head` mata o build com SIGPIPE** e deixa `.next` sem
  `prerender-manifest.json`. Usar `tail`.
- **O banco que a loja implantada usa se chama `commerce-core-dev`.** O aviso
  inteiro está no `CLAUDE.md` — leia antes de encostar em migration ou e2e.
- Sem atribuição do Claude em commit ou PR. Claude abre o PR, Arthur faz merge.
