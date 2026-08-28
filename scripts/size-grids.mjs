/**
 * Gives the AVESSO catalogue real size grids.
 *
 * The twelve pieces in the shop each carry a single variant labelled `Único`,
 * created by the migration that introduced variants (commerce-core#19). That
 * is the divergence the whole variant-management effort existed to close: the
 * storefront's size selector has nothing to select, so it hides itself, and
 * the store sells clothing without sizes.
 *
 * ## Nothing here is destructive
 *
 * The obvious approach — add P/M/G/GG/XGG, delete `Único` — can refuse, and
 * for a good reason: a size somebody bought can never be deleted, because
 * order items reference it forever. This does the safe thing instead:
 *
 *   1. RENAME `Único` to the first size of the grid.
 *   2. ADD the remaining sizes.
 *   3. SET stock on each.
 *
 * Renaming is safe by construction. `OrderItem.variantLabel` is a snapshot
 * taken at purchase, so an order that bought `Único` still says `Único`
 * forever — the history is not rewritten, and no DELETE is ever attempted.
 *
 * ## Running it
 *
 *   node scripts/size-grids.mjs                 # dry run, prints the plan
 *   ADMIN_TOKEN=... node scripts/size-grids.mjs --apply
 *
 * The token is read from the environment and never printed. Get one with a
 * POST to /auth/login as an account holding products.update, and remember it
 * expires in fifteen minutes — this script is fast enough that one is plenty.
 */

const API_URL = process.env.API_URL ?? 'https://commerce-core-kvlg.onrender.com';
const TOKEN = process.env.ADMIN_TOKEN;
const APPLY = process.argv.includes('--apply');

/**
 * The grids, by piece.
 *
 * Two pieces keep `Único` on purpose. A cap is one size, and saying so is more
 * honest than inventing a grid for it — which means the rust "Sem grade de
 * tamanho" flag in the product list is a FALSE POSITIVE for accessories, and
 * that is worth knowing before someone tries to "fix" it.
 *
 * Trousers get numeric sizes because that is how trousers are sold here, and
 * socks get ranges. Neither is a guess the code should be making on its own —
 * change the table, not the logic.
 */
const GRIDS = {
  'Camiseta Pesada Preta': ['P', 'M', 'G', 'GG', 'XGG'],
  'Camiseta Pesada Off-White': ['P', 'M', 'G', 'GG', 'XGG'],
  'Camiseta Pesada Areia': ['P', 'M', 'G', 'GG', 'XGG'],
  'Camiseta Manga Longa Off-White': ['P', 'M', 'G', 'GG', 'XGG'],
  'Camiseta Listrada Marinho': ['P', 'M', 'G', 'GG', 'XGG'],
  'Moletom Careca Cinza Mescla': ['P', 'M', 'G', 'GG'],
  'Moletom Careca Preto': ['P', 'M', 'G', 'GG'],
  'Calça Cargo Bege': ['38', '40', '42', '44'],
  'Calça Alfaiataria Preta': ['38', '40', '42', '44'],
  'Jaqueta Corta-Vento Preta': ['P', 'M', 'G', 'GG'],
  'Meia Canelada — kit com 3': ['39–42', '43–46'],
  'Boné Aba Curva Preto': null,
};

/**
 * Splits a total across a grid, weighted towards the middle.
 *
 * The TOTAL is preserved exactly, which is the point: the design's scarcity
 * states are real stock levels (§5 — two pieces at "últimas N", one at
 * "esgotado"), and a redistribution that changed the totals would quietly
 * rewrite what the storefront says about them.
 *
 * A total too small to spread — the jacket's 3, the sand tee's 2 — lands on
 * the middle sizes rather than being smeared into a grid of ones and zeroes,
 * because that is what a nearly sold-out run actually looks like.
 */
function spread(total, count) {
  if (total === 0) {
    return Array.from({ length: count }, () => 0);
  }

  // Middle-heavy weights: 1, 2, 3, 2, 1 for five; 1, 2, 2, 1 for four.
  const weights = Array.from({ length: count }, (_, i) => {
    const distance = Math.abs(i - (count - 1) / 2);
    return Math.max(1, Math.round((count / 2 - distance) * 2));
  });

  const sum = weights.reduce((a, b) => a + b, 0);
  const out = weights.map((w) => Math.floor((total * w) / sum));

  // Whatever rounding dropped goes to the middle size, so the total is exact.
  let remainder = total - out.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => [w, i])
    .sort((a, b) => b[0] - a[0])
    .map(([, i]) => i);

  for (let i = 0; remainder > 0; i = (i + 1) % order.length, remainder--) {
    out[order[i]] += 1;
  }

  return out;
}

async function api(path, init = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }

  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  }

  return body;
}

console.log(`${APPLY ? 'APPLYING to' : 'Dry run against'} ${API_URL}\n`);

if (APPLY && !TOKEN) {
  console.error('ADMIN_TOKEN is not set. Refusing to run --apply without one.');
  process.exit(1);
}

const catalogue = await api('/products?perPage=100');
let changed = 0;
let skipped = 0;

for (const product of catalogue.items) {
  const grid = GRIDS[product.name];

  if (grid === undefined) {
    console.log(`?  ${product.name} — not in the table, left alone`);
    skipped++;
    continue;
  }

  if (grid === null) {
    console.log(`—  ${product.name} — one size on purpose, left alone`);
    skipped++;
    continue;
  }

  const current = product.variants;

  if (current.length > 1) {
    console.log(`✓  ${product.name} — already has ${String(current.length)} sizes, left alone`);
    skipped++;
    continue;
  }

  const only = current[0];
  const total = only.stockQuantity;
  const stock = spread(total, grid.length);

  console.log(
    `→  ${product.name}\n     ${only.label} (${String(total)}) becomes ` +
      grid.map((label, i) => `${label}:${String(stock[i])}`).join(' '),
  );

  if (!APPLY) {
    changed++;
    continue;
  }

  // 1. Rename, never delete. The order history is a snapshot and stays intact.
  let updated = await api(`/products/${product.id}/variants/${only.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label: grid[0] }),
  });

  // 2. Add the rest, in display order — `position` follows the order they are
  //    created in, which is why this loop is not parallel.
  for (const label of grid.slice(1)) {
    updated = await api(`/products/${product.id}/variants`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    });
  }

  // 3. Stock, per size, absolute.
  for (const [index, label] of grid.entries()) {
    const variant = updated.variants.find((v) => v.label === label);

    if (!variant) {
      throw new Error(`${product.name}: ${label} went missing after creation`);
    }

    updated = await api(
      `/products/${product.id}/variants/${variant.id}/stock`,
      { method: 'PATCH', body: JSON.stringify({ quantity: stock[index] }) },
    );
  }

  const finalTotal = updated.stockQuantity;

  if (finalTotal !== total) {
    console.log(
      `   !! total moved from ${String(total)} to ${String(finalTotal)} — check this piece`,
    );
  }

  changed++;
}

console.log(
  `\n${APPLY ? 'Changed' : 'Would change'} ${String(changed)}, left alone ${String(skipped)}.`,
);

if (!APPLY) {
  console.log('Re-run with --apply and ADMIN_TOKEN set to do it.');
}
