/**
 * Regenerates src/lib/api/schema.d.ts from a commerce-core OpenAPI document.
 *
 * The generated file is committed, and it is the only place request and
 * response types are allowed to come from: the backend's CI verifies its
 * openapi.json on every PR, so the document is the one description of the API
 * that cannot drift in silence. A hand-written type has no such guarantee.
 *
 *   pnpm api:types
 *
 * Checks for the local sibling `../commerce-core/openapi.json` first, then
 * OPENAPI_SOURCE / API_URL, and finally falls back to the deployed Render URL.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCAL_OPENAPI = resolve(process.cwd(), '../commerce-core/openapi.json');
const API_URL = process.env.API_URL;
const OUT = 'src/lib/api/schema.d.ts';

const source =
  process.env.OPENAPI_SOURCE ??
  (existsSync(LOCAL_OPENAPI)
    ? LOCAL_OPENAPI
    : `${(API_URL ?? 'https://commerce-core-kvlg.onrender.com').replace(/\/$/, '')}/docs-json`);

console.log(`Generating ${OUT} from ${source}`);

execFileSync('openapi-typescript', [source, '-o', OUT], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
