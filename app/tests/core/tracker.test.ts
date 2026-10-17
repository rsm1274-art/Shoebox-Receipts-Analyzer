import { describe, expect, it } from 'vitest';
import { applyWorkflowEffects, ChangeTracker, verifyLog, appendLogEntries } from '../../src/core';
import type { Anomaly, LogDraft, Receipt } from '../../src/core';

const SYNC = { at: '2026-10-16T09:00:00.000Z', actor: 'Owner' };

const receipt = (over: Partial<Receipt> = {}): Receipt => ({
  id: 'r1', merchant: 'TEST SHOP', date: '2026-10-14', paidFromAccount: 'Card', vanClass: 'Van #1',
  items: [
    { name: 'Oil', qty: 1, price: 40, category: 'Maintenance' },
    { name: 'Filter', qty: 1, price: 12, category: 'Maintenance' },
    { name: 'Wiper', qty: 2, price: 9, category: 'Parts' }
  ],
  subtotal: 61, tax: 0, tip: 0, total: 61, ...over
});

const clone = (r: Receipt): Receipt => JSON.parse(JSON.stringify(r));

function seeded(receipts: Receipt[]) {
  const tracker = new ChangeTracker();
  tracker.seed(receipts);
  return tracker;
}

describe('change tracker: diffs', () => {
  it('a no-op sync produces no entries', () => {
    const base = receipt();
    const tracker = seeded([base]);
    expect(tracker.sync([clone(base)], SYNC)).toEqual([]);
  });

  it('a field edit produces one field.changed entry with from and to', () => {
    const base = receipt();
    const tracker = seeded([base]);
    const edited = { ...clone(base), merchant: 'NEW SHOP' };
    expect(tracker.sync([edited], SYNC)).toEqual([
      expect.objectContaining({ action: 'field.changed', receiptId: 'r1', field: 'merchant', from: 'TEST SHOP', to: 'NEW SHOP', line: null })
    ]);
  });

  it('a line price edit names the line and the field', () => {
    const base = receipt();
    const tracker = seeded([base]);
    const edited = clone(base);
    edited.items[1].price = 15;
    expect(tracker.sync([edited], SYNC)).toEqual([
      expect.objectContaining({ action: 'field.changed', field: 'price', line: 2, from: 12, to: 15 })
    ]);
  });

  it('adding a line at the end produces item.added for that line', () => {
    const base = receipt();
    const tracker = seeded([base]);
    const edited = clone(base);
    edited.items.push({ name: 'Brake pads', qty: 1, price: 80, category: 'Maintenance' });
    expect(tracker.sync([edited], SYNC)).toEqual([
      expect.objectContaining({ action: 'item.added', line: 4, to: 'Brake pads' })
    ]);
  });

  it('deleting a line in the middle produces one item.deleted and no spurious edits to the lines after it', () => {
    const base = receipt();
    const tracker = seeded([base]);
    const edited = clone(base);
    edited.items.splice(1, 1);
    const drafts = tracker.sync([edited], SYNC);
    expect(drafts).toEqual([
      expect.objectContaining({ action: 'item.deleted', line: 2, from: 'Filter' })
    ]);
  });

  it('a deleted line plus an edited line after it logs both', () => {
    const base = receipt();
    const tracker = seeded([base]);
    const edited = clone(base);
    edited.items.splice(0, 1);
    edited.items[1].qty = 3; // was the wiper, qty 2 -> 3
    const drafts = tracker.sync([edited], SYNC);
    expect(drafts.map((d) => d.action)).toEqual(['item.deleted', 'field.changed']);
    expect(drafts[0]).toMatchObject({ line: 1, from: 'Oil' });
    expect(drafts[1]).toMatchObject({ field: 'qty', from: 2, to: 3, line: 2 });
  });

  it('a category change records whether it was automatic or manual', () => {
    const base = receipt();
    const tracker = seeded([base]);
    const edited = clone(base);
    edited.items[0].category = 'Tools';
    edited.items[0].manualCategory = true;
    const drafts = tracker.sync([edited], SYNC);
    expect(drafts).toEqual([
      expect.objectContaining({ field: 'category', from: 'Maintenance', to: 'Tools', note: 'manual' }),
      expect.objectContaining({ field: 'manualCategory', from: null, to: true })
    ]);
  });

  it('a keyword (automatic) category change is noted as auto', () => {
    const base = receipt();
    const tracker = seeded([base]);
    const edited = clone(base);
    edited.items[0].category = 'Tools';
    const [d] = tracker.sync([edited], SYNC);
    expect(d).toMatchObject({ field: 'category', note: 'auto' });
  });

  it('several lines changed at once are counted and compared by position', () => {
    const base = receipt();
    const tracker = seeded([base]);
    const edited = clone(base);
    edited.items = [edited.items[0]];
    const drafts = tracker.sync([edited], SYNC);
    expect(drafts.filter((d) => d.action === 'item.deleted')).toHaveLength(2);
  });

  it('a new receipt produces receipt.created with the source as its note', () => {
    const tracker = seeded([]);
    const drafts = tracker.sync([receipt()], { ...SYNC, source: 'camera' });
    expect(drafts).toEqual([expect.objectContaining({ action: 'receipt.created', receiptId: 'r1', note: 'camera' })]);
  });

  it('a removed receipt produces receipt.deleted with the reason, and is not reported again', () => {
    const tracker = seeded([receipt()]);
    expect(tracker.sync([], { ...SYNC, reason: 'clear-all' })).toEqual([
      expect.objectContaining({ action: 'receipt.deleted', receiptId: 'r1', note: 'clear-all' })
    ]);
    expect(tracker.sync([], SYNC)).toEqual([]);
  });

  it('seed logs nothing, so restoring a file never produces fake created entries', () => {
    const tracker = new ChangeTracker();
    tracker.seed([receipt(), receipt({ id: 'r2' })]);
    expect(tracker.sync([receipt(), receipt({ id: 'r2' })], SYNC)).toEqual([]);
  });

  it('fields that are undefined and null count as the same value', () => {
    const base = receipt({ expensePhase: undefined });
    const tracker = seeded([base]);
    const edited = { ...clone(base), expensePhase: null as unknown as string };
    expect(tracker.sync([edited], SYNC)).toEqual([]);
  });

  it('drafts append cleanly to a verified log', () => {
    const tracker = seeded([receipt()]);
    const edited = clone(receipt());
    edited.total = 70;
    const log = appendLogEntries([], tracker.sync([edited], SYNC));
    expect(log).toHaveLength(1);
    expect(verifyLog(log)).toEqual({ ok: true });
  });
});

describe('change tracker: workflow effects', () => {
  const high: Anomaly = { severity: 'high', code: 'OWNER_DRAW_SPLIT', title: 'Owner draw: wine $14.00', detail: 'd' };

  it('a new receipt starts captured, or needs_review with an unresolved High flag', () => {
    const plain = applyWorkflowEffects([{ ...receipt(), status: undefined }], [{ action: 'receipt.created', receiptId: 'r1' } as LogDraft], SYNC);
    expect(plain.receipts[0].status).toBe('captured');
    const flagged = applyWorkflowEffects(
      [{ ...receipt(), anomalies: [high] }],
      [{ action: 'receipt.created', receiptId: 'r1' } as LogDraft],
      SYNC
    );
    expect(flagged.receipts[0].status).toBe('needs_review');
  });

  it('a receipt that comes back with its status (undo of Clear all) keeps that status', () => {
    const approved = { ...receipt(), status: 'approved' as const };
    const out = applyWorkflowEffects([approved], [{ action: 'receipt.created', receiptId: 'r1' } as LogDraft], SYNC);
    expect(out.receipts[0]).toBe(approved);
    expect(out.drafts).toHaveLength(1);
  });

  it('an edit to an approved receipt revokes approval and logs status.changed', () => {
    const approved = { ...receipt(), status: 'approved' as const };
    const drafts = [{ action: 'field.changed', receiptId: 'r1' } as LogDraft];
    const out = applyWorkflowEffects([approved], drafts, SYNC);
    expect(out.receipts[0]).toMatchObject({ status: 'needs_review', statusBy: 'Owner', statusAt: SYNC.at });
    expect(out.drafts[out.drafts.length - 1]).toMatchObject({ action: 'status.changed', from: 'approved', to: 'needs_review' });
  });

  it('an edit to a needs_review receipt changes nothing', () => {
    const r = { ...receipt(), status: 'needs_review' as const };
    const out = applyWorkflowEffects([r], [{ action: 'field.changed', receiptId: 'r1' } as LogDraft], SYNC);
    expect(out.receipts[0]).toBe(r);
    expect(out.drafts).toHaveLength(1);
  });

  it('an exported receipt is never changed here', () => {
    const r = { ...receipt(), status: 'exported' as const };
    const out = applyWorkflowEffects([r], [{ action: 'field.changed', receiptId: 'r1' } as LogDraft], SYNC);
    expect(out.receipts[0].status).toBe('exported');
  });

  it('a captured receipt with an unresolved High flag is escalated, and never auto-approved back', () => {
    const r = { ...receipt(), status: 'captured' as const, anomalies: [high] };
    const out = applyWorkflowEffects([r], [], SYNC);
    expect(out.receipts[0].status).toBe('needs_review');
    expect(out.drafts).toEqual([expect.objectContaining({ action: 'status.changed', from: 'captured', to: 'needs_review' })]);
  });
});
