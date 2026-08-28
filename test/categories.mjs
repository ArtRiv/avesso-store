// The categories screen: listing with piece counts, create, rename, delete —
// and the guarantee the delete copy makes, that the pieces survive.
import { randomUUID } from 'node:crypto';

import { as, call, ensureSignedIn } from './drive.mjs';
import { ADMIN, CUSTOMER, PASSWORD, seedProduct } from './fixture.mjs';

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

await ensureSignedIn('admin', ADMIN, PASSWORD);
await ensureSignedIn('customer', CUSTOMER, PASSWORD);
as('admin');

const tag = randomUUID().slice(0, 8);

console.log('\n== create ==');
let r = await call('/api/admin/categories', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: `Camisas ${tag}` }),
});
check('a category is created, 201', r.status === 201, `${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
const created = r.body;
check('the slug is generated from the name when left empty',
  typeof created.slug === 'string' && created.slug.startsWith('camisas'), created.slug);

r = await call('/api/admin/categories', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Outra', slug: created.slug }),
});
check('asking for a slug that is taken is a 409, not a silent rename',
  r.status === 409, `${r.status} ${JSON.stringify(r.body)}`);

r = await call('/api/admin/categories', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: '   ' }),
});
check('a blank name is refused here, before it leaves', r.status === 400, String(r.status));

console.log('\n== the count, which is not on the category ==');
// Two pieces in the new category, one of them a DRAFT: the operator's count
// has to include what the storefront cannot see.
const active = await seedProduct({
  name: `Camisa A ${tag}`, slug: `camisa-a-${tag}`, priceCents: 19990,
  status: 'ACTIVE', categoryIds: [created.id],
});
const draft = await seedProduct({
  name: `Camisa B ${tag}`, slug: `camisa-b-${tag}`, priceCents: 21990,
  status: 'DRAFT', categoryIds: [created.id],
});
check('both pieces were attached',
  active.categories?.[0]?.id === created.id && draft.categories?.[0]?.id === created.id);

r = await call('/admin/categorias');
check('categories screen renders', r.status === 200, String(r.status));
check('the new category is listed', r.text.includes(`Camisas ${tag}`));
check('and its count includes the draft — it says 2, not 1',
  r.text.includes('>2</td>') || /2<\/td>/.test(r.text),
  'count cell not found as 2');
check('the delete note is on the form',
  r.text.includes('Apagar uma categoria solta as peças dela'));

console.log('\n== rename ==');
r = await call(`/api/admin/categories/${created.id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: `Camisaria ${tag}`, slug: `camisaria-${tag}` }),
});
check('rename changes name and slug',
  r.status === 200 && r.body.name === `Camisaria ${tag}` && r.body.slug === `camisaria-${tag}`,
  `${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);

r = await call(`/api/admin/categories/${created.id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: '  ' }),
});
check('a blank rename is refused', r.status === 400, String(r.status));

console.log('\n== delete, and the promise it makes ==');
r = await call(`/api/admin/categories/${created.id}`, { method: 'DELETE' });
check('delete answers 204 with no body', r.status === 204, String(r.status));

r = await call('/admin/categorias');
check('the category is gone from the screen', !r.text.includes(`Camisaria ${tag}`));

// The whole point of the copy: the pieces survive, they just lose the link.
const stillActive = await call(`/api/admin/products/${active.id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}',
});
const stillDraft = await call(`/api/admin/products/${draft.id}`, {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}',
});
check('the ACTIVE piece still exists', stillActive.status === 200 && stillActive.body.id === active.id);
check('the DRAFT piece still exists', stillDraft.status === 200 && stillDraft.body.id === draft.id);
check('and both lost only the association',
  stillActive.body.categories.length === 0 && stillDraft.body.categories.length === 0,
  JSON.stringify({ a: stillActive.body.categories, d: stillDraft.body.categories }));

r = await call(`/api/admin/categories/${created.id}`, { method: 'DELETE' });
check('deleting it twice is a 404, not a crash', r.status === 404, String(r.status));

console.log('\n== the boundary ==');
as('customer');
r = await call('/api/admin/categories', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Invadida' }),
});
check('a customer cannot create a category', r.status === 403, String(r.status));
r = await call('/admin/categorias');
check('and does not get the screen',
  r.status === 200 && r.text.includes('Esta conta não abre o painel'), String(r.status));

as('anon');
r = await call('/admin/categorias');
check('anonymous is sent to sign in', r.status === 307, String(r.status));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
