// Fixture seeding, shared by the test files.
//
// Each run makes its own product so the tests are repeatable and none depends
// on what another left behind — the drift that broke the panel suite once the
// removal suite had renamed and deleted sizes out from under it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const API = 'http://localhost:3000';
const TOKEN_CACHE = new URL('./.seed-token', import.meta.url);

export const PASSWORD = 'correct horse battery staple';
export const ADMIN = 'operador@avesso.test';
export const CUSTOMER = 'cliente@avesso.test';

let token = null;

/**
 * A bearer token for seeding only.
 *
 * Cached to DISK, not just in memory: login is 5 per 15 minutes per IP, and
 * each test run is a fresh process, so an in-memory cache still spends one
 * login per run and three runs in a row exhaust the budget. The token lives 15
 * minutes; an expired one comes back as a 401 from the seed call and is
 * refreshed then.
 *
 * Nothing under test ever sees this token — the assertions all go through the
 * BFF's cookies, which is the path a browser takes.
 */
async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN, password: PASSWORD }),
  });

  if (!res.ok) throw new Error(`seed login -> ${res.status}`);

  token = (await res.json()).accessToken;
  writeFileSync(TOKEN_CACHE, token);
  return token;
}

async function adminToken() {
  if (token) return token;

  if (existsSync(TOKEN_CACHE)) {
    token = readFileSync(TOKEN_CACHE, 'utf8').trim();
    if (token) return token;
  }

  return login();
}

async function post(path, body, retried = false) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${await adminToken()}`,
    },
    body: JSON.stringify(body),
  });

  // A cached token that has aged out. One re-login, then give up.
  if (res.status === 401 && !retried) {
    token = null;
    await login();
    return post(path, body, true);
  }

  if (!res.ok) throw new Error(`seed ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

export function seedProduct(body) {
  return post('/products', body);
}

/** A sized product and an unsized one, both unique to this run. */
export async function seedCatalogue(prefix = 'Peça') {
  const tag = randomUUID().slice(0, 8);
  const slug = prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const sized = await seedProduct({
    name: `${prefix} ${tag}`,
    slug: `${slug}-${tag}`,
    priceCents: 14990,
    status: 'ACTIVE',
    weightGrams: 240,
    description: 'Malha pesada, gola reforçada.',
    variants: [
      { label: 'P', stockQuantity: 8 },
      { label: 'M', stockQuantity: 12 },
      { label: 'G', stockQuantity: 10 },
      { label: 'GG', stockQuantity: 0 },
      { label: 'XGG', stockQuantity: 8 },
    ],
  });

  const unsized = await seedProduct({
    name: `Única ${tag}`,
    slug: `unica-${tag}`,
    priceCents: 32990,
    status: 'ACTIVE',
  });

  return { tag, sized, unsized };
}
