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
- **Linha de newsletter da home.** O artboard 02 tem campo + `Assinar`, e não
  existe endpoint nenhum por trás disso — inventar um seria generalidade antes
  da hora. A faixa editorial fica com o texto e sem o campo: nada em tela promete
  o que o backend não cumpre.
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
