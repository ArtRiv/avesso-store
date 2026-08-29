// The panel: authorization boundary, rendering, and the four non-destructive
// size operations. Self-seeding, so it is repeatable.
import { as, call, ensureSignedIn } from './drive.mjs';
import { ADMIN, CUSTOMER, PASSWORD, seedCatalogue } from './fixture.mjs';

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

const { sized } = await seedCatalogue('Camiseta');
const PRODUCT = sized.id;

console.log('\n== authorization boundary ==');
as('anon');
let r = await call('/admin/produtos');
check('anonymous /admin/produtos redirects to sign-in',
  r.status === 307 && (r.location ?? '').startsWith('/entrar'), `${r.status} ${r.location}`);

r = await call(`/api/admin/products/${PRODUCT}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x' }),
});
check('anonymous PATCH product is 401', r.status === 401, String(r.status));

await ensureSignedIn('customer', CUSTOMER, PASSWORD);
r = await call('/admin/produtos');
check('customer sees the refusal, not the catalogue',
  r.status === 200 && r.text.includes('Esta conta não abre o painel'), String(r.status));

r = await call(`/api/admin/products/${PRODUCT}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x' }),
});
check('customer PATCH product is 403 (a hidden button is not the gate)', r.status === 403, String(r.status));

r = await call(`/api/admin/products/${PRODUCT}/variants`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'XS' }),
});
check('customer POST variant is 403', r.status === 403, String(r.status));

r = await call(`/api/admin/products/${PRODUCT}/variants/${sized.variants[0].id}`, { method: 'DELETE' });
check('customer DELETE variant is 403', r.status === 403, String(r.status));

console.log('\n== operator: the panel renders ==');
await ensureSignedIn('admin', ADMIN, PASSWORD);
r = await call('/admin/produtos');
check('product list renders', r.status === 200 && r.text.includes(sized.name), String(r.status));
check('an unsized product is flagged', r.text.includes('Sem grade de tamanho'));
check('a sold-out size is struck through', r.text.includes('line-through'));

r = await call(`/admin/produtos/${PRODUCT}`);
check('editor renders', r.status === 200 && r.text.includes('Tamanhos'), String(r.status));
check('editor shows every size', ['P', 'M', 'G', 'GG', 'XGG'].every((l) => r.text.includes(`>${l}<`)));

const M = sized.variants.find((v) => v.label === 'M');
const G = sized.variants.find((v) => v.label === 'G');

console.log('\n== rename ==');
r = await call(`/api/admin/products/${PRODUCT}/variants/${M.id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'G' }),
});
check('renaming to a taken label is 409 with copy',
  r.status === 409 && typeof r.body.error === 'string', `${r.status} ${JSON.stringify(r.body)}`);

r = await call(`/api/admin/products/${PRODUCT}/variants/${M.id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'Médio' }),
});
check('rename succeeds and answers with the whole product',
  r.status === 200 && r.body.variants?.some((v) => v.label === 'Médio'), String(r.status));

r = await call(`/api/admin/products/${PRODUCT}/variants/${M.id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: '   ' }),
});
check('a blank label is refused here, before it leaves', r.status === 400, String(r.status));

console.log('\n== reorder ==');
const ids = sized.variants.map((v) => v.id);
const reversed = [...ids].reverse();
r = await call(`/api/admin/products/${PRODUCT}/variants/order`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ variantIds: reversed }),
});
check('the list comes back in the order sent',
  r.status === 200 && r.body.variants.map((v) => v.id).join() === reversed.join(), String(r.status));

r = await call(`/api/admin/products/${PRODUCT}/variants/order`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ variantIds: reversed.slice(0, 2) }),
});
check('a partial list is refused, not partially applied', r.status === 400, String(r.status));

r = await call(`/api/admin/products/${PRODUCT}/variants/order`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ variantIds: ids }),
});
check('order restored', r.status === 200);

console.log('\n== stock ==');
r = await call(`/api/admin/products/${PRODUCT}/variants/${G.id}/stock`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quantity: 3 }),
});
check('stock set to an absolute quantity',
  r.status === 200 && r.body.variants.find((v) => v.id === G.id).stockQuantity === 3, String(r.status));
check('the product total is the sum the server computed',
  r.body.stockQuantity === r.body.variants.reduce((n, v) => n + v.stockQuantity, 0));

r = await call(`/api/admin/products/${PRODUCT}/variants/${G.id}/stock`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quantity: -1 }),
});
check('negative stock is refused', r.status === 400, String(r.status));

console.log('\n== add ==');
r = await call(`/api/admin/products/${PRODUCT}/variants`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'XS' }),
});
const added = r.body.variants?.find((v) => v.label === 'XS');
check('a new size lands at the end, at zero stock',
  r.status === 201 && added && added.stockQuantity === 0 &&
  r.body.variants[r.body.variants.length - 1].label === 'XS', String(r.status));

r = await call(`/api/admin/products/${PRODUCT}/variants`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'XS' }),
});
check('a duplicate label is 409', r.status === 409, String(r.status));

console.log('\n== create ==');
r = await call('/admin/produtos/novo');
check('the create screen renders', r.status === 200 && r.text.includes('Novo produto'), String(r.status));
check('and offers a real size grid by default',
  ['>P<', '>M<', '>G<', '>GG<'].every((s) => r.text.includes(s)));

const madeTag = Math.random().toString(36).slice(2, 8);
r = await call('/api/admin/products', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    name: `Nova ${madeTag}`, priceCents: 9990,
    variants: [{ label: 'P', stockQuantity: 0 }, { label: 'M', stockQuantity: 0 }],
  }),
});
check('a product is created, 201', r.status === 201, `${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
const made = r.body;
check('it is born DRAFT — off the storefront until published',
  made.status === 'DRAFT', made.status);
check('the sizes arrive in the order sent, not alphabetical',
  made.variants.map((v) => v.label).join() === 'P,M', made.variants.map((v) => v.label).join());
check('and every size starts at zero stock, which is a real state',
  made.variants.every((v) => v.stockQuantity === 0));

r = await call('/api/admin/products', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Sem preço' }),
});
check('creating without a price is refused here, before it leaves', r.status === 400, String(r.status));

r = await call('/api/admin/products', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: `Outra ${madeTag}`, priceCents: 9990, slug: made.slug }),
});
check('asking for a slug that is taken is a 409, not a silent rename', r.status === 409, String(r.status));

r = await call('/api/admin/products', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: `Única ${madeTag}`, priceCents: 4990 }),
});
check('omitting sizes gives the API-made `Único`, not an invented grid',
  r.status === 201 && r.body.variants.length === 1 && r.body.variants[0].label === 'Único',
  JSON.stringify(r.body.variants?.map((v) => v.label)));

console.log('\n== images ==');
const A = 'https://cdn.example.com/a.jpg';
const B = 'https://cdn.example.com/b.jpg';

r = await call(`/api/admin/products/${PRODUCT}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ imageUrls: [A, B] }),
});
check('urls are saved in the order sent — the first is the cover',
  r.status === 200 && r.body.imageUrls.join() === [A, B].join(),
  JSON.stringify(r.body.imageUrls));

r = await call(`/admin/produtos/${PRODUCT}`);
check('the editor renders them', r.status === 200 && r.text.includes(A), String(r.status));
check('and marks the first one as the cover', r.text.includes('Capa'));

r = await call(`/api/admin/products/${PRODUCT}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ imageUrls: [B, A] }),
});
check('reordering changes which one is the cover',
  r.status === 200 && r.body.imageUrls[0] === B, JSON.stringify(r.body.imageUrls));

// The half that a `present replaces the whole list` field gets wrong: removing.
r = await call(`/api/admin/products/${PRODUCT}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ imageUrls: [B] }),
});
check('sending a shorter list actually removes the missing one',
  r.status === 200 && r.body.imageUrls.join() === B, JSON.stringify(r.body.imageUrls));

r = await call(`/api/admin/products/${PRODUCT}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ imageUrls: [] }),
});
check('and an empty list clears them all', r.status === 200 && r.body.imageUrls.length === 0,
  JSON.stringify(r.body.imageUrls));

r = await call(`/admin/produtos/${PRODUCT}`);
check('with none, the editor says so rather than showing a broken box',
  r.text.includes('Sem foto'));

console.log('\n== product save ==');
r = await call(`/api/admin/products/${PRODUCT}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ priceCents: 15990, status: 'DRAFT' }),
});
check('price saved as integer cents, and DRAFT reached without a publish route',
  r.status === 200 && r.body.priceCents === 15990 && r.body.status === 'DRAFT', String(r.status));

r = await call(`/api/admin/products/${PRODUCT}`, { method: 'DELETE' });
check('delete archives rather than deletes',
  r.status === 200 && r.body.status === 'ARCHIVED', `${r.status} ${r.body?.status}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
