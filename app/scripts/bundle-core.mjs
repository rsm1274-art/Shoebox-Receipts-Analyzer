// Bundles src/core into one browser-ready IIFE exposing the global `ReceiptCore`.
// Output is committed (tools/legacy-gen/receipt-core.iife.js) so the Python generator needs no Node step to run;
// a test checks it is never stale.
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const BUNDLE_PATH = resolve(here, '..', '..', 'tools', 'legacy-gen', 'receipt-core.iife.js');

export async function bundleCore(write = true) {
  const result = await build({
    entryPoints: [resolve(here, '..', 'src', 'core', 'index.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'ReceiptCore',
    target: 'es2020',
    minify: false,
    legalComments: 'none',
    banner: { js: '/* GENERATED from app/src/core by app/scripts/bundle-core.mjs - do not edit */' },
    write: false,
    outfile: BUNDLE_PATH
  });
  const text = result.outputFiles[0].text.replace(/\r\n/g, '\n');
  if (write) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(BUNDLE_PATH, text);
  }
  return text;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = await bundleCore(true);
  console.log(`bundled core -> ${BUNDLE_PATH} (${text.length} bytes)`);
}
