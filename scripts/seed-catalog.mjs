/**
 * Seeds the AVESSO catalogue into a commerce-core instance.
 *
 * The twelve pieces and four categories come from docs/design-system.md §5,
 * which is the visual contract. This lives here rather than in commerce-core's
 * prisma/demo-catalog.ts on purpose: that file is deliberately store-neutral
 * sample data in a shared repository, and the AVESSO catalogue is this store's
 * own data. Putting it upstream is the first step towards the template forking.
 *
 * Idempotent by slug and, within a product, by variant label. Run it as often
 * as you like — in particular after commerce-core's e2e suite, which TRUNCATEs
 * the catalogue.
 *
 * One thing it cannot do: give real sizes to a product that already carries a
 * variant this file did not ask for. There is no route to remove a variant, on
 * purpose, so it says which products are stuck and leaves them alone.
 *
 *   API_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-catalog.mjs
 *
 * Add --dry-run to print the plan and write nothing.
 */

const API_URL = process.env.API_URL ?? 'https://commerce-core-kvlg.onrender.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DRY_RUN = process.argv.includes('--dry-run');

const CATEGORIES = [
  { slug: 'camisetas', name: 'Camisetas', description: 'Malha pesada, modelagem reta e unissex.' },
  { slug: 'moletons', name: 'Moletons', description: 'Moletom felpado, gola careca.' },
  { slug: 'calcas', name: 'Calças', description: 'Calças e peças de sobreposição.' },
  { slug: 'acessorios', name: 'Acessórios', description: 'O que completa a peça.' },
];

/**
 * The size run each piece is cut in.
 *
 * A cap and a kit of socks come in one size, and saying so here is a fact
 * about those two products rather than a rule about accessories — the
 * storefront deliberately holds no such rule, and derives everything it shows
 * from the variants the API hands back.
 */
const CLOTHING_SIZES = ['P', 'M', 'G', 'GG', 'XGG'];
const ONE_SIZE = ['Único'];

/**
 * Splits a piece's stock across its sizes, as evenly as the number divides,
 * with the remainder going to the middle of the run first — the sizes a store
 * actually holds most of.
 *
 * The design states one number per piece (§5) and says nothing about the
 * curve, so this is the flattest reading of it that still adds up: `Camiseta
 * Pesada Areia` at 2 becomes one M and one G, its other three sizes struck
 * through, and its badge stays "Últimas 2 unidades" because
 * `ProductResponse.stockQuantity` is the sum. `Camiseta Listrada Marinho` at 0
 * is zero in every size, which is what "esgotado" means.
 */
function spreadStock(total, count) {
  const base = Math.floor(total / count);
  const shares = Array.from({ length: count }, () => base);

  // Middle outwards: 2, 1, 3, 0, 4 for a run of five.
  const middle = Math.floor((count - 1) / 2);
  const order = [];
  for (let step = 0; order.length < count; step += 1) {
    if (middle - step >= 0 && step > 0) order.push(middle - step);
    else if (step === 0) order.push(middle);
    if (middle + step < count && step > 0) order.push(middle + step);
  }

  let remainder = total % count;
  for (const index of order) {
    if (remainder <= 0) break;
    shares[index] += 1;
    remainder -= 1;
  }

  return shares;
}

/**
 * priceCents is integer cents, always — the design's R$ 149,90 is 14990.
 *
 * weightGrams is NOT in the design. The only weight it states is "310 g no
 * tamanho M", for a t-shirt. Every other value here is an estimate, and it is
 * load-bearing: freight is priced from it, and a product without one quotes at
 * the configured default (500 g) with the store paying the difference whenever
 * the guess is low. Correct these against real pieces before the store takes
 * money.
 *
 * Jaqueta Corta-Vento sits in Calças deliberately — see docs/design-system.md §8.
 */
const PRODUCTS = [
  {
    slug: 'camiseta-pesada-preta',
    name: 'Camiseta Pesada Preta',
    priceCents: 14990,
    stock: 24,
    sizes: CLOTHING_SIZES,
    weightGrams: 310,
    categories: ['camisetas'],
    description:
      'Malha 100% algodão penteado, 240 g/m². Gola em ribana dupla, costura reforçada nos ombros. Modelagem reta e unissex, caimento solto no corpo.',
  },
  {
    slug: 'camiseta-pesada-off-white',
    name: 'Camiseta Pesada Off-White',
    priceCents: 14990,
    stock: 24,
    sizes: CLOTHING_SIZES,
    weightGrams: 310,
    categories: ['camisetas'],
    description:
      'A mesma malha de 240 g/m² da preta, em off-white cru. Gola em ribana dupla e costura reforçada nos ombros.',
  },
  {
    slug: 'camiseta-pesada-areia',
    name: 'Camiseta Pesada Areia',
    priceCents: 14990,
    stock: 2,
    sizes: CLOTHING_SIZES,
    weightGrams: 310,
    categories: ['camisetas'],
    description:
      'Malha 100% algodão penteado, 240 g/m². Gola em ribana dupla, costura reforçada nos ombros. Modelagem reta e unissex, caimento solto no corpo.',
  },
  {
    slug: 'camiseta-manga-longa-off-white',
    name: 'Camiseta Manga Longa Off-White',
    priceCents: 18990,
    stock: 18,
    sizes: CLOTHING_SIZES,
    weightGrams: 380,
    categories: ['camisetas'],
    description:
      'Manga longa na malha de 240 g/m², com punho em ribana. Mesma modelagem reta das demais camisetas.',
  },
  {
    slug: 'camiseta-listrada-marinho',
    name: 'Camiseta Listrada Marinho',
    priceCents: 16990,
    stock: 0,
    sizes: CLOTHING_SIZES,
    weightGrams: 310,
    categories: ['camisetas'],
    description:
      'Listras marinho e cru tingidas em fio, não estampadas — a listra não descasca com a lavagem.',
  },
  {
    slug: 'moletom-careca-cinza-mescla',
    name: 'Moletom Careca Cinza Mescla',
    priceCents: 32990,
    stock: 15,
    sizes: CLOTHING_SIZES,
    weightGrams: 700,
    categories: ['moletons'],
    description:
      'Moletom felpado por dentro, gola careca com ribana canelada. Punho e barra na mesma ribana.',
  },
  {
    slug: 'moletom-careca-preto',
    name: 'Moletom Careca Preto',
    priceCents: 32990,
    stock: 15,
    sizes: CLOTHING_SIZES,
    weightGrams: 700,
    categories: ['moletons'],
    description:
      'O mesmo moletom felpado do cinza mescla, em preto. Gola careca, punho e barra em ribana canelada.',
  },
  {
    slug: 'calca-cargo-bege',
    name: 'Calça Cargo Bege',
    priceCents: 28990,
    stock: 12,
    sizes: CLOTHING_SIZES,
    weightGrams: 620,
    categories: ['calcas'],
    description:
      'Sarja de algodão com bolsos laterais chapados. Cós com passantes largos e modelagem reta.',
  },
  {
    slug: 'calca-alfaiataria-preta',
    name: 'Calça Alfaiataria Preta',
    priceCents: 34990,
    stock: 12,
    sizes: CLOTHING_SIZES,
    weightGrams: 520,
    categories: ['calcas'],
    description:
      'Alfaiataria leve, caimento fluido e prega frontal. Cós com fechamento interno.',
  },
  {
    slug: 'jaqueta-corta-vento-preta',
    name: 'Jaqueta Corta-Vento Preta',
    priceCents: 39990,
    stock: 3,
    sizes: CLOTHING_SIZES,
    weightGrams: 400,
    categories: ['calcas'],
    description:
      'Nylon leve com forro em malha, zíper frontal e capuz embutido na gola.',
  },
  {
    slug: 'bone-aba-curva-preto',
    name: 'Boné Aba Curva Preto',
    priceCents: 11990,
    stock: 30,
    sizes: ONE_SIZE,
    weightGrams: 110,
    categories: ['acessorios'],
    description:
      'Sarja de algodão, seis gomos, aba curva e regulagem em fivela metálica.',
  },
  {
    slug: 'meia-canelada-kit-com-3',
    name: 'Meia Canelada — kit com 3',
    priceCents: 7990,
    stock: 40,
    sizes: ONE_SIZE,
    weightGrams: 180,
    categories: ['acessorios'],
    description:
      'Três pares de meia canelada em algodão, cano médio, punho sem marcar a perna.',
  },
];

async function api(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${await response.text()}`);
  }

  return response.status === 204 ? null : response.json();
}

/** An absolute inventory correction on one size, not a delta. */
function setStock(productId, variantId, quantity, token) {
  return api(`/products/${productId}/variants/${variantId}/stock`, {
    method: 'PATCH',
    token,
    body: { quantity },
  });
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  }

  console.log(`target: ${API_URL}${DRY_RUN ? '  (dry run - nothing will be written)' : ''}`);

  const { accessToken } = await api('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  // Categories first: products reference them by id.
  const existingCategories = await api('/categories');
  const categoryId = new Map(existingCategories.map((c) => [c.slug, c.id]));

  for (const category of CATEGORIES) {
    if (categoryId.has(category.slug)) {
      console.log(`  = category ${category.slug}`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`  + category ${category.slug}`);
      continue;
    }
    const created = await api('/categories', {
      method: 'POST',
      token: accessToken,
      body: category,
    });
    categoryId.set(created.slug, created.id);
    console.log(`  + category ${created.slug}`);
  }

  // status=all requires products.read, which the admin has. Without it the
  // listing hides DRAFT rows, and the script would try to recreate them and
  // collide on the slug with a 409.
  const existing = await api('/products?status=all&perPage=100', { token: accessToken });
  const bySlug = new Map(existing.items.map((p) => [p.slug, p]));

  const blocked = [];

  for (const product of PRODUCTS) {
    // Stock belongs to the variant now, never to the product: commerce-core
    // #19 removed `stockQuantity` from both product DTOs, and
    // `ProductResponse.stockQuantity` is the sum across sizes computed on read.
    const shares = spreadStock(product.stock, product.sizes.length);
    const variants = product.sizes.map((label, position) => ({
      label,
      position,
      stockQuantity: shares[position],
    }));

    const payload = {
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      // The design uses solid colour blocks until real photos exist, and the
      // API hosts no images — imageUrls stays empty rather than pointing at
      // something that does not load.
      imageUrls: [],
      // Products are born DRAFT and stay off the storefront until ACTIVE.
      status: 'ACTIVE',
      weightGrams: product.weightGrams,
      categoryIds: product.categories
        .map((slug) => categoryId.get(slug))
        .filter(Boolean),
    };

    const found = bySlug.get(product.slug);
    const run = variants.map((v) => `${v.label}:${v.stockQuantity}`).join(' ');

    if (DRY_RUN) {
      console.log(`  ${found ? '~' : '+'} ${product.slug}  ${run}`);
      continue;
    }

    if (!found) {
      await api('/products', {
        method: 'POST',
        token: accessToken,
        body: { ...payload, slug: product.slug, variants },
      });
      console.log(`  + ${product.slug}  ${run}`);
      continue;
    }

    // UpdateProductDto carries neither variants nor stock, so the product's
    // own fields and its sizes are two separate reconciliations.
    await api(`/products/${found.id}`, {
      method: 'PATCH',
      token: accessToken,
      body: payload,
    });

    const wanted = new Set(product.sizes);
    const extra = found.variants.filter((v) => !wanted.has(v.label));

    if (extra.length > 0) {
      // A variant this seed did not ask for, and there is no route to remove
      // it: `POST /products/{id}/variants` only adds, and commerce-core leaves
      // removal out on purpose because it has to decide what happens to a size
      // somebody already bought. Adding P/M/G/GG/XGG next to a leftover
      // `Único` would put a nonsense row on the PDP, so this leaves the sizes
      // alone and keeps the piece's total stock honest on the variants that
      // are actually there.
      const fallback = spreadStock(product.stock, found.variants.length);

      for (const [index, variant] of found.variants.entries()) {
        if (variant.stockQuantity !== fallback[index]) {
          await setStock(found.id, variant.id, fallback[index], accessToken);
        }
      }

      blocked.push(`${product.slug} (tem ${extra.map((v) => v.label).join(', ')})`);
      console.log(
        `  ~ ${product.slug}  mantido em ${found.variants.map((v) => v.label).join('/')}`,
      );
      continue;
    }

    const present = new Map(found.variants.map((v) => [v.label, v]));

    for (const variant of variants) {
      const current = present.get(variant.label);

      if (!current) {
        await api(`/products/${found.id}/variants`, {
          method: 'POST',
          token: accessToken,
          body: variant,
        });
        continue;
      }

      if (current.stockQuantity !== variant.stockQuantity) {
        await setStock(found.id, current.id, variant.stockQuantity, accessToken);
      }
    }

    console.log(`  ~ ${product.slug}  ${run}`);
  }

  if (DRY_RUN) return;

  if (blocked.length > 0) {
    console.log(
      '\ntamanhos NAO aplicados, variante nao pedida e nao removivel:',
    );
    for (const line of blocked) console.log(`  ! ${line}`);
    console.log(
      '  saidas: rota de remocao de variante no commerce-core, ou recriar\n' +
        '  o catalogo do zero. Ver README.md, "Divergencias conhecidas".',
    );
  }

  const active = await api('/products?perPage=100');
  const categories = await api('/categories');

  console.log(`\ndone: ${active.total} active products`);
  for (const category of categories) {
    console.log(`  ${category.name} (${category.productCount})`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
