// Runs every panel suite in one go and reports the total.
//
// Each suite is its own process on purpose: they share a cookie jar and a seed
// token through files, and nothing else. A suite that hangs or crashes takes
// only itself down, and the run still reports what the others found.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const HARNESS = new Set(['run.mjs', 'drive.mjs', 'fixture.mjs']);

const only = process.argv[2];
const suites = readdirSync(dir)
  .filter((f) => f.endsWith('.mjs') && !HARNESS.has(f))
  .filter((f) => (only ? f.startsWith(only) : true))
  .sort();

if (suites.length === 0) {
  console.error(only ? `No suite matching "${only}"` : 'No suites found');
  process.exit(1);
}

let passed = 0;
let failed = 0;
const broken = [];

for (const suite of suites) {
  console.log(`\n\x1b[1m━━ ${suite} ━━\x1b[0m`);

  const run = spawnSync(process.execPath, [`${dir}${suite}`], {
    stdio: ['inherit', 'pipe', 'inherit'],
    encoding: 'utf8',
  });

  process.stdout.write(run.stdout ?? '');

  const tally = /(\d+) passed, (\d+) failed/.exec(run.stdout ?? '');

  if (tally) {
    passed += Number(tally[1]);
    failed += Number(tally[2]);
  } else {
    // No tally line means the suite died before finishing — count it as a
    // failure rather than letting a crash read as a clean run.
    broken.push(suite);
    failed += 1;
  }
}

console.log(`\n\x1b[1m━━ total ━━\x1b[0m`);
console.log(`${passed} passed, ${failed} failed across ${suites.length} suites`);

if (broken.length > 0) {
  console.log(`did not finish: ${broken.join(', ')}`);
}

process.exit(failed === 0 ? 0 : 1);
