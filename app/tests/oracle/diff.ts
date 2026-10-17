// Debug helper: npx tsx tests/oracle/diff.ts [path-to-release.html]
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGolden } from './buildGolden';
import { CURRENT_RELEASE_INDUSTRY } from './legacyScript';

const here = dirname(fileURLToPath(import.meta.url));
const committed = JSON.parse(readFileSync(resolve(here, '..', 'golden', 'core.json'), 'utf8'));
const fresh = JSON.parse(JSON.stringify(buildGolden(process.argv[2] || CURRENT_RELEASE_INDUSTRY)));
for (const k of Object.keys(committed)) {
  if (!Array.isArray(committed[k])) continue;
  let bad = 0; let first: number | null = null;
  committed[k].forEach((c: unknown, i: number) => { if (JSON.stringify(c) !== JSON.stringify(fresh[k][i])) { bad++; if (first === null) first = i; } });
  console.log(k, 'records', committed[k].length, 'different', bad);
  if (first !== null) {
    console.log(' committed:', JSON.stringify(committed[k][first]).slice(0, 700));
    console.log(' fresh    :', JSON.stringify(fresh[k][first]).slice(0, 700));
  }
}

// detail for the exports section
committed.exports.forEach((e: any, i: number) => {
  for (const k of ['bankFeed', 'split', 'webConnect']) {
    const a = e.output[k]; const b = fresh.exports[i].output[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    console.log('exports record', i, 'list', e.list, 'excludeMathErrors', e.excludeMathErrors, k, 'filename', a?.filename, '->', b?.filename);
    const A: string = a?.content || ''; const B: string = b?.content || '';
    let j = 0; while (j < A.length && A[j] === B[j]) j++;
    console.log('  first difference at char', j, 'of', A.length, 'vs', B.length);
    console.log('  old:', JSON.stringify(A.slice(Math.max(0, j - 30), j + 70)));
    console.log('  new:', JSON.stringify(B.slice(Math.max(0, j - 30), j + 70)));
    break;
  }
});
