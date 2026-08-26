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
 * API_URL wins if set, so a developer running commerce-core on localhost:3000
 * generates against their own instance. Otherwise this targets the deployed
 * one — which hibernates on Render's free tier, so a cold first request takes
 * about a minute before anything is written.
 */

import { execFileSync } from 'node:child_process';

const API_URL = process.env.API_URL ?? 'https://commerce-core-kvlg.onrender.com';
const OUT = 'src/lib/api/schema.d.ts';
const source = `${API_URL.replace(/\/$/, '')}/docs-json`;

console.log(`Generating ${OUT} from ${source}`);

execFileSync('openapi-typescript', [source, '-o', OUT], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
