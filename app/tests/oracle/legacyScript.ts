// Loads the main <script> of a built release and exposes selected top-level declarations,
// so the TypeScript core can be compared against the exact code that shipped (the "oracle").
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import { parse } from 'acorn';

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, '..', '..', '..');
// Frozen copy of the v2.1 release as it shipped BEFORE the core was extracted. It is the oracle: do not regenerate it.
export const RELEASE_INDUSTRY = resolve(here, 'fixtures', 'receipt_audit_v2.1-industry.legacy.html');
export const CURRENT_RELEASE_INDUSTRY = resolve(REPO_ROOT, 'releases', 'receipt_audit_v2.1-industry.html');

export function mainScript(htmlPath = RELEASE_INDUSTRY): string {
  const html = readFileSync(htmlPath, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return scripts.sort((a, b) => b.length - a.length)[0];
}

interface Decl { name: string; kind: 'function' | 'var'; start: number; end: number }

export function topLevelDeclarations(source: string): Decl[] {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script' }) as any;
  const out: Decl[] = [];
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') {
      out.push({ name: node.id.name, kind: 'function', start: node.start, end: node.end });
    } else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') out.push({ name: d.id.name, kind: 'var', start: node.start, end: node.end });
      }
    }
  }
  return out;
}

export function declarationSource(source: string, name: string): string {
  // a later declaration of the same name replaces an earlier one at runtime, so use the last
  const d = [...topLevelDeclarations(source)].reverse().find((x) => x.name === name);
  if (!d) throw new Error(`No top-level declaration named ${name}`);
  return source.slice(d.start, d.end);
}

/**
 * Evaluate the named declarations in a fresh VM context seeded with `globals`
 * (for example coaAccounts) and return the context so tests can call the functions.
 */
export function loadLegacy(names: string[], globals: Record<string, unknown> = {}, htmlPath = RELEASE_INDUSTRY) {
  const source = mainScript(htmlPath);
  const code = names.map((n) => declarationSource(source, n)).join('\n');
  const ctx: Record<string, unknown> = { console, Math, Number, Date, JSON, String, Array, Object, RegExp, parseFloat, isNaN, ...globals };
  vm.createContext(ctx);
  // `let`/`const` at top level are not exposed on the context object, so re-export them.
  const exportNames = names.map((n) => `globalThis.${n} = typeof ${n} !== 'undefined' ? ${n} : undefined;`).join('\n');
  vm.runInContext(`${code}\n${exportNames}`, ctx);
  return ctx as any;
}
