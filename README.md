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

## Divergências conhecidas entre design e API

- **Tamanhos.** O design tem seletor P/M/G/GG/XGG; a API não tem variantes de
  produto (um produto = um preço = um estoque). É o primeiro candidato a PR
  upstream — a decidir quando o PDP for construído. Até lá, o seletor é
  renderizado como estado-alvo e a seleção não é enviada a lugar nenhum.
- **Tamanho na linha da sacola.** Pelo mesmo motivo, a linha da sacola omite o
  tamanho que o artboard 06 mostra.
