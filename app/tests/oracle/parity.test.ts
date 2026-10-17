// Guards the golden file: re-running the frozen legacy app on the corpus must still give exactly tests/golden/core.json.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { buildGolden } from './buildGolden';

const here = dirname(fileURLToPath(import.meta.url));

it('golden file is exactly what the frozen legacy app produces', () => {
  const committed = JSON.parse(readFileSync(resolve(here, '..', 'golden', 'core.json'), 'utf8'));
  const fresh = JSON.parse(JSON.stringify(buildGolden()));
  expect(fresh).toEqual(committed);
});
