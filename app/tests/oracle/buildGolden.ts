// Builds the golden data set by running the shipped legacy code on the deterministic corpus.
import { createLegacyCore, FIXED_NOW_ISO } from './legacyCore';
import { contextVariants, OCR_TEXTS, PAYMENT_STRINGS, randomReceipts, SPLIT_CASES } from './corpus';
import type { Receipt } from '../../src/core/types';

const DATES = ['2026-10-14', '10/12/26', '', undefined, null, '2026-1-4', '2026-12-31'];

export function buildGolden(htmlPath?: string) {
  const legacy = createLegacyCore(htmlPath);
  const variants = contextVariants();
  const golden: any = { meta: { fixedNow: FIXED_NOW_ISO }, audit: [], infer: [], payment: [], parse: [], splits: [], fuel: [], dates: [], exports: [] };

  variants.forEach((v, vi) => {
    const categories = v.ctx.coaAccounts.map((a) => a.name);
    const receipts = randomReceipts(80, 1000 + vi, categories);
    receipts.forEach((r) => {
      golden.audit.push({ variant: v.id, input: r, output: legacy.audit(r, v.ctx) });
    });
    // direct line-item inference, including odd inputs
    randomReceipts(30, 5000 + vi, categories).forEach((r) => r.items.forEach((item) => {
      golden.infer.push({ variant: v.id, item, output: legacy.infer(item, v.ctx) });
    }));
    golden.infer.push({ variant: v.id, item: { name: 'X', qty: 1, price: 2500 }, output: legacy.infer({ name: 'X', qty: 1, price: 2500 }, v.ctx) });
    golden.infer.push({ variant: v.id, item: { name: 'x', qty: 5, price: 500 }, output: legacy.infer({ name: 'x', qty: 5, price: 500 }, v.ctx) });
    golden.infer.push({ variant: v.id, item: { name: '', price: 1 }, output: legacy.infer({ name: '', price: 1 }, v.ctx) });
    PAYMENT_STRINGS.forEach((text) => golden.payment.push({ variant: v.id, text, output: legacy.payment(text, v.ctx) }));
    OCR_TEXTS.forEach((o) => golden.parse.push({ variant: v.id, fileName: o.fileName, text: o.text, output: legacy.parse(o.text, o.fileName, v.ctx) }));
  });

  SPLIT_CASES.forEach((c) => golden.splits.push({ input: c, output: legacy.splits(c) }));
  // splits over the audited items too (categories already assigned)
  golden.audit.slice(0, 120).forEach((a: any) => {
    const input = { items: a.output.items, tax: a.output.tax, tip: a.output.tip, total: a.output.total };
    golden.splits.push({ input, output: legacy.splits(input) });
  });

  golden.audit.slice(0, 80).forEach((a: any) => golden.fuel.push({ input: { rawOcrText: a.input.rawOcrText, extraNote: a.input.extraNote, items: a.input.items }, output: legacy.fuel(a.input) }));
  DATES.forEach((d) => golden.dates.push({ input: d ?? null, isUndefined: d === undefined, output: legacy.formatDate(d) }));

  // exports: a few lists drawn from the audited outputs. The "exclude math-error" variant is no longer recorded:
  // that checkbox was removed when approval gates export (slice 1); exports now take the selected batch as a whole.
  const lists: Receipt[][] = [
    golden.audit.filter((a: any) => a.variant === 'default').slice(0, 25).map((a: any) => a.output),
    golden.audit.filter((a: any) => a.variant === 'custom-accounts').slice(0, 12).map((a: any) => a.output),
    golden.audit.filter((a: any) => a.variant === 'managed-lists').slice(0, 1).map((a: any) => a.output),
    []
  ];
  lists.forEach((list, li) => {
    golden.exports.push({ list: li, excludeMathErrors: false, receipts: list, output: legacy.exports(list, false) });
  });
  golden.memos = golden.audit.slice(0, 60).map((a: any) => ({ input: a.output, output: legacy.memo(a.output) }));
  return golden;
}

/** One record per line keeps the file diff-friendly. */
export function serializeGolden(golden: any): string {
  const parts: string[] = ['{'];
  const keys = Object.keys(golden);
  keys.forEach((k, ki) => {
    const v = golden[k];
    const comma = ki < keys.length - 1 ? ',' : '';
    if (Array.isArray(v)) {
      parts.push(`"${k}": [`);
      parts.push(v.map((x: unknown) => '  ' + JSON.stringify(x)).join(',\n'));
      parts.push(`]${comma}`);
    } else {
      parts.push(`"${k}": ${JSON.stringify(v)}${comma}`);
    }
  });
  parts.push('}');
  return parts.join('\n') + '\n';
}
