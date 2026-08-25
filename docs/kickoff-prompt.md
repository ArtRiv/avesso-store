# Kickoff prompt — AVESSO storefront

> Paste everything below the line into a fresh Claude Code session opened in
> this repository. It is written to be read cold, by an agent with no memory
> of how we got here.

---

You are building **AVESSO**, the storefront for a headless commerce API. This
repository is empty except for three documents. Read all three, completely,
before writing a line of code:

- `docs/backend-commerce-core.md` — the backend contract. Written by the
  backend's own repo and copied here verbatim.
- `docs/design-system.md` — the visual contract, extracted from a Claude
  Design canvas. Tokens, component CSS, all 10 screens, the full copy deck.
- `docs/upstream-first.md` — **how to work.** What to do when the API is
  missing something. Read this one before you hit the problem, not after.

If code and `docs/design-system.md` ever disagree, the document wins. If a
document and the live OpenAPI spec disagree, **the OpenAPI spec wins** — it
is the only thing the backend's CI guarantees.

## Stack — already decided, do not relitigate

- **Next.js 15, App Router, TypeScript, pnpm, `src/` directory**
- **Tailwind v4**, tokens declared in `@theme`
- **shadcn/ui**, restyled to the design (see "shadcn" below)
- **Auth: BFF pattern.** Tokens live in httpOnly cookies set by route
  handlers. The browser never touches a refresh token.
- **API client generated from OpenAPI.** `openapi-typescript` for types,
  `openapi-fetch` for the client. No hand-written request or response types,
  ever.

## How to work — upstream-first

This matters more than any screen, so it goes before the build steps.

The commerce-core backend is **not the backend of this store**. It is a
backend built to be redeployed for every store this author makes: same `main`,
different database, different Stripe account. That only survives if nobody
ever works around it.

So when you find something the API cannot do:

> **Do not build a workaround here. Take it upstream, PR it into
> commerce-core, test it, merge it, and then continue this screen.**

A workaround you tell yourself is temporary is how the template dies. The
first store-specific hack is the moment it stops being reusable.

`docs/upstream-first.md` has the decision test, the full procedure, and the
backend's environment traps. Three things to internalize right now:

1. **The trigger.** A gap counts when *this* store needs it for a screen you
   are building *now*, and another store would plausibly need it too. Domain,
   data, money, state transitions, permissions → upstream. Layout, routing,
   copy, UI state, formatting → here. If you catch yourself doing arithmetic
   on money, stock, or freight to make a screen work, you have found a backend
   gap, not a frontend puzzle.
2. **The decision is joint.** Name the gap, say which side you think it falls
   on and why, and get agreement before you either open a backend PR or accept
   a deferral. Do not disappear into the backend unannounced, and do not
   quietly work around it either. If it gets deferred, record the divergence
   in this repo's `README.md` instead of hiding it.
3. **Nothing speculative.** "Some store might want this someday" is not a
   trigger. Generality is not invented ahead of need.

The backend lives at `C:\Users\Arthu\Desktop\code\commerce-core`. Bring it
into the session with `/add-dir` when the moment comes. It has its own
workflow — spec in `docs/specs/` before code, TDD inside-out, e2e as a safety
net, regenerate `openapi.json` or CI fails — and you follow it there, not the
conventions of this repo.

## Step 0 — scaffold

```bash
pnpm create next-app@latest . --ts --tailwind --app --src-dir --eslint --import-alias "@/*" --use-pnpm
```

`docs/` is on create-next-app's allowlist and survives. If it refuses because
of `README.md`, move it aside and restore it afterwards.

Then set the dev port to **5173**, not 3000 — the backend runs on 3000 locally
and its `APP_URL` already defaults to `http://localhost:5173`. A port collision
here costs an hour of confusion:

```json
"dev": "next dev -p 5173"
```

Create `.env.local`:

```
API_URL=https://commerce-core-kvlg.onrender.com
NEXT_PUBLIC_SITE_URL=http://localhost:5173
```

`API_URL` is server-only and must never be prefixed `NEXT_PUBLIC_`. All API
traffic goes through the server; the browser talks only to this app.

## Step 1 — generate the client, before any screen

```bash
pnpm add openapi-fetch && pnpm add -D openapi-typescript
pnpm dlx openapi-typescript $API_URL/docs-json -o src/lib/api/schema.d.ts
```

Add it as a script (`api:types`) and commit the generated file. Then build one
typed client in `src/lib/api/client.ts` on top of `openapi-fetch`.

**Heads up: the backend is on Render's free tier.** It hibernates after 15
minutes idle and takes ~60s to wake. The first request after a quiet period
will look frozen. That is not a bug and you must not build a workaround for
it — just make sure loading states are honest and nothing times out at 10s.

## Step 2 — design foundation

Declare the eight palette colors, both font families, and the type scale in
`@theme` in `globals.css`. Load Archivo and JetBrains Mono with
`next/font/google`, not `<link>` tags.

Then build `/style-tile` as a real route that renders every token and every
component state — the same content as artboard 01. It is your regression
surface: when a component drifts, you see it there first. Keep it in the repo.

### shadcn

Init with base color `neutral`, then install only what you actually need:
`button`, `input`, `label`, `radio-group`, `dialog`, `sheet`, `form`,
`separator`, `skeleton`.

shadcn's defaults are rounded, shadowed, and instantly recognizable. Since the
components are copied into your repo, you own them — **restyle each one as you
add it**, and do not merge one that still looks like stock shadcn:

- every `rounded-*` becomes `rounded-none`, except buttons and inputs which are `rounded-[2px]`
- every `shadow-*` is deleted outright — the design has no shadows at all
- focus rings become a 1px `ink` border, not a coloured glow
- button label typography is mono, 12px, uppercase, `tracking-[.08em]`
- default sizes snap to the 48px control height

Do not install a spinner component. The only loading motion in this design is
the 2px rust bar (`docs/design-system.md` §2).

## Step 3 — auth, the BFF

This is the part that bites. Read points 4 and 5 of the backend doc twice.

- Route handlers under `src/app/api/auth/*` are the **only** code that talks to
  `/auth/login`, `/auth/refresh`, `/auth/logout`.
- Access token → httpOnly cookie `av_at`, 15 min. Refresh token → httpOnly
  cookie `av_rt`, `path=/api/auth/refresh`, `sameSite=lax`, `secure` in prod.
- Server components read `av_at` via `cookies()` to call the API.
- **A server component cannot set cookies in Next 15.** So refresh can only
  happen in a route handler, a server action, or middleware. Never attempt it
  during a server render — plan the layout around that constraint now, not
  after you hit the error.
- **Refresh tokens are single-use, and presenting a spent one revokes the
  entire session.** Two concurrent refreshes will log the user out. Serialize
  them: a single module-level in-flight promise on the client, and one
  dedicated server route. When a call 401s, refresh once, retry once, and on a
  second 401 clear both cookies and send the user to login.

Build these pages, which the backend's transactional emails link to directly.
Without them registration cannot complete — e-mail verification is mandatory
for password login:

- `/verify-email?token=…` → `POST /auth/verify-email`
- `/reset-password?token=…` → `POST /auth/reset-password`

`GET /auth/google` returns `503` when the instance has no Google credentials.
Treat that as "hide the button", not as an error.

## Step 4 — build order

Ship these in order, each one working before the next starts:

1. **Home** (`/`) — artboard 02. Server component, catalog fetched on the server.
2. **Catálogo** (`/catalogo`) — artboard 03. Category filter and name search only; that is all `GET /products` supports. No facets, no price slider wired to the API — the price ranges in the design are client-side.
3. **PDP** (`/produto/[slug]`) — artboard 04.
4. **Sacola** (`/sacola`) — artboards 06 and 09.
5. **Checkout** (`/checkout`) — artboard 07, then the 409 state, artboard 10.
6. **Pedido** (`/pedido/[id]`) — artboard 08, both variants.
7. Auth pages and `/minha-conta/pedidos`.

## The five things that will break this build

These come from the backend contract. Get them wrong and the store is broken
in a way tests won't catch.

1. **Money is integer cents.** Format at the edge, never store a float. `priceCents: 14990` → `R$ 149,90`. Use `Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })` on `cents / 100` in one shared helper and nowhere else.

2. **The Stripe redirect is not payment confirmation.** When the buyer returns, the order is very often still `CREATED` — the webhook that moves it to `PAID` may arrive seconds later. `/pedido/[id]` must poll `GET /orders/:id` (2s interval, back off, give up gracefully after ~60s and tell the user an email is coming) and render artboard 08's *aguardando* variant until it sees `PAID`. Never render a success state you have not verified.

3. **`409` is a screen, not a toast.** The last unit can sell between cart and checkout. Artboard 10 defines exactly what that looks like: the line item struck through in clay, a hairline banner explaining what was removed, the old total struck beside the new one, a rust CTA to finish with what remains, and `Nada foi cobrado ainda.` No modal. No red alert box.

4. **There is no guest cart.** `POST /cart/items` requires a token. An anonymous "Adicionar à sacola" opens the inline login panel from artboard 05 — the product stays on screen and the page does not navigate. After login, complete the original add.

5. **Shipping price does not come from the client.** Quote via `POST /shipping/quote` with the CEP, then send back `shippingOptionCode` **and** `quotedShippingCents` at checkout. The server re-quotes and rejects a mismatch. Handle `estimatedDays` and `carrier` being `null` — the design's freight row must survive both.

## Sizes — the first upstream candidate

The design has a P/M/G/GG/XGG selector. **The API has no product variants**: one
product, one price, one stock count.

Run it through the decision test and it passes on all three counts: every
clothing store needs it, it is pure domain (schema, per-variant stock, order
items), and there is no way to do it here without inventing a field. So this
is not a divergence to live with — it is the first thing to take upstream.

**Raise it when you reach the PDP** (build order step 3), not before. Say what
the change involves in commerce-core and ask whether to do it now or defer.
Then:

- **If we do it now** — stop frontend work, follow `docs/upstream-first.md`,
  ship the variants PR, wait for the deploy, regenerate `pnpm api:types`, and
  build the PDP against the real thing.
- **If we defer** — render the size row exactly as designed, including GG
  struck through. Keep the selection in client state and require it before the
  CTA enables, but **do not send it anywhere**: `POST /cart/items` takes
  `{ productId, quantity }` and nothing else, and you must never invent a field
  the OpenAPI document doesn't have. Omit the size line from cart rows. Leave
  one comment pointing at this section, and record it in the README.

## Rules for the whole build

- Never hand-write a request or response type. Regenerate from `/docs-json`.
- Never invent an endpoint or a field. If it isn't in the OpenAPI document it does not exist — and the answer is a PR to commerce-core, following `docs/upstream-first.md`, not a clever fix here.
- Never work around a backend gap silently. Name it, decide together, then either fix it upstream or write the deferral down.
- Never do arithmetic on money, stock, or freight to make a screen work. That is always a backend gap.
- Never treat the Stripe return as proof of payment.
- Never fire two concurrent refreshes.
- `409` and `429` are first-class UI states. `429` carries `Retry-After` — respect it.
- `404` means "gone or not yours". Another customer's order returns 404, not 403. Don't write copy that says "acesso negado".
- Do not build coupons, wishlist, reviews, guest checkout, image upload, or a currency switcher. None of them exist in the backend, and two of them have permissions reserved specifically so nobody builds UI against them.
- pt-BR everywhere, cart is **sacola**, no exclamation marks.
- Commit per working slice, conventional commits, no `--no-verify`.

## Done, for round one

The store runs against the deployed API and a real person can go from the home
page to a paid order without you explaining anything to them. `/style-tile`
matches artboard 01. The 409 path and the awaiting-webhook path are both
reachable and both look like the design. `pnpm build` and `pnpm lint` pass.

Start by reading the three documents and generating the client from the live
spec, then show me your plan before you scaffold.
