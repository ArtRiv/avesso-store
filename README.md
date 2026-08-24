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
| [`docs/kickoff-prompt.md`](docs/kickoff-prompt.md) | O prompt de partida da construção. |

A fonte de verdade da API é o documento OpenAPI publicado pelo backend em
`/docs-json` — ele ganha de qualquer texto aqui em caso de divergência.

## Divergências conhecidas entre design e API

- **Tamanhos.** O design tem seletor P/M/G/GG/XGG; a API não tem variantes de
  produto (um produto = um preço = um estoque). O seletor é renderizado como
  estado-alvo, mas a seleção não é enviada a lugar nenhum. Resolver isso é um
  PR no commerce-core, não um contorno aqui.
- **Tamanho na linha da sacola.** Pelo mesmo motivo, a linha da sacola omite o
  tamanho que o artboard 06 mostra.
