// The two order screens: listing, detail, the buyer field, and the five
// lifecycle transitions. Self-seeding against the DISPOSABLE e2e schema.
import { randomUUID } from 'node:crypto';

import { as, call, ensureSignedIn } from './drive.mjs';
import { ADMIN, CUSTOMER, PASSWORD, seedProduct } from './fixture.mjs';

// Built from char codes: the literal keeps getting mangled passing through
// shells, and a check that silently stops checking is worse than no check.
const BCRYPT = `${String.fromCharCode(36)}2b${String.fromCharCode(36)}`;

const CEP = '05422-010';

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

await ensureSignedIn('admin', ADMIN, PASSWORD);
await ensureSignedIn('customer', CUSTOMER, PASSWORD);

/** Buys one unit of a fresh product and returns the resulting order. */
async function placeOrder() {
  const tag = randomUUID().slice(0, 8);
  const product = await seedProduct({
    name: `Pedido ${tag}`,
    slug: `pedido-${tag}`,
    priceCents: 12990,
    status: 'ACTIVE',
    variants: [{ label: 'M', stockQuantity: 20 }],
  });

  as('customer');

  // Earlier suites archive products, and a sacola holding a line whose product
  // is no longer ACTIVE makes checkout a 409. Start from an empty one.
  const existing = await call('/api/cart');
  for (const line of existing.body?.items ?? []) {
    await call(`/api/cart/items/${line.variantId}`, { method: 'DELETE' });
  }

  await call('/api/cart/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ variantId: product.variants[0].id, quantity: 1 }),
  });

  // The SAME postcode the order ships to. The server re-quotes from the
  // address and refuses a mismatch — quoting one CEP and checking out to
  // another is a 409, and correctly so.
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
        line2: 'apto 52',
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
  return order.body;
}

function transition(id, verb, body) {
  return call(`/api/admin/orders/${id}/${verb}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

console.log('\n== the buyer, which #24 unblocked ==');
const order = await placeOrder();
let r = await transition(order.id, 'mark-paid');
check('operator marks it paid', r.status === 200 && r.body.status === 'PAID',
  `${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
check('the response names the buyer',
  r.body.buyer?.email === CUSTOMER && r.body.buyer?.name === 'Marina Duarte',
  JSON.stringify(r.body.buyer));

// That the API withholds `buyer` from a plain customer is proven upstream, in
// commerce-core's own suites — the storefront has no GET /api/orders to ask
// through. What belongs here is the frontend claim: the customer's own order
// page carries no buyer identity block.
as('customer');
const ownPage = await call('/minha-conta/pedidos');
check('the customer sees their own orders', ownPage.status === 200, String(ownPage.status));
check('and that page has no buyer block and no hash',
  !ownPage.text.includes('Cliente') && !ownPage.text.includes(BCRYPT));
as('admin');

console.log('\n== the listing ==');
r = await call('/admin/pedidos');
check('orders list renders', r.status === 200 && r.text.includes('Pedidos'), String(r.status));
check('the Cliente column shows a real name', r.text.includes('Marina Duarte'));
check('and the e-mail under it', r.text.includes('cliente@avesso.test'));
check('the status rail is there', r.text.includes('Reembolsado') && r.text.includes('Entregue'));
check('no password hash anywhere on the page', !r.text.includes(BCRYPT));

r = await call('/admin/pedidos?status=PAID');
check('filtering by status renders', r.status === 200, String(r.status));
check('and marks the active chip', r.text.includes('aria-current="page"'));

r = await call('/admin/pedidos?status=NONSENSE');
check('an unknown status falls back to all rather than erroring', r.status === 200, String(r.status));

console.log('\n== the detail ==');
r = await call(`/admin/pedidos/${order.id}`);
check('detail renders', r.status === 200, String(r.status));
check('customer card carries name and e-mail',
  r.text.includes('Marina Duarte') && r.text.includes('cliente@avesso.test'));
check('the lifecycle shows Criado and Pago', r.text.includes('Criado') && r.text.includes('Pago'));
check('the webhook note is present', r.text.includes('webhook, não o retorno do navegador'));
check('a PAID order offers ship and refund, not mark-paid',
  r.text.includes('Marcar como enviado') && r.text.includes('Reembolsar') &&
  !r.text.includes('Marcar como pago'));

console.log('\n== the five transitions ==');
r = await transition(order.id, 'mark-paid');
check('marking an already-paid order is a 409 with copy',
  r.status === 409 && typeof r.body.error === 'string', `${r.status} ${JSON.stringify(r.body)}`);

r = await transition(order.id, 'deliver');
check('delivering before shipping is refused', r.status === 409, String(r.status));

r = await transition(order.id, 'ship', {
  trackingCode: 'BR123456789BR',
  trackingUrl: 'https://rastreio.example/BR123456789BR',
});
check('ship stamps the tracking it was given',
  r.status === 200 && r.body.status === 'SHIPPED' && r.body.trackingCode === 'BR123456789BR',
  `${r.status} ${JSON.stringify(r.body).slice(0, 140)}`);
check('and still names the buyer', r.body.buyer?.email === CUSTOMER);

r = await transition(order.id, 'deliver');
check('deliver moves it to DELIVERED', r.status === 200 && r.body.status === 'DELIVERED', String(r.status));

r = await call(`/admin/pedidos/${order.id}`);
check('a DELIVERED order offers no transitions',
  r.status === 200 && r.text.includes('Sem transições disponíveis'), String(r.status));

console.log('\n== ship with no tracking, which is a real shipment ==');
const second = await placeOrder();
await transition(second.id, 'mark-paid');
r = await transition(second.id, 'ship', { trackingCode: '', trackingUrl: '' });
check('an empty code is absent, not an empty string',
  r.status === 200 && r.body.trackingCode === null && r.body.trackingUrl === null,
  `${r.status} ${JSON.stringify({ c: r.body.trackingCode, u: r.body.trackingUrl })}`);

console.log('\n== cancel and refund ==');
const third = await placeOrder();
r = await transition(third.id, 'cancel');
check('a CREATED order cancels', r.status === 200 && r.body.status === 'CANCELLED', String(r.status));
r = await transition(third.id, 'refund');
check('refunding a cancelled order is refused', r.status === 409, String(r.status));

const fourth = await placeOrder();
await transition(fourth.id, 'mark-paid');
r = await transition(fourth.id, 'refund');
// Marked paid by hand, so there is no provider payment to reverse — the API
// says so rather than asking Stripe to return money it never took.
check('refunding a hand-marked payment is refused with a reason',
  r.status === 409, `${r.status} ${JSON.stringify(r.body)}`);

console.log('\n== the boundary ==');
as('customer');
r = await call(`/api/admin/orders/${order.id}/cancel`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
});
check('a customer cannot drive a transition through the panel route', r.status === 403, String(r.status));
r = await call('/admin/pedidos');
check('and does not get the orders screen',
  r.status === 200 && r.text.includes('Esta conta não abre o painel'), String(r.status));

as('anon');
r = await call(`/admin/pedidos/${order.id}`);
check('anonymous is sent to sign in', r.status === 307, String(r.status));

as('admin');
r = await call(`/admin/pedidos/${randomUUID()}`);
check('an unknown order is 404, and never says "acesso negado"',
  r.status === 404 && !r.text.includes('acesso negado'), String(r.status));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
