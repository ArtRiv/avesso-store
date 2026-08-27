# avesso-store

Storefront da AVESSO — uma loja de básicos unissex construída sobre o
[commerce-core](https://github.com/ArtRiv/commerce-core), um backend headless
de e-commerce em NestJS.

Projeto de portfólio. O backend já está em produção; este repositório é o
front-end que o consome.

## Stack

- Next.js 15 (App Router) + TypeScript
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

## Divergências conhecidas entre design e API

Registradas aqui, e não escondidas no código, conforme
[`docs/upstream-first.md`](docs/upstream-first.md). Cada uma diz de que lado a
decisão caiu e por quê.

### Em aberto — vai subir para o commerce-core

- **Totais da sacola.** `GET /cart` devolve `{ items }` e nada mais: nenhum
  subtotal. O subtotal da sacola (artboard 06), o total da revisão do checkout
  (07) e o total novo do conflito de estoque (10) sairiam todos de somar
  `priceCents × quantity` no front-end — exatamente a aritmética de dinheiro que
  o teste de decisão trata como lacuna do backend. **Decidido subir**, com o PR
  aberto quando a sacola for construída, e não antes.
- **Tamanhos.** O design tem seletor P/M/G/GG/XGG; a API não tem variantes de
  produto (um produto = um preço = um estoque). A decisão de subir agora ou
  adiar se toma quando o PDP for construído. Até lá, o seletor é renderizado
  como estado-alvo e a seleção não é enviada a lugar nenhum.
- **Tamanho na linha da sacola.** Pelo mesmo motivo, a linha da sacola omite o
  tamanho que o artboard 06 mostra.

### Adiadas — resolvidas aqui, de propósito

- **O corpo do 409 do checkout é prosa.** `POST /orders` responde
  `{ statusCode, message, error }`, e a `message` nomeia as peças esgotadas
  dentro de uma frase. O artboard 10 precisa saber *qual linha* riscar. Em vez
  de fazer parsing de prosa ou de duplicar a regra, o front-end relê
  `GET /cart` e trata como culpada qualquer linha com
  `product.stockQuantity < quantity` ou `status !== 'ACTIVE'` — dado que a API
  já entrega — e então chama `DELETE /cart/items/{productId}`, o que torna
  verdadeiro o "Removemos da sacola" da tela. Se o 409 um dia ganhar corpo
  estruturado, esta reconciliação sai.
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
- **Contador da sacola no header.** O artboard 02 mostra `Sacola (2)`. Sai o
  número enquanto `GET /cart` não devolver `itemCount` — somar quantidades aqui
  seria justamente o que o PR de totais da sacola existe para evitar. Volta com
  uma linha quando o PR entrar.
- **Rate limit por IP contra um BFF.** `register` (5/hora), `login` (5/15min),
  `refresh` (60/min), `shipping/quote` (30/min) e `orders/:id/pay` (10/min) são
  todos chaveados no IP do chamador, lido de `cf-connecting-ip` — que a
  Cloudflare sobrescreve a partir do socket. Como todo o tráfego desta loja sai
  do servidor do Next, **todos os visitantes dividem o mesmo balde**: o sexto
  cadastro da hora leva 429. Irrelevante para um portfólio com um usuário, e
  parede em qualquer tráfego real. Não há conserto deste lado. É o próximo
  candidato a upstream depois de tamanhos.

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
