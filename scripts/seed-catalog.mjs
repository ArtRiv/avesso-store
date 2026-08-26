/**
 * Seeds the AVESSO catalogue into a commerce-core instance.
 *
 * The twelve pieces and four categories come from docs/design-system.md §5,
 * which is the visual contract. This lives here rather than in commerce-core's
 * prisma/demo-catalog.ts on purpose: that file is deliberately store-neutral
 * sample data in a shared repository, and the AVESSO catalogue is this store's
 * own data. Putting it upstream is the first step towards the template forking.
 *
 * Idempotent by slug. Run it as often as you like — in particular after
 * commerce-core's e2e suite, which TRUNCATEs the catalogue.
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

  for (const product of PRODUCTS) {
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
      stockQuantity: product.stock,
      weightGrams: product.weightGrams,
      categoryIds: product.categories
        .map((slug) => categoryId.get(slug))
        .filter(Boolean),
    };

    const found = bySlug.get(product.slug);

    if (DRY_RUN) {
      console.log(`  ${found ? '~' : '+'} ${product.slug}`);
      continue;
    }

    if (found) {
      await api(`/products/${found.id}`, {
        method: 'PATCH',
        token: accessToken,
        body: payload,
      });
      console.log(`  ~ ${product.slug}`);
    } else {
      await api('/products', {
        method: 'POST',
        token: accessToken,
        body: { ...payload, slug: product.slug },
      });
      console.log(`  + ${product.slug}`);
    }
  }

  if (DRY_RUN) return;

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
