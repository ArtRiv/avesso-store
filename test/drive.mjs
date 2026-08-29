// Drives the panel through its own BFF with real cookie jars — the path a
// browser takes. No token is held here; the cookies do all of it.
//
// Jars are named AND persisted to disk, because login is rate-limited to 5 per
// 15 minutes per IP and a BFF puts every operator behind one IP. Re-running a
// test file would otherwise burn that budget in seconds — which is itself the
// caveat the backend's docs/admin-api.md raises about panels built this way.
// Persisting them also proves the session survives an API restart, since the
// access token is stateless and the refresh token lives in the database.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const APP = 'http://localhost:5173';
const STORE = new URL('./.jars.json', import.meta.url);

const jars = new Map();
let current = 'anon';

if (existsSync(STORE)) {
  try {
    for (const [name, entries] of Object.entries(JSON.parse(readFileSync(STORE, 'utf8')))) {
      jars.set(name, new Map(entries));
    }
  } catch { /* a corrupt cache just means logging in again */ }
}

function persist() {
  const plain = {};
  for (const [name, jar] of jars) plain[name] = [...jar.entries()];
  writeFileSync(STORE, JSON.stringify(plain));
}

function jar() {
  if (!jars.has(current)) jars.set(current, new Map());
  return jars.get(current);
}

function cookieHeader() {
  return [...jar().entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function absorb(res) {
  let touched = false;
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value === '' || /Max-Age=0/i.test(raw)) jar().delete(name);
    else jar().set(name, value);
    touched = true;
  }
  if (touched) persist();
}

export function as(session) {
  current = session;
}

/** Whether this named session already holds a usable cookie jar. */
export function signedIn(session) {
  return (jars.get(session)?.size ?? 0) > 0;
}

export function forget(session) {
  jars.delete(session);
  persist();
}

export async function call(path, init = {}) {
  const res = await fetch(`${APP}${path}`, {
    ...init,
    redirect: 'manual',
    headers: { ...(init.headers ?? {}), cookie: cookieHeader() },
  });
  absorb(res);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, location: res.headers.get('location'), text };
}

/**
 * Signs in only if the jar is empty or stale. A 401 from a cheap authenticated
 * read is the staleness test — the refresh token may still be good, in which
 * case the BFF renews without spending a login.
 */
export async function ensureSignedIn(session, email, password) {
  as(session);

  if (signedIn(session)) {
    const probe = await call('/api/cart');
    if (probe.status !== 401) return 'reused';
  }

  const r = await call('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (r.status !== 204 && r.status !== 200) {
    throw new Error(`login ${email} -> ${r.status} ${JSON.stringify(r.body)}`);
  }

  return 'logged in';
}
