import { describe, expect, it } from 'vitest';
import {
  bankFeedFileName, buildBankFeedCsv, buildQboWebConnect, buildSplitCsv, createBatch, nextBatchId, reopenReceipt,
  splitCsvFileName, webConnectFileName, verifyLog, appendLogEntries, migrateSession
} from '../../src/core';
import type { ExportBatch, Receipt } from '../../src/core';

const NOW = new Date('2026-10-16T15:00:00.000Z');
const approved = (id: string, over: Partial<Receipt> = {}): Receipt => ({
  id, merchant: `SHOP ${id}`, date: '2026-10-14', paidFromAccount: 'Card', vanClass: 'Van #1 - Ford Transit 250',
  items: [{ name: 'Oil', qty: 1, price: 40, category: 'Maintenance' }], subtotal: 40, tax: 0, tip: 0, total: 40,
  status: 'approved', statusAt: '2026-10-16T10:00:00.000Z', statusBy: 'Owner', imageUrl: 'blob:x', thumbUrl: 'data:x',
  anomalies: [], waivers: [], revision: 0, batchId: null, exportedAt: null, ...over
});

describe('batch ids', () => {
  it('B-YYYYMMDD-n counts the batches already made that day', () => {
    expect(nextBatchId([], NOW)).toBe('B-20261016-1');
    const made: ExportBatch[] = [{ id: 'B-20261016-1' } as ExportBatch, { id: 'B-20261015-1' } as ExportBatch];
    expect(nextBatchId(made, NOW)).toBe('B-20261016-2');
  });
});

describe('createBatch', () => {
  it('takes approved receipts only and locks them as exported', () => {
    const list = [approved('a'), approved('b', { status: 'needs_review' }), approved('c')];
    const res = createBatch(list, [], 'Owner', NOW);
    if (!res.ok) throw new Error(res.error);
    expect(res.batch).toMatchObject({ id: 'B-20261016-1', count: 2, receiptIds: ['a', 'c'], total: 80 });
    expect(res.receipts.map((r) => [r.id, r.status, r.batchId])).toEqual([
      ['a', 'exported', 'B-20261016-1'], ['b', 'needs_review', null], ['c', 'exported', 'B-20261016-1']
    ]);
    expect(res.batches).toEqual([res.batch]);
  });

  it('logs batch.created and one status change per receipt', () => {
    const res = createBatch([approved('a')], [], 'Owner', NOW);
    if (!res.ok) throw new Error(res.error);
    expect(res.drafts.map((d) => [d.action, d.receiptId ?? null])).toEqual([
      ['batch.created', null], ['status.changed', 'a']
    ]);
    const log = appendLogEntries([], res.drafts);
    expect(verifyLog(log)).toEqual({ ok: true });
  });

  it('refuses when nothing is approved', () => {
    expect(createBatch([approved('a', { status: 'needs_review' })], [], 'Owner', NOW)).toEqual({
      ok: false, error: 'No approved receipts to export.'
    });
  });

  it('the batch keeps a snapshot without image URLs, so later edits do not change it', () => {
    const res = createBatch([approved('a')], [], 'Owner', NOW);
    if (!res.ok) throw new Error(res.error);
    const snap = res.batch.receipts[0];
    expect(snap).not.toHaveProperty('imageUrl');
    expect(snap).not.toHaveProperty('thumbUrl');
    expect(snap.status).toBe('exported');
    // Mutating the live receipt must not reach the snapshot.
    res.receipts[0].items[0].price = 999;
    expect(res.batch.receipts[0].items[0].price).toBe(40);
  });

  it('a second batch on the same day gets the next id', () => {
    const first = createBatch([approved('a')], [], 'Owner', NOW);
    if (!first.ok) throw new Error(first.error);
    const second = createBatch([approved('b')], first.batches, 'Owner', NOW);
    if (!second.ok) throw new Error(second.error);
    expect(second.batch.id).toBe('B-20261016-2');
  });
});

describe('reopen and correction export', () => {
  function exportedReceipt(): { receipts: Receipt[]; batches: ExportBatch[] } {
    const res = createBatch([approved('a')], [], 'Owner', NOW);
    if (!res.ok) throw new Error(res.error);
    return { receipts: res.receipts, batches: res.batches };
  }

  it('reopen needs an exported receipt and a reason', () => {
    const { receipts } = exportedReceipt();
    expect(reopenReceipt(approved('x'), 'typo in tip', 'Owner', NOW).ok).toBe(false);
    expect(reopenReceipt(receipts[0], '', 'Owner', NOW).ok).toBe(false);
  });

  it('reopen moves to needs_review, bumps the revision, and logs the reason', () => {
    const { receipts } = exportedReceipt();
    const res = reopenReceipt(receipts[0], 'Wrong account on line 1', 'Owner', NOW);
    if (!res.ok) throw new Error(res.error);
    expect(res.receipt).toMatchObject({ status: 'needs_review', revision: 1, batchId: 'B-20261016-1' });
    const reopened = res.drafts.find((d) => d.action === 'batch.receipt.reopened');
    expect(reopened).toMatchObject({ receiptId: 'a', from: 0, to: 1, note: 'Wrong account on line 1', batchId: 'B-20261016-1' });
  });

  it('a reopened receipt exports as a correction with the -rN suffix and CORRECTION memo', () => {
    const { receipts, batches } = exportedReceipt();
    const reopened = reopenReceipt(receipts[0], 'Wrong account', 'Owner', NOW);
    if (!reopened.ok) throw new Error(reopened.error);
    const approvedAgain = reopened.receipt.status === 'needs_review'
      ? { ...reopened.receipt, status: 'approved' as const }
      : reopened.receipt;
    const next = createBatch([approvedAgain], batches, 'Owner', NOW);
    if (!next.ok) throw new Error(next.error);
    expect(next.batch.corrections).toEqual(['a']);
    const withSplits = next.batch.receipts.map((r) => ({
      ...r, qboSplits: [{ category: 'Maintenance', rawSubtotal: 40, allocatedTaxTip: 0, qboSplitAmount: 40, itemNames: ['Oil'] }]
    }));
    expect(buildQboWebConnect(withSplits, NOW)).toContain('<FITID>a-r1');
    expect(buildBankFeedCsv(withSplits)).toContain('CORRECTION r1 | SHOP a');
    expect(buildSplitCsv(withSplits)).toContain('"CORRECTION r1: Oil"');
  });

  it('a batch snapshot does not change when the receipt is later reopened', () => {
    const { receipts, batches } = exportedReceipt();
    const before = JSON.stringify(batches[0].receipts);
    reopenReceipt(receipts[0], 'Wrong account', 'Owner', NOW);
    expect(JSON.stringify(batches[0].receipts)).toBe(before);
  });
});

describe('default export output is unchanged for receipts that were never reopened', () => {
  it('no -r suffix, no CORRECTION prefix, and the plain file names', () => {
    const r = approved('a', { revision: 0 });
    expect(buildQboWebConnect([r], NOW)).toContain('<FITID>a\n');
    expect(buildBankFeedCsv([r])).not.toContain('CORRECTION');
    expect(bankFeedFileName(NOW)).toBe('QBO_BankFeed_4Col_2026-10-16.csv');
    expect(splitCsvFileName(NOW)).toBe('QBO_Detailed_Splits_2026-10-16.csv');
    expect(webConnectFileName(NOW)).toBe('ReceiptAudit_2026-10-16.qbo');
  });

  it('a batch id appends to the file names', () => {
    expect(bankFeedFileName(NOW, 'B-20261016-1')).toBe('QBO_BankFeed_4Col_2026-10-16_B-20261016-1.csv');
    expect(splitCsvFileName(NOW, 'B-20261016-1')).toBe('QBO_Detailed_Splits_2026-10-16_B-20261016-1.csv');
    expect(webConnectFileName(NOW, 'B-20261016-1')).toBe('ReceiptAudit_2026-10-16_B-20261016-1.qbo');
  });
});

describe('migrateSession (schema 1 -> 2)', () => {
  // A schema 1 receipt: none of the review-workflow fields exist yet.
  const legacy: Receipt = {
    id: 'a', merchant: 'SHOP a', date: '2026-10-14', items: [{ name: 'Oil', qty: 1, price: 40, category: 'Maintenance' }], total: 40
  };
  const v1 = { schema: 1, receipts: [legacy] };
  const AT = '2026-10-16T09:00:00.000Z';

  it('receipts without a status become needs_review, and nothing is approved', () => {
    const out = migrateSession(v1, AT, 'Owner');
    expect(out.schema).toBe(2);
    expect(out.receipts[0]).toMatchObject({ status: 'needs_review', statusBy: 'Owner', statusAt: AT, revision: 0, waivers: [], batchId: null });
  });

  it('adds one session.migrated entry to an empty log', () => {
    const out = migrateSession(v1, AT, 'Owner');
    expect(out.auditLog).toHaveLength(1);
    expect(out.auditLog[0]).toMatchObject({ action: 'session.migrated', from: 1, to: 2, note: 'Migrated from schema 1; 1 receipts set to Needs review' });
    expect(verifyLog(out.auditLog)).toEqual({ ok: true });
  });

  it('is idempotent: migrating again changes nothing', () => {
    const once = migrateSession(v1, AT, 'Owner');
    const twice = migrateSession(once, '2026-10-17T00:00:00.000Z', 'Someone else');
    expect(twice).toEqual(once);
  });

  it('a session with no receipts gets no migration entry', () => {
    const out = migrateSession({ schema: 1, receipts: [] }, AT, 'Owner');
    expect(out.auditLog).toEqual([]);
    expect(out.batches).toEqual([]);
    expect(out.actorName).toBe('Owner');
  });

  it('keeps an existing log and actor name untouched', () => {
    const existing = appendLogEntries([], [{ at: AT, actor: 'A', action: 'settings.changed', receiptId: null, batchId: null, field: null, line: null, from: null, to: null, note: null }]);
    const out = migrateSession({ schema: 2, receipts: [], auditLog: existing, actorName: 'Dana' }, AT, 'Owner');
    expect(out.auditLog).toEqual(existing);
    expect(out.actorName).toBe('Dana');
  });

  it('refuses a file from a newer schema', () => {
    expect(() => migrateSession({ schema: 3, receipts: [] }, AT, 'Owner')).toThrow(/newer version/);
  });
});
