# avesso-store

Storefront da AVESSO — uma loja de básicos unissex construída sobre o
[commerce-core](https://github.com/ArtRiv/commerce-core), um backend headless
de e-commerce em NestJS.

Projeto de portfólio. O backend já está em produção; este repositório é o
front-end que o consome.

## Stack

- Next.js 16 (App Router) + TypeScript — `create-next-app` instalou **16.3.3**, e o que muda em relação ao 15 está no `CLAUDE.md`
- Tailwind v4 + shadcn/ui, restilizado para o contrato visual
- Cliente da API gerado do documento OpenAPI do backend (`openapi-typescript` + `openapi-fetch`)
- Auth em BFF: tokens em cookies httpOnly, o browser nunca vê o refresh token

## Documentação

| arquivo | o que é |
| --- | --- |
| [`docs/backend-commerce-core.md`](docs/backend-commerce-core.md) | O contrato do backend, copiado do repositório dele. O que a API resolve, o que ela não resolve, e as seis coisas que quebram quem não sabe. |
| [`docs/design-system.md`](docs/design-system.md) | O contrato visual: tokens, CSS dos componentes, as 10 telas e o copy deck. Extraído do canvas do Claude Design. |
| [`design/`](design/) | O canvas do Claude Design de onde o contrato visual foi extraído, importado como está. Material bruto: consulte quando um detalhe não estiver na extração. |
| [`docs/upstream-first.md`](docs/upstream-first.md) | Como trabalhar quando a API não tem o que a loja precisa: o teste de decisão, o procedimento do PR no backend e as armadilhas de lá. |
| [`docs/kickoff-prompt.md`](docs/kickoff-prompt.md) | O prompt de partida da construção. |

A fonte de verdade da API é o documento OpenAPI publicado pelo backend em
`/docs-json` — ele ganha de qualquer texto aqui em caso de divergência.

## Upstream-first

O commerce-core é reusável de propósito: cada loja é uma implantação da mesma
`main`. Por isso, **lacuna da API não vira contorno aqui — vira PR lá.** O
teste de decisão e o procedimento estão em
[`docs/upstream-first.md`](docs/upstream-first.md). A decisão de subir ou
adiar é conjunta, e o que for adiado fica registrado abaixo em vez de ficar
escondido no código.

## ⚠️ Qual banco a API implantada usa

**A instância implantada lê o projeto Supabase chamado `commerce-core-dev`**
(`utnazosqofafekpxbtjg`), e **não** o chamado `commerce-core`
(`sxjfswfajcaceyywscmb`). Os nomes mentem: o projeto com "dev" no nome é o que
serve a loja publicada; o outro tem seis produtos de agosto e ficou para trás.

Isso já custou uma vez. O e2e do commerce-core dá `TRUNCATE` nas tabelas do
`DATABASE_URL` para onde aponta, e `docs/upstream-first.md` avisa para "nunca
apontar para o Supabase de produção" — só que a verificação óbvia, olhar o nome
do projeto, dá a resposta errada. Rodar o e2e contra `commerce-core-dev` apagou
o catálogo da AVESSO, os usuários e o histórico de pedidos, e uma migration
aplicada ali derrubou `GET /products` com 500 porque o código implantado ainda
lia uma coluna recém-removida.

**Antes de rodar e2e ou aplicar migration em qualquer banco:**

1. Confirme o alvo pelo **conteúdo**, não pelo nome. O banco que a loja usa é o
   que tem as doze peças da AVESSO e as quatro categorias do
   `docs/design-system.md` §5. Se `select count(*) from products` devolver 12,
   é o banco da loja publicada — pare.
2. Confirme pelo `DATABASE_URL` real do serviço no Render, não por suposição.
3. E2E só contra um banco descartável, que não é nenhum dos dois de hoje.

Enquanto os projetos não forem renomeados, este aviso é a única coisa entre a
próxima sessão e o mesmo acidente.

## Catálogo de demonstração

As 12 peças e 4 categorias do `docs/design-system.md` §5 entram na API pelo
script de seed:

```bash
API_URL=https://commerce-core-kvlg.onrender.com ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-catalog.mjs
```

Ele é idempotente por slug — `PATCH` no que existe, `POST` no que falta — e
aceita `--dry-run` para imprimir o plano sem escrever nada. Rode de novo
sempre que o e2e do commerce-core passar por cima do banco: ele dá `TRUNCATE`
no catálogo e nos usuários.

> **O seed quebra quando o PR de variantes entrar.** Ele manda `stockQuantity`
> no corpo de `POST /products`, e o PR
> [#19](https://github.com/ArtRiv/commerce-core/pull/19) tira esse campo do DTO
> em favor de `variants: [{ label, position, stockQuantity }]`. Como a validação
> do backend rejeita campo desconhecido em vez de ignorar, isso vira **400**, não
> um aviso. Atualizar o script junto com a regeneração de `pnpm api:types`, assim
> que o PR estiver implantado — e é a hora de dar tamanhos de verdade às doze
> peças, já que hoje elas viram todas `Único`.

O seed mora aqui, e não no `prisma/demo-catalog.ts` do commerce-core, de
propósito: aquele arquivo é dado de exemplo neutro num repositório
compartilhado, e o catálogo da AVESSO é dado desta loja. Catálogo de loja no
repositório do template é o primeiro passo para ele virar dois projetos.

**Os pesos são estimativa.** O design informa um único peso (`310 g no
tamanho M`, de camiseta); os outros onze eu inferi. `weightGrams` precifica
frete, e o que falta o backend cobra da loja — confira contra as peças reais
antes de cobrar de alguém.

## O que ainda falta

Todas as dez telas do `docs/design-system.md` §3 estão de pé, mais
`/minha-conta/pedidos` e as rotas para onde o backend manda gente por e-mail e
pela Stripe. Uma compra real já passou ponta a ponta: `Finalizar pedido`,
página da Stripe, retorno, e o pedido virando `Pago` pelo webhook. O que
sobrou:

- **O e-mail do admin está com typo no banco, e isso trava login e reset.**
  `public.users` guarda `arthurfelaco707@gmail.com.br`, com `.br` sobrando.
  Nenhum e-mail de "esqueci minha senha" chega porque a API não acha o usuário
  e, por anti-enumeração, responde `200` sem mandar nada. No projeto Supabase
  **`commerce-core-dev`** (`utnazosqofafekpxbtjg`), no SQL editor:

  ```sql
  update public.users
  set email = 'arthurfelaco707@gmail.com', updated_at = now()
  where email = 'arthurfelaco707@gmail.com.br';
  ```

  A conta já tem `email_verified_at`, então não precisa reverificar. (O Studio
  em **Auth → Users** mostra `auth.users`, que o commerce-core não usa; a conta
  está em **Table Editor → public.users**, e o papel é `role_id` →
  `public.roles`.) Enquanto isso não roda, **nenhum caminho autenticado da loja
  dá para ser testado ponta a ponta** — nem sacola, nem checkout, nem pedido.

- **CRUD de variante no commerce-core.** Existe `POST /products` com
  `variants[]`, `POST /products/:id/variants` e
  `PATCH /products/:id/variants/:vid/stock`. Falta renomear, reordenar e,
  principalmente, **remover** — que ficou de fora de propósito, porque exige
  decidir o que acontece com um tamanho que alguém já comprou. Resposta limpa:
  recusar se a variante aparecer em alguma linha de pedido, permitir caso
  contrário. É o que destrava dar `P/M/G/GG/XGG` às doze peças de hoje.

- **Modelo de variante — conversa, não tarefa.** Variante hoje é
  `{ id, label, position, stockQuantity }`, e `label` é texto livre, então
  "Com espada" já funciona igual a `P`. O que não existe: preço por variante,
  imagem por variante, e mais de um eixo (tamanho × cor achataria em
  `P Preto`, `P Branco`, `M Preto`…). Preço por variante mexe em checkout,
  subtotal e em todo caminho de dinheiro — é PR próprio, não um campo a mais.

## Divergências conhecidas entre design e API

Registradas aqui, e não escondidas no código, conforme
[`docs/upstream-first.md`](docs/upstream-first.md). Cada uma diz de que lado a
decisão caiu e por quê.

### Em aberto — vai subir para o commerce-core

- **Não há como saber que um tamanho foi vendido antes de tentar removê-lo.**
  O artboard do editor desenha um cadeado e a lixeira apagada na linha de um
  tamanho vendido, ou seja, assume que a tela sabe disso ao renderizar.
  `ProductVariantResponse` traz `id`, `label`, `position` e `stockQuantity` —
  nada sobre pedidos ou carrinhos. A informação só existe dentro do `409` do
  `DELETE`. Consequência: a lixeira aparece em todas as linhas removíveis, e o
  motivo da recusa chega no diálogo em vez de na linha. Candidato a upstream
  (um `soldCount` e um `cartLineCount` na variante resolveriam os dois), ainda
  não decidido.

- **O diálogo de remoção abre sem o número.** Pelo mesmo motivo acima: o
  artboard abre em "está em 3 sacolas", e não existe rota que devolva essa
  contagem sem tentar apagar. Então o primeiro passo é uma confirmação sem
  número, e a caixa com a frase (`Autorizo descartar as N linhas…`) só aparece
  depois que a API disse que há carrinho em risco. **A invariante que importa
  está intacta**: nenhuma linha de carrinho é destruída sem o operador ler a
  contagem e aceitá-la, e se ela mudar entre o aviso e a confirmação a caixa
  desmarca sozinha.

- **A categoria não sabe quantas peças tem.** `CategoryResponse` traz `id`,
  `name`, `slug` e `description` — a categoria não conhece os produtos que
  apontam para ela. A coluna `Peças` do artboard sai de um `GET /products` por
  categoria com `perPage: 1`, lendo o `total` que o servidor conta. São N
  requisições para N categorias, em paralelo, e é aceitação deliberada e não
  descuido: a própria API declara a lista de categorias não paginada porque o
  conjunto é pequeno. Um `productCount` na categoria colapsaria isso para uma
  requisição só — candidato a upstream, não decidido.

- **A lista de pedidos não tem busca nem contagem por status.** O artboard
  mostra um número em cada chip do filtro (`Pago 9`, `Enviado 12`). Cada um
  seria uma requisição própria — seis viagens a mais para decorar um filtro — e
  `GET /orders` não devolve contagem por status. Os chips vão sem número, e a
  contagem que aparece é a do filtro aplicado, que é a que o operador está
  realmente olhando. Busca por cliente ou por número de pedido também não
  existe na API; `userId` é o único filtro por pessoa.

- **O painel não sabe o e-mail de quem está logado.** O artboard mostra
  `admin@[loja].com.br` na barra do topo. Não existe `/auth/me`, nem rota
  nenhuma que descreva o chamador, e o access token carrega só `{ sub }`. A
  barra renderiza sem o endereço em vez de inventar um. Isto é resolvível
  **aqui** — `docs/upstream-first.md` põe cookie e sessão do BFF deste lado —
  gravando o endereço num cookie no login; ainda não feito porque mexe na rota
  de login da loja.

- **As doze peças de hoje só têm a variante `Único`.** A migration do
  [#19](https://github.com/ArtRiv/commerce-core/pull/19) deu a cada produto
  existente uma única variante `Único` carregando o estoque original, que é o
  que preserva o catálogo. Dar tamanhos reais a essas peças esbarra em não
  existir rota para remover variante — `POST /products/{id}/variants` só
  adiciona, e `docs/specs/product-variants.md` deixa a remoção de fora de
  propósito, porque remover exige decidir o que acontece com um tamanho que
  alguém já comprou. Enquanto isso, o PDP não mostra linha de tamanhos nessas
  peças: uma peça com só `Único` se autoseleciona e esconde a linha.

  Saídas possíveis, nenhuma tomada ainda: (a) subir uma rota de remoção de
  variante no commerce-core, recusando remover variante que já apareça em linha
  de pedido — a política que falta, e pequena; (b) recriar o catálogo do zero
  com `POST /products` mandando `variants`, o que o
  [`scripts/seed-catalog.mjs`](scripts/seed-catalog.mjs) já faz, mas exige
  apagar as doze peças de hoje, e `DELETE /products/{id}` arquiva em vez de
  apagar, então o slug continua ocupado. Enquanto não se decidir, a loja vende
  peça sem tamanho, o que funciona e é honesto.

- **O endereço da API não tem número nem bairro.** `ShippingAddressDto` é
  `line1 / line2 / city / state / postalCode`, e o artboard 07 desenha
  `Endereço`, `Número`, `Bairro` e `Cidade / UF` como quatro campos. O número
  vai dentro de `line1`, que é exatamente como o exemplo do próprio spec o
  escreve (`Rua das Flores, 100`); o bairro não tem onde entrar. Nada se perde
  hoje — o CEP determina o bairro e a etiqueta sai com cidade e UF — mas
  endereço estruturado passa nas três perguntas do teste de decisão com folga:
  toda loja brasileira quer, é dado persistido, e não dá para resolver aqui sem
  inventar campo. Candidato a upstream, ainda não decidido.

- **A API não publica a chave publicável da Stripe.** O commerce-core guarda
  `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` e mais nada — não há rota nem
  variável que entregue a `pk_...` ao navegador. Sem ela, `loadStripe()` não
  sobe, e portanto **nenhum storefront consegue montar o checkout `embedded`**,
  mesmo que `POST /orders` devolva `clientSecret`. Se alguma loja quiser
  renderizar o próprio checkout, a peça que falta é uma rota pública de
  configuração no commerce-core; a chave é pública por natureza e é
  configuração por implantação, então duplicá-la no `.env` de cada front-end
  seria a mesma verdade guardada em dois lugares. Ver a divergência do checkout
  abaixo.

### Resolvidas upstream

- **Quem comprou, na resposta do pedido.** `OrderResponse` dizia `userId` e
  mais nada, e o painel precisa de nome e e-mail na lista e no detalhe.
  `customers.read` está no catálogo de permissões sem rota atrás, e construir o
  diretório de clientes era decisão maior do que a tela pedia. Subiu no
  [#24](https://github.com/ArtRiv/commerce-core/pull/24): `buyer` com `id`,
  `name` e `email`, preenchido **só** para quem carrega `orders.read` e `null`
  para todo mundo mais — inclusive o próprio comprador, que não precisa da API
  para saber o próprio nome. As três colunas são selecionadas e copiadas uma a
  uma, nunca por spread nem `include: { user: true }`, porque `User` carrega
  `passwordHash` e a forma genérica é como uma listagem de back-office
  distribui hash de senha. `name` é anulável: conta criada pelo Google nunca
  passou por `RegisterDto`.

- **Totais da sacola.** `GET /cart` devolvia `{ items }` e nada mais, e o
  subtotal sairia de somar `priceCents × quantity` no front-end — a aritmética
  de dinheiro que o teste de decisão trata como lacuna do backend. Subiu no
  [#18](https://github.com/ArtRiv/commerce-core/pull/18): `itemsSubtotalCents` e
  `itemCount` vêm calculados no servidor, contra preços vivos do catálogo.
- **Contador da sacola no header.** O `Sacola (2)` do artboard 02 voltou, lendo
  `itemCount` do #18. Fica `Sacola` sem número quando não há sessão — não existe
  sacola de visitante, então zero seria uma afirmação falsa.
- **Tamanhos.** O design tem seletor P/M/G/GG/XGG e a API tinha um produto = um
  preço = um estoque. Subiu no #19: a variante é a unidade vendável,
  `AddCartItemDto` recebe `variantId`, e `ProductResponse.stockQuantity` passou
  a ser a soma das variantes calculada na leitura. Cada célula da linha de
  tamanhos é uma variante real, e a riscada é estoque zero de verdade — nada
  disso é mais constante no código.
- **Tamanho na linha da sacola.** `CartItemResponse.variant.label` existe, e o
  `Tamanho X` do artboard 06 é ele.

### Adiadas — resolvidas aqui, de propósito

- **O rótulo de papel na barra do painel é fixo.** Ao lado do e-mail o
  artboard mostra um chip `Admin`. Papéis são linhas no banco e a autorização é
  por permissão, nunca por papel — não há rota que devolva o nome do papel do
  chamador, e chamar de `Admin` quem talvez seja `operator` seria uma
  afirmação falsa sobre permissão. O chip diz `Operador`, que é o que carregar
  `products.read` e `orders.read` de fato significa.

- **O painel não tem tela inicial.** `/admin` redireciona para Produtos. O
  canvas desenha seis telas e nenhuma é um *dashboard*; os números que fariam
  um valer a pena — faturamento, pedidos do dia — vêm de `reports.read`, uma
  permissão sem rota atrás. Uma home vazia é pior do que chegar onde o
  trabalho começa.

- **O corpo do 409 do checkout é prosa.** `POST /orders` responde
  `{ statusCode, message, error }`, e a `message` nomeia as peças esgotadas
  dentro de uma frase. O artboard 10 precisa saber *qual linha* riscar. Em vez
  de fazer parsing de prosa ou de duplicar a regra, o front-end relê
  `GET /cart` e trata como culpada qualquer linha com
  `variant.stockQuantity < quantity` ou `product.status !== 'ACTIVE'` — dado que
  a API já entrega, e entrega *vivo* justamente para isso — e então chama
  `DELETE /cart/items/{variantId}`, o que torna verdadeiro o "Removemos da
  sacola" da tela. Se o 409 um dia ganhar corpo estruturado, esta reconciliação
  sai.
- **Faixa de newsletter da home.** O artboard 02 tem campo + `Assinar`, e não
  existe endpoint nenhum por trás disso — inventar um seria generalidade antes
  da hora. A faixa fica, sem campo e sem botão. O título também mudou: `Receba
  avisos de reposição` prometia exatamente aquilo que não temos como cumprir, e
  no lugar dele a faixa diz o que é verdade sobre os lotes. Nada em tela promete
  o que o backend não entrega.
- **As três peças em destaque da home.** O artboard 02 destaca uma peça de
  Camisetas, uma de Moletons e uma de Calças. A API não tem `featured`, e
  nenhuma regra sobre os dados reproduz essa escolha: por contagem de peças dá
  empate entre Moletons e Acessórios (2 cada), e o canvas escolheu Moletons.
  Escolha editorial não se deriva de catálogo. A home usa a regra "peça mais
  recente com estoque de cada uma das três maiores categorias" — a parte do
  estoque importa, porque a peça mais nova de Camisetas é justamente a esgotada,
  e vitrine não abre com o que ninguém pode comprar. Curadoria de verdade é uma
  flag `featured` no commerce-core, se e quando a loja quiser.
- **`Total` da sacola é o subtotal.** O artboard 06 tem três linhas — Subtotal,
  `Frete: calculado no checkout`, Total — e o canvas mostra os dois valores
  iguais. `GET /cart` recusa devolver total de propósito: sem CEP não há frete, e
  um "total" sem frete é exatamente o número que um checkout nunca pode mostrar.
  Aqui não mostra: a linha do frete diz o que falta, uma linha antes do total. O
  total de verdade vem de `POST /shipping/quote` como `orderTotalCents`, no
  artboard 07.
- **O CTA da sacola é ink, não rust.** O canvas pinta `Ir para o checkout` de
  `#B0431E`, e a §1 raciona rust a quatro lugares — CTA de recuperação do
  conflito, barra de espera do pagamento, badge de últimas unidades, hover de
  link. Este não é nenhum deles. A §1 é o contrato e o canvas é matéria bruta,
  então o botão é ink. Registrado aqui para que uma reimportação do canvas não
  desfaça isso sem perceber.
- **Tabela de especificações do PDP.** O artboard 04 lista Composição,
  Modelagem, Peso e Cuidados. A API tem `description` (texto livre) e
  `weightGrams`, e nada estruturado. `Peso` sai de `weightGrams`, que é dado real
  por peça; `Composição` e `Modelagem` ficam de fora porque repeti-las como
  linhas fixas seria carimbar copy de camiseta num boné e num par de meias.
  Atributos estruturados por produto são lacuna de backend legítima — todo PDP de
  toda loja tem essa tabela — e são candidatos a upstream quando alguém quiser.
  O `310 g no tamanho M` do design perde o qualificador pelo mesmo motivo: não
  há tamanho para nomear.
- **`Você também pode gostar` é "mesma categoria".** A API não tem recomendação,
  e inventar uma regra aqui seria lógica desta loja que nenhuma outra reusaria.
- **Rate limit por IP contra um BFF.** `register` (5/hora), `login` (5/15min),
  `refresh` (60/min), `shipping/quote` (30/min) e `orders/:id/pay` (10/min) são
  todos chaveados no IP do chamador, lido de `cf-connecting-ip` — que a
  Cloudflare sobrescreve a partir do socket. Como todo o tráfego desta loja sai
  do servidor do Next, **todos os visitantes dividem o mesmo balde**: o sexto
  cadastro da hora leva 429. Irrelevante para um portfólio com um usuário, e
  parede em qualquer tráfego real. Não há conserto deste lado. É o próximo
  candidato a upstream depois de tamanhos.

- **O checkout é `hosted`; o artboard 07 foi desenhado para `embedded`.** A
  instância implantada roda `STRIPE_CHECKOUT_MODE=hosted`, e o modo `embedded`
  está bloqueado de qualquer forma pela chave publicável que não existe (acima).
  Então o `/checkout` **não manda `paymentMode`**: qual UI de pagamento uma
  instância emite é configuração dela, não opinião deste front-end, e mandar
  `"hosted"` explicitamente carimbaria no código uma escolha que é por
  implantação. Duas consequências em tela. A seção `02 Pagamento` não desenha a
  tira em forma de campo de cartão que o canvas mostra — um campo que nunca
  aceita uma tecla é justamente o tipo de coisa que o resto desta loja se recusa
  a renderizar — e no lugar dela diz o que de fato vai acontecer: o comprador
  segue para a página da Stripe e volta. A frase do design sobre quem vê o
  número do cartão fica literal, porque continua verdadeira nos dois modos.

- **Não há busca de endereço por CEP.** O artboard 07 mostra o endereço
  preenchido depois do `Calcular frete`, e `POST /shipping/quote` devolve
  opções de frete e nada mais — não existe rota de consulta de CEP na API. Os
  campos de endereço são digitados. Chamar um serviço de CEP daqui seria uma
  integração que só esta loja teria, e o teste de decisão manda isso para o
  commerce-core se algum dia alguém quiser.

- **Um `409` do checkout nem sempre é estoque.** O mesmo status responde
  "o frete cotado não bate mais", e aí não há linha nenhuma para riscar. A
  reconciliação distingue os dois pelo que encontra na sacola: achou linha
  inelegível, é o artboard 10; não achou, o frete envelheceu — recota, e diz de
  quanto para quanto ele mudou, uma linha acima do botão. Em nenhum dos dois
  casos o pedido é reenviado sozinho: o ponto do `quotedShippingCents` é o
  comprador nunca ser cobrado por um preço que não viu.

- **O artboard 10 é estado do `/checkout`, e só os cinco deltas entram.** A §3
  lista o que muda: item riscado, banner no resumo, total antigo riscado ao
  lado do novo, CTA rust e `Nada foi cobrado ainda.` A tela continua com o
  `Finalizar pedido` no h1 e com as três seções numeradas — o artboard corta a
  01 e a 02 porque desenha só o que mudou, e trocar o h1 com elas ainda em tela
  descreveria a página errada.

- **O total do resumo é ink, não rust.** Mesma decisão do CTA da sacola, pelo
  mesmo motivo: a §1 raciona rust a quatro lugares e um total não é nenhum
  deles. O canvas pinta `R$ 522,30` de `#B0431E` no artboard 07; a §1 é o
  contrato. O único rust do checkout é o CTA de recuperação do artboard 10, que
  é literalmente um dos quatro.

### Correções: a prosa ficou para trás do spec

O documento OpenAPI vivo ganha de qualquer texto, inclusive dos `docs/` deste
repositório. Duas coisas que já divergem:

- **`GET /products` filtra e ordena no servidor.** `docs/design-system.md` §3 e o
  kickoff dizem que as faixas de preço são calculadas no cliente e que só existem
  filtro de categoria e busca por nome. O spec tem `sort`
  (`newest | price_asc | price_desc | name_asc`, um-para-um com o seletor de
  ordenação do artboard 03) e `minPriceCents` / `maxPriceCents`. As quatro faixas
  do design, consultadas na API, devolvem **5 / 2 / 4 / 1** — as contagens
  corrigidas da §8. O catálogo é construído contra o servidor; nenhuma aritmética
  de preço acontece aqui.
- **O frete real não é o do design.** A `SHIPPING_TABLE` implantada tem
  `padrao-sudeste` (Entrega padrão, 5 dias, R$ 19,90 ou R$ 39,90 conforme o peso)
  e `padrao-brasil` (10 dias, R$ 49,90), escolhidas por prefixo de CEP — então um
  CEP costuma devolver **uma única opção**, com `carrier: null`. O
  `SEDEX · Correios · R$ 42,50` / `PAC · R$ 24,90` da §5 é dado de demonstração.
  A linha de frete é construída para sobreviver a uma opção só e a `carrier` e
  `estimatedDays` nulos.
