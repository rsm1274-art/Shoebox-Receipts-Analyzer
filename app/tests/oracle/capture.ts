// Regenerates tests/golden/core.json from the released app. Run: npm run golden:capture
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGolden, serializeGolden } from './buildGolden';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'golden', 'core.json');
mkdirSync(dirname(out), { recursive: true });
const golden = buildGolden();
writeFileSync(out, serializeGolden(golden));
const counts = Object.fromEntries(Object.entries(golden).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, (v as unknown[]).length]));
console.log('wrote', out, counts);
