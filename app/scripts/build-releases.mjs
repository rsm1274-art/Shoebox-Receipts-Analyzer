// Full release build: bundle the core, regenerate the three apps from the generator, then wire them to the core.
//   npm run build:releases
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleCore } from './bundle-core.mjs';
import { wireFile } from './wire-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');

const text = await bundleCore(true);
console.log(`1/3 core bundled (${text.length} bytes)`);

const py = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [resolve(repo, 'tools', 'legacy-gen', 'build_working.py')], { encoding: 'utf8' });
if (py.status !== 0) { console.error(py.stdout, py.stderr); process.exit(py.status || 1); }
console.log('2/3 apps generated');

for (const name of ['industry', 'legora', 'poolside']) {
  const r = wireFile(resolve(repo, 'releases', `receipt_audit_v2.1-${name}.html`));
  console.log(`3/3 wired ${name}: ${r.replaced} functions now delegate to the core`);
}
