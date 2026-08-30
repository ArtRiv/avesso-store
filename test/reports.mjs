// The reports screen and the four routes behind it: the authorization
// boundary, the half-open window, the snapshot, and the two lists that are
// exact complements of each other.
//
// Self-seeding against the DISPOSABLE e2e schema, and driven through the BFF
// with real cookies — so what is checked is the path a browser takes, and a
// 403 here is a 403 a customer would actually receive.
import { randomUUID } from 'node:crypto';

import { as, call, ensureSignedIn } from './drive.mjs';
import { ADMIN, CUSTOMER, PASSWORD, seedProduct } from './fixture.mjs';

const CEP = '05422-010';

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

await ensureSignedIn('admin', ADMIN, PASSWORD);
await ensureSignedIn('customer', CUSTOMER, PASSWORD);

/** The four report routes, so the boundary is checked against every one. */
const ROUTES = [
  '/api/admin/reports/carts',
  '/api/admin/reports/revenue',
  '/api/admin/reports/product-sales',
  '/api/admin/reports/unsold-products',
];

/** Empties the signed-in customer's bag, so a count is a count of what we put there. */
async function emptyBag() {
  const existing = await call('/api/cart');
  for (const line of existing.body?.items ?? []) {
    await call(`/api/cart/items/${line.variantId}`, { method: 'DELETE' });
  }
}

/**
 * Buys `quantity` of one size of a fresh piece and marks the order PAID.
 *
 * orders.mjs has its own version of this and the two are not merged on
 * purpose: that one exercises the five transitions and wants a plain order,
 * this one wants a *sale* — a known piece, a known number of units and a known
 * price, so `unitsSold` and `itemsRevenueCents` are numbers this file can
 * predict rather than merely read back.
 *
 * Marked paid by hand rather than through Stripe, which is what makes `paidAt`
 * exist at all here. A CREATED order is not revenue, and that is the point of
 * the check below.
 */
async function sell({ priceCents, quantity }) {
  const tag = randomUUID().slice(0, 8);
  const product = await seedProduct({
    name: `Vendida ${tag}`,
    slug: `vendida-${tag}`,
    priceCents,
    status: 'ACTIVE',
    variants: [{ label: 'M', stockQuantity: 40 }],
  });

  as('customer');
  await emptyBag();
  await call('/api/cart/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ variantId: product.variants[0].id, quantity }),
  });

  const quote = await call('/api/shipping/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ postalCode: CEP }),
  });
  const option = quote.body.options[0];

  const order = await call('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      shippingAddress: {
        line1: 'Rua das Palmeiras, 214',
        city: 'São Paulo',
        state: 'SP',
        postalCode: CEP,
      },
      shippingOptionCode: option.code,
      quotedShippingCents: option.priceCents,
    }),
  });

  if (order.status !== 201) {
    throw new Error(`checkout -> ${order.status} ${JSON.stringify(order.body).slice(0, 200)}`);
  }

  as('admin');
  const paid = await call(`/api/admin/orders/${order.id}/mark-paid`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  });

  if (paid.status !== 200) {
    throw new Error(`mark-paid -> ${paid.status} ${JSON.stringify(paid.body).slice(0, 200)}`);
  }

  return { product, order: paid.body, quantity, priceCents };
}

console.log('\n== the boundary: reports.read, on every route ==');
as('customer');
for (const route of ROUTES) {
  const r = await call(route);
  check(`a customer is refused ${route}`, r.status === 403, `${r.status} ${JSON.stringify(r.body)}`);
}

let r = await call('/admin/relatorios');
check('and does not get the screen',
  r.status === 200 && r.text.includes('Esta conta não abre o painel'), String(r.status));

as('anon');
for (const route of ROUTES) {
  const anon = await call(route);
  check(`anonymous is 401 on ${route}, not 403`, anon.status === 401, String(anon.status));
}
r = await call('/admin/relatorios');
check('anonymous is sent to sign in', r.status === 307, String(r.status));

as('admin');
for (const route of ROUTES) {
  const ok = await call(route);
  check(`the operator reads ${route}`, ok.status === 200, `${ok.status} ${JSON.stringify(ok.body).slice(0, 120)}`);
}

console.log('\n== the window is [from, to) ==');
r = await call('/api/admin/reports/revenue?from=2026-08-01&to=2026-08-01');
check('from equal to to is a 400, not an empty series',
  r.status === 400, `${r.status} ${JSON.stringify(r.body).slice(0, 140)}`);

r = await call('/api/admin/reports/revenue?from=2026-09-01&to=2026-08-01');
check('from after to is a 400 as well', r.status === 400, String(r.status));

r = await call('/api/admin/reports/product-sales?from=2026-09-01&to=2026-08-01');
check('and product-sales says the same', r.status === 400, String(r.status));

r = await call('/api/admin/reports/unsold-products?from=2026-09-01&to=2026-08-01');
check('and unsold-products says the same', r.status === 400, String(r.status));

r = await call('/api/admin/reports/revenue?from=nao-e-uma-data');
check('a date that is not a date is a 400', r.status === 400, String(r.status));

r = await call('/api/admin/reports/revenue?granularity=day');
check('a granularity outside the enum is refused before it leaves',
  r.status === 400, `${r.status} ${JSON.stringify(r.body)}`);

r = await call('/api/admin/reports/product-sales?page=0');
check('page 0 is refused', r.status === 400, String(r.status));

r = await call('/api/admin/reports/product-sales?page=abc');
check('a page that is not a number is refused', r.status === 400, String(r.status));

r = await call('/admin/relatorios?from=2026-09-01&to=2026-08-01');
check('the screen renders the refusal instead of an empty report',
  r.status === 200 && r.text.includes('Período recusado'), String(r.status));
check('and it never calls an impossible window "nothing happened"',
  r.text.includes('e não com uma lista vazia'));

console.log('\n== sacolas: a snapshot, counted three ways ==');
as('admin');
const before = (await call('/api/admin/reports/carts')).body;
check('the snapshot carries the three counters',
  Number.isInteger(before.unitCount) && Number.isInteger(before.lineCount) &&
  Number.isInteger(before.cartCount),
  JSON.stringify(before));

const bagTag = randomUUID().slice(0, 8);
const bagPiece = await seedProduct({
  name: `Sacola ${bagTag}`,
  slug: `sacola-${bagTag}`,
  priceCents: 9990,
  status: 'ACTIVE',
  variants: [{ label: 'P', stockQuantity: 10 }, { label: 'G', stockQuantity: 10 }],
});

// Empty the bag first, then read the baseline: the three deltas below are only
// deltas if the starting point is known.
as('customer');
await emptyBag();

as('admin');
const afterEmpty = (await call('/api/admin/reports/carts')).body;

as('customer');
await call('/api/cart/items', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ variantId: bagPiece.variants[0].id, quantity: 2 }),
});
await call('/api/cart/items', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ variantId: bagPiece.variants[1].id, quantity: 1 }),
});

as('admin');
const after = (await call('/api/admin/reports/carts')).body;
check('unitCount counts pieces, so two of one size and one of another is +3',
  after.unitCount === afterEmpty.unitCount + 3,
  `${afterEmpty.unitCount} -> ${after.unitCount}`);
check('lineCount counts lines, so the same two sizes are +2',
  after.lineCount === afterEmpty.lineCount + 2,
  `${afterEmpty.lineCount} -> ${after.lineCount}`);
check('cartCount counts non-empty bags, so a bag that was empty is +1',
  after.cartCount === afterEmpty.cartCount + 1,
  `${afterEmpty.cartCount} -> ${after.cartCount}`);

console.log('\n== receita: continuous buckets, in the instance zone ==');
r = await call('/api/admin/reports/revenue?granularity=week');
check('the response echoes the granularity it used', r.body.granularity === 'week', JSON.stringify(r.body.granularity));
check('and names the zone the buckets were cut in',
  typeof r.body.timeZone === 'string' && r.body.timeZone.length > 0, JSON.stringify(r.body.timeZone));
check('buckets are ascending by periodStart',
  r.body.buckets.every((b, i, all) => i === 0 || all[i - 1].periodStart < b.periodStart));
check('every bucket carries revenue, its two halves and an order count',
  r.body.buckets.every((b) =>
    Number.isInteger(b.revenueCents) && Number.isInteger(b.itemsSubtotalCents) &&
    Number.isInteger(b.shippingCents) && Number.isInteger(b.orderCount)));
check('and the two halves are exactly the whole, as the CHECK constraint promises',
  r.body.buckets.every((b) => b.itemsSubtotalCents + b.shippingCents === b.revenueCents));
check('periodStart is a calendar date, never an instant',
  r.body.buckets.every((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.periodStart)),
  JSON.stringify(r.body.buckets[0]?.periodStart));

// A window with no sales in it, asked for weeks: the series must still be
// there, and every bucket must be a zero rather than a gap.
const quiet = await call('/api/admin/reports/revenue?from=2020-01-06&to=2020-02-03&granularity=week');
// Not an exact bucket count: a bare date is read as midnight UTC and the
// buckets are cut in the instance's zone, so a store west of UTC legitimately
// starts one week earlier. What must hold is that the series is there, that it
// has no holes, and that its holes-that-would-have-been are zeros.
check('an empty month still returns a series rather than nothing',
  quiet.status === 200 && quiet.body.buckets.length >= 4,
  `${quiet.status} ${String(quiet.body.buckets?.length)}`);
check('the weeks are continuous — exactly seven days apart, never a gap',
  quiet.body.buckets.every((b, i, all) =>
    i === 0 ||
    Date.parse(b.periodStart) - Date.parse(all[i - 1].periodStart) === 7 * 86400000));
check('and every one of them is a zero, not a missing bucket',
  quiet.body.buckets.every((b) => b.revenueCents === 0 && b.orderCount === 0));

console.log('\n== a sale, and the two lists it moves between ==');
// Seeded ACTIVE with stock and no sale: it belongs in "parada" from birth.
const idleTag = randomUUID().slice(0, 8);
const idle = await seedProduct({
  name: `Parada ${idleTag}`,
  slug: `parada-${idleTag}`,
  priceCents: 24990,
  status: 'ACTIVE',
  variants: [{ label: 'M', stockQuantity: 7 }],
});

as('admin');
r = await call('/api/admin/reports/unsold-products?perPage=100');
check('a piece that never sold is listed as parada',
  r.body.items.some((row) => row.productId === idle.id), idle.slug);
check('and its last sale is null, which is not the same as having stopped',
  r.body.items.find((row) => row.productId === idle.id)?.lastSoldAt === null);

const sale = await sell({ priceCents: 15990, quantity: 2 });

r = await call('/api/admin/reports/product-sales?perPage=100');
const sold = r.body.items.find((row) => row.productId === sale.product.id);
check('the paid order shows up in peças vendidas', Boolean(sold), sale.product.slug);
check('unitsSold counts pieces: two of one size is 2', sold?.unitsSold === 2, String(sold?.unitsSold));
check('itemsRevenueCents is the goods at the frozen price, with no freight in it',
  sold?.itemsRevenueCents === 15990 * 2, String(sold?.itemsRevenueCents));
check('orderCount is the distinct orders that included it', sold?.orderCount === 1, String(sold?.orderCount));

r = await call('/api/admin/reports/unsold-products?perPage=100');
check('and the piece that just sold is NOT in paradas — the two lists are complements',
  !r.body.items.some((row) => row.productId === sale.product.id));

// A CREATED order is stock off the shelf and no money in: not a sale.
as('customer');
await emptyBag();
const pendingTag = randomUUID().slice(0, 8);
const pending = await seedProduct({
  name: `Pendente ${pendingTag}`,
  slug: `pendente-${pendingTag}`,
  priceCents: 11990,
  status: 'ACTIVE',
  variants: [{ label: 'M', stockQuantity: 9 }],
});
await call('/api/cart/items', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ variantId: pending.variants[0].id, quantity: 1 }),
});
const pendingQuote = await call('/api/shipping/quote', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ postalCode: CEP }),
});
await call('/api/orders', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    shippingAddress: { line1: 'Rua das Palmeiras, 214', city: 'São Paulo', state: 'SP', postalCode: CEP },
    shippingOptionCode: pendingQuote.body.options[0].code,
    quotedShippingCents: pendingQuote.body.options[0].priceCents,
  }),
});

as('admin');
r = await call('/api/admin/reports/product-sales?perPage=100');
check('an order left in CREATED is not revenue and not a sale',
  !r.body.items.some((row) => row.productId === pending.id), pending.slug);

console.log('\n== paging, on two tables that share one URL ==');
r = await call('/api/admin/reports/product-sales?page=1&perPage=1');
check('product-sales echoes the page it served',
  r.body.page === 1 && r.body.perPage === 1 && r.body.items.length <= 1,
  JSON.stringify({ p: r.body.page, pp: r.body.perPage, n: r.body.items.length }));
check('and total counts matching pieces, not the page',
  r.body.total >= r.body.items.length, `${String(r.body.total)} vs ${String(r.body.items.length)}`);

r = await call('/api/admin/reports/unsold-products?page=1&perPage=1');
check('unsold-products pages the same way',
  r.body.page === 1 && r.body.perPage === 1 && r.body.items.length <= 1,
  JSON.stringify({ p: r.body.page, pp: r.body.perPage }));

console.log('\n== the screen ==');
r = await call('/admin/relatorios');
check('the reports screen renders', r.status === 200 && r.text.includes('Relatórios'), String(r.status));
check('the rail links to it from Vendas', r.text.includes('/admin/relatorios'));
check('the four sections the artboard names are all there',
  r.text.includes('Sacolas abertas agora') && r.text.includes('Receita no tempo') &&
  r.text.includes('Mais vendidas') && r.text.includes('Peças paradas'));
check('the three period segments are drawn',
  r.text.includes('30 dias') && r.text.includes('12 semanas') && r.text.includes('12 meses'));
check('and the note saying what the period scopes',
  r.text.includes('O período vale para as três seções'));
check('the window is shown with the zone it was cut in, not the reader’s',
  r.text.includes('fuso '));
check('the chart is inline SVG with no library behind it',
  r.text.includes('<svg') && r.text.includes('Receita paga por'));
check('the window total the API does not send is stated, never summed',
  r.text.includes('não a soma da janela'));
check('the sale is on the screen', r.text.includes(sale.product.name), sale.product.name);
check('and the piece that never sold reads as never, not as a dash',
  r.text.includes('Nunca vendeu'));

r = await call('/admin/relatorios?periodo=12s');
check('a period preset travels in the query string', r.status === 200, String(r.status));
check('and the header names the window it actually got',
  r.text.includes('Últimas 12 semanas'), 'header did not name the preset');

r = await call('/admin/relatorios?periodo=nao-existe');
check('an unknown preset falls back to 30 days rather than erroring',
  r.status === 200 && r.text.includes('Últimos 30 dias'), String(r.status));

r = await call('/admin/relatorios?granularity=trimestre');
check('an unreadable granularity falls back rather than erroring',
  r.status === 200, String(r.status));

r = await call('/admin/relatorios?from=2020-01-06&to=2020-02-03&granularity=week');
check('a quiet period reads as an honest zero, not as a broken screen',
  r.status === 200 && r.text.includes('Nenhuma venda no período'), String(r.status));
check('the zero caption counts the periods it measured',
  r.text.includes('desenhada sobre o zero'));
check('and the two lists say what is empty rather than showing a dash',
  r.text.includes('Nenhuma peça vendida'));
check('a window given by date carries no preset name in the header',
  !r.text.includes('Últimos 30 dias ·'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
