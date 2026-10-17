// The TypeScript core must reproduce, exactly, what the shipped app produced on the golden corpus.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  auditAndCategorizeReceipt, bankFeedFileName, buildBankFeedCsv, buildQboBankMemo, buildQboWebConnect, buildSplitCsv,
  computeProRataSplits, exportableReceipts, extractFuelMetadata, formatDateForQBO, inferLineItemCategory,
  mapPaymentMethodToAccount, parseRawOcrTextToReceipt, splitCsvFileName, webConnectFileName
} from '../../src/core';
import { contextVariants } from '../oracle/corpus';

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(resolve(here, '..', 'golden', 'core.json'), 'utf8'));
const variants = new Map(contextVariants().map((v) => [v.id, v.ctx]));
const ctxOf = (id: string) => structuredClone(variants.get(id)!);
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));   // same normalisation the golden file went through
const NOW = new Date(golden.meta.fixedNow);

describe('golden master: TypeScript core === shipped app', () => {
  it('has a meaningful corpus', () => {
    expect(golden.audit.length).toBeGreaterThan(400);
    const codes = new Set(golden.audit.flatMap((a: any) => a.output.anomalies.map((x: any) => x.code)));
    for (const c of ['OWNER_DRAW_SPLIT', 'CAPEX_THRESHOLD', 'MIXED_RECEIPT_SPLIT', 'FUEL_GALLONS_CHECK', 'SUBTOTAL_MISMATCH', 'TOTAL_MATH_ERROR', 'EXCESSIVE_TIP', 'DUPLICATE_ITEM']) {
      expect(codes.has(c), `corpus never raises ${c}`).toBe(true);
    }
  });

  it('auditAndCategorizeReceipt', () => {
    for (const c of golden.audit) {
      const got = plain(auditAndCategorizeReceipt(structuredClone(c.input), ctxOf(c.variant)));
      expect(got, `${c.variant} ${c.input.id}`).toEqual(c.output);
    }
  });

  it('auditAndCategorizeReceipt does not modify its input', () => {
    const c = golden.audit[3];
    const input = structuredClone(c.input);
    auditAndCategorizeReceipt(input, ctxOf(c.variant));
    expect(input).toEqual(c.input);
  });

  it('inferLineItemCategory', () => {
    for (const c of golden.infer) {
      expect(inferLineItemCategory(structuredClone(c.item), ctxOf(c.variant)), `${c.variant} ${JSON.stringify(c.item)}`).toBe(c.output);
    }
  });

  it('mapPaymentMethodToAccount', () => {
    for (const c of golden.payment) {
      expect(mapPaymentMethodToAccount(c.text, ctxOf(c.variant)), `${c.variant} "${c.text}"`).toBe(c.output);
    }
  });

  it('parseRawOcrTextToReceipt', () => {
    for (const c of golden.parse) {
      expect(plain(parseRawOcrTextToReceipt(c.text, ctxOf(c.variant), c.fileName, NOW)), `${c.variant} ${c.fileName}`).toEqual(c.output);
    }
  });

  it('computeProRataSplits', () => {
    for (const c of golden.splits) expect(plain(computeProRataSplits(structuredClone(c.input)))).toEqual(c.output);
  });

  it('extractFuelMetadata', () => {
    for (const c of golden.fuel) expect(extractFuelMetadata(structuredClone(c.input))).toEqual(c.output);
  });

  it('formatDateForQBO', () => {
    for (const c of golden.dates) expect(formatDateForQBO(c.isUndefined ? undefined : c.input)).toBe(c.output);
  });

  it('buildQboBankMemo', () => {
    for (const c of golden.memos) expect(buildQboBankMemo(structuredClone(c.input))).toBe(c.output);
  });

  it('the three export files (content and file name)', () => {
    for (const c of golden.exports) {
      const list = exportableReceipts(structuredClone(c.receipts), c.excludeMathErrors);
      const label = `list ${c.list} excludeMathErrors=${c.excludeMathErrors}`;
      if (list.length === 0) {
        expect(c.output.bankFeed, label).toBeNull();
        expect(c.output.split, label).toBeNull();
        expect(c.output.webConnect, label).toBeNull();
        continue;
      }
      expect({ content: buildBankFeedCsv(list), filename: bankFeedFileName(NOW) }, label).toEqual(c.output.bankFeed);
      expect({ content: buildSplitCsv(list), filename: splitCsvFileName(NOW) }, label).toEqual(c.output.split);
      expect({ content: buildQboWebConnect(list, NOW), filename: webConnectFileName(NOW) }, label).toEqual(c.output.webConnect);
    }
  });
});
