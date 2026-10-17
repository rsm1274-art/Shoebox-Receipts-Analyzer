// End to end: the app as released NOW (rule functions delegating to the bundled core) must still give exactly the
// recorded outputs of the app as it shipped BEFORE the core was extracted. Also guards against a stale core bundle.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bundleCore, BUNDLE_PATH } from '../../scripts/bundle-core.mjs';
import { buildGolden } from './buildGolden';
import { CURRENT_RELEASE_INDUSTRY } from './legacyScript';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, '..', '..', '..');
const committed = () => JSON.parse(readFileSync(resolve(here, '..', 'golden', 'core.json'), 'utf8'));

describe('released apps', () => {
  it('the committed core bundle matches src/core', async () => {
    const fresh = await bundleCore(false);
    expect(readFileSync(BUNDLE_PATH, 'utf8').replace(/\r\n/g, '\n')).toBe(fresh);
  });

  it('the industry release is wired to the core', () => {
    expect(readFileSync(CURRENT_RELEASE_INDUSTRY, 'utf8')).toContain('var ReceiptCore =');
  });

  for (const name of ['industry', 'legora', 'poolside']) {
    it(`${name} release reproduces the golden outputs through the core`, () => {
      const html = resolve(REPO, 'releases', `receipt_audit_v2.1-${name}.html`);
      expect(JSON.parse(JSON.stringify(buildGolden(html)))).toEqual(committed());
    });
  }
});
