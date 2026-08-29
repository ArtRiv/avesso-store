// The destructive flow, end to end, against the DISPOSABLE e2e schema.
//
// Self-seeding: every run creates its own product, so it is repeatable and
// leaves nothing the next run depends on.
//
// Cart lines are inserted straight into the fixture rather than driven through
// the storefront. Login is rate-limited to 5 per 15 minutes per IP and this
// needs several shoppers — and what is under test is the panel's behaviour
// when carts hold a size, not how the lines got there.
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

import { as, call, ensureSignedIn } from './drive.mjs';

const API = 'http://localhost:3000';
const PASSWORD = 'correct horse battery staple';
const ADMIN = 'operador@avesso.test';
const CUSTOMER = 'cliente@avesso.test';

const url = process.env.E2E_DATABASE_URL;
const schema = /-c\s+search_path=([^\s,]+)/.exec(
  new URL(url).searchParams.get('options') ?? '',
)?.[1];

if (!schema || schema === 'public') {
  console.error('Refusing: schema is', schema);
  process.exit(1);
}

const db = new Client({ connectionString: url });
await db.connect();
await db.query(`set search_path to "${schema}"`);

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

async function shopperHolding(variantId, tag) {
  const roleId = (await db.query("select id from roles where name = 'customer'")).rows[0].id;
  const userId = randomUUID();
  await db.query(
    'insert into users (id, email, name, role_id, email_verified_at, created_at, updated_at) values ($1,$2,$3,$4,now(),now(),now())',
    [userId, `shopper-${tag}-${randomUUID().slice(0, 8)}@avesso.test`, `Shopper ${tag}`, roleId],
  );
  const cartId = randomUUID();
  await db.query('insert into carts (id, user_id, created_at, updated_at) values ($1,$2,now(),now())', [cartId, userId]);
  await db.query(
    'insert into cart_items (id, cart_id, variant_id, quantity) values ($1,$2,$3,1)',
    [randomUUID(), cartId, variantId],
  );
}

for (const [session, email] of [['admin', ADMIN], ['customer', CUSTOMER]]) {
  console.log(' ', session, await ensureSignedIn(session, email, PASSWORD));
}
as('admin');

// ── fixture, seeded straight through the API (the panel has no create screen) ─
let cachedToken = null;
async function adminToken() {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`seed login -> ${res.status}`);
  cachedToken = (await res.json()).accessToken;
  return cachedToken;
}

async function seedProduct(body) {
  const res = await fetch(`${API}/products`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await adminToken()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`seed product -> ${res.status} ${await res.text()}`);
  return res.json();
}

const tag = randomUUID().slice(0, 8);
const seeded = await seedProduct({
  name: `Peça ${tag}`, slug: `peca-${tag}`, priceCents: 9990, status: 'ACTIVE',
  variants: [
    { label: 'P', stockQuantity: 5 },
    { label: 'M', stockQuantity: 5 },
    { label: 'G', stockQuantity: 5 },
  ],
});
const unsized = await seedProduct({
  name: `Única ${tag}`, slug: `unica-${tag}`, priceCents: 4990, status: 'ACTIVE',
});

const PRODUCT = seeded.id;
const UNSIZED = unsized.id;

async function removeAttempt(variantId, expected) {
  const query = expected === null ? '' : `?discardCartLines=true&expectedCartLineCount=${expected}`;
  return call(`/api/admin/products/${PRODUCT}/variants/${variantId}${query}`, { method: 'DELETE' });
}

async function product(id = PRODUCT) {
  return (await call(`/api/admin/products/${id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}',
  })).body;
}

const P = seeded.variants.find((v) => v.label === 'P');
const M = seeded.variants.find((v) => v.label === 'M');
const G = seeded.variants.find((v) => v.label === 'G');

console.log('\n== a size no cart holds ==');
let r = await removeAttempt(P.id, null);
check('removes with no authorisation needed', r.status === 200, String(r.status));

console.log('\n== a size carts hold ==');
await shopperHolding(M.id, 'a');
await shopperHolding(M.id, 'b');
await shopperHolding(M.id, 'c');

r = await removeAttempt(M.id, null);
check('unauthorised attempt is refused and names the count',
  r.status === 409 && r.body.reason === 'carts' && r.body.cartLineCount === 3,
  `${r.status} ${JSON.stringify(r.body)}`);

check('nothing was destroyed by asking',
  (await product()).variants.some((v) => v.id === M.id));

r = await removeAttempt(M.id, 2);
check('a wrong count is refused and returns the real one',
  r.status === 409 && r.body.reason === 'carts' && r.body.cartLineCount === 3,
  `${r.status} ${JSON.stringify(r.body)}`);

console.log('\n== the race: a fourth sacola arrives mid-review ==');
await shopperHolding(M.id, 'd');
r = await removeAttempt(M.id, 3);
check('the stale authorisation is refused, and carries the new number',
  r.status === 409 && r.body.reason === 'carts' && r.body.cartLineCount === 4,
  `${r.status} ${JSON.stringify(r.body)}`);

check('and the size is still there',
  (await product()).variants.some((v) => v.id === M.id));

const before = (await db.query('select count(*)::int n from cart_items where variant_id = $1', [M.id])).rows[0].n;
check('all four cart lines are intact', before === 4, String(before));

console.log('\n== confirming the number that is actually true ==');
r = await removeAttempt(M.id, 4);
check('removal goes through', r.status === 200, `${r.status} ${JSON.stringify(r.body)}`);
check('the size is gone from the product', !r.body.variants?.some((v) => v.id === M.id));

const after = (await db.query('select count(*)::int n from cart_items where variant_id = $1', [M.id])).rows[0].n;
check('and every cart line went with it', after === 0, String(after));

console.log('\n== a size somebody bought ==');
as('customer');
r = await call('/api/cart/items', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ variantId: G.id, quantity: 1 }),
});
check('customer adds the size to their sacola', r.status === 200 || r.status === 201, String(r.status));

const quote = await call('/api/shipping/quote', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ postalCode: '80000-000' }),
});
const option = quote.body.options?.[0];
check('freight quoted', Boolean(option), JSON.stringify(quote.body).slice(0, 120));

const order = await call('/api/orders', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    shippingAddress: { line1: 'Rua das Flores, 100', city: 'Curitiba', state: 'PR', postalCode: '80000-000' },
    shippingOptionCode: option.code,
    quotedShippingCents: option.priceCents,
  }),
});
check('order placed', order.status === 201, `${order.status} ${JSON.stringify(order.body).slice(0, 160)}`);

as('admin');
r = await removeAttempt(G.id, null);
check('a sold size is refused, with no count and no way through',
  r.status === 409 && r.body.reason === 'blocked', `${r.status} ${JSON.stringify(r.body)}`);

r = await removeAttempt(G.id, 0);
check('and authorising cannot override it',
  r.status === 409 && r.body.reason === 'blocked', String(r.status));

r = await call(`/api/admin/products/${PRODUCT}/variants/${G.id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'Grande' }),
});
check('renaming it works — the escape hatch the dialog offers',
  r.status === 200 && r.body.variants.some((v) => v.label === 'Grande'), String(r.status));

const snapshot = (await db.query('select variant_label from order_items where variant_id = $1', [G.id])).rows[0]?.variant_label;
check('and the placed order keeps the label it was bought under', snapshot === 'G', String(snapshot));

console.log('\n== the last size ==');
const only = await product(UNSIZED);
check('the unsized product has exactly one size', only.variants.length === 1, String(only.variants.length));

r = await call(`/api/admin/products/${UNSIZED}/variants/${only.variants[0].id}`, { method: 'DELETE' });
check('removing the last size is refused',
  r.status === 409 && r.body.reason === 'blocked', `${r.status} ${JSON.stringify(r.body)}`);

console.log('\n== half a confirmation ==');
r = await call(`/api/admin/products/${PRODUCT}/variants/${G.id}?discardCartLines=true`, { method: 'DELETE' });
check('authorisation without a count is refused before it leaves', r.status === 400, String(r.status));

r = await call(`/api/admin/products/${PRODUCT}/variants/${G.id}?expectedCartLineCount=3`, { method: 'DELETE' });
check('a count without authorisation is refused too', r.status === 400, String(r.status));

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail === 0 ? 0 : 1);
