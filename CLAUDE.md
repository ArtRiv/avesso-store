@AGENTS.md

# avesso-store

Storefront for the commerce-core headless API. Read `docs/` before writing code
— all three files, completely.

| file | what it is |
| --- | --- |
| `docs/backend-commerce-core.md` | The backend contract, copied from its own repo. |
| `docs/design-system.md` | The visual contract: tokens, component CSS, all 10 screens, the copy deck. |
| `docs/upstream-first.md` | **How to work** when the API is missing something. Read it before you hit the problem. |
| `docs/kickoff-prompt.md` | The build's starting brief. |

Precedence when they disagree: **the live OpenAPI document beats every document
here**, and `docs/design-system.md` beats the code. The spec is the only one the
backend's CI guarantees; regenerate it with `pnpm api:types` rather than trusting
any prose, including this file.

Known places the prose has already fallen behind the spec are recorded in
`README.md` under "Divergências conhecidas".

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

## Non-negotiables

- **Never hand-write a request or response type.** They come from
  `src/lib/api/schema.d.ts`, which `pnpm api:types` regenerates from
  `/docs-json`. Never edit it by hand.
- **Never invent an endpoint or a field.** Not in the OpenAPI document means it
  does not exist, and the answer is a PR to commerce-core following
  `docs/upstream-first.md` — never a clever fix here.
- **Never do arithmetic on money, stock or freight** to make a screen work.
  That is always a backend gap. Money is integer cents; format it at the edge
  through the one shared helper and nowhere else.
- **Never treat the Stripe return as proof of payment.** The webhook is the
  truth; poll `GET /orders/:id` until it says `PAID`.
- **Never fire two concurrent refreshes.** A spent refresh token revokes the
  whole session family. One in-flight promise, one dedicated route.
- `409` and `429` are first-class UI states, not toasts. `429` carries
  `Retry-After`.
- `404` means "gone **or** not yours" — another customer's order is a 404. Never
  write copy that says "acesso negado".
- pt-BR everywhere. The cart is a **sacola**. No exclamation marks.
- Conventional commits, one per working slice, never `--no-verify`.

## This is Next 16, not 15

The brief says Next 15; `create-next-app@latest` installed **16.3.3**. What
differs and matters here:

- `middleware.ts` is now **`proxy.ts`**, exporting a function named `proxy`. It
  runs on the nodejs runtime only — edge is not supported there.
- `cookies()` and `headers()` are async-only; the synchronous compatibility
  shim from 15 is gone. `params` and `searchParams` are Promises.
- A server component still **cannot set a cookie** — only a route handler or a
  server function can. This is what shapes the whole BFF: refresh happens in a
  route handler, never during a render.
- `next typegen` generates `PageProps<'/produto/[slug]'>` and `RouteContext`
  helpers. Use them instead of typing params by hand.

`AGENTS.md` is written and rewritten by `next dev` itself — commit it with your
work rather than deleting it. It points at `node_modules/next/dist/docs/`, which
is the version-accurate reference for anything above.

## Ports

Dev runs on **5173**, not 3000. commerce-core runs on 3000 locally, and its
`APP_URL` already defaults to `http://localhost:5173`.

## The routes the backend sends people to

These are not in the design, and skipping them silently breaks e-mail and
payment. They are thin redirects into the designed routes:

| the backend links to | what it is |
| --- | --- |
| `/verify-email?token=…` | verification e-mail — registration cannot complete without it |
| `/reset-password?token=…` | password reset e-mail |
| `/checkout/success?order=…` | Stripe hosted checkout, on success |
| `/checkout/cancel?order=…` | Stripe hosted checkout, on cancel |
| `/orders/<id>` | **every order e-mail** — the designed route is `/pedido/[id]` |
| `/checkout/return?order=…` | embedded Stripe only; the deployed instance is `hosted` |
