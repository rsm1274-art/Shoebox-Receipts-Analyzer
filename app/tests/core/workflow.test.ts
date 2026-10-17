import { describe, expect, it } from 'vitest';
import {
  acceptFlag, approvalBlockers, defaultContext, hasUnresolvedHighFlag, initialStatus, isIsoDate, isFlagResolved,
  statusAfterEdit, STATUSES, transition, waiverFor
} from '../../src/core';
import type { Anomaly, CoreContext, Receipt, ReceiptStatus, WorkflowEvent } from '../../src/core';

const high: Anomaly = { severity: 'high', code: 'OWNER_DRAW_SPLIT', title: 'Owner draw: wine $14.00', detail: 'd' };
const medium: Anomaly = { severity: 'medium', code: 'EXCESSIVE_TIP', title: 'Tip 25%', detail: 'd' };

function ready(over: Partial<Receipt> = {}, ctx: CoreContext = defaultContext()): Receipt {
  const account = ctx.coaAccounts.find((c) => !c.archived && c.tier === 'operating')!;
  return {
    id: 'r1', merchant: 'TEST SHOP', date: '2026-10-14', paidFromAccount: ctx.paymentAccounts[0].name,
    vanClass: ctx.fleetClasses[0].name, items: [{ name: 'Widget', qty: 1, price: 10, category: account.name }],
    subtotal: 10, tax: 0, tip: 0, total: 10, anomalies: [], ...over
  };
}

describe('status transitions', () => {
  const table: Record<ReceiptStatus, Partial<Record<WorkflowEvent, ReceiptStatus>>> = {
    captured: { escalate: 'needs_review', send_back: 'needs_review', approve: 'approved', edit: 'captured' },
    needs_review: { escalate: 'needs_review', send_back: 'needs_review', approve: 'approved', edit: 'needs_review' },
    approved: { escalate: 'needs_review', send_back: 'needs_review', edit: 'needs_review', export: 'exported' },
    exported: { reopen: 'needs_review' }
  };
  const events: WorkflowEvent[] = ['escalate', 'send_back', 'approve', 'edit', 'export', 'reopen'];

  for (const from of STATUSES) {
    for (const event of events) {
      const expected = table[from][event] ?? null;
      it(`${from} + ${event} -> ${expected ?? 'forbidden'}`, () => {
        expect(transition(from, event)).toBe(expected);
      });
    }
  }

  it('an edit revokes approval, and an edit to an exported receipt is refused', () => {
    expect(statusAfterEdit('approved')).toBe('needs_review');
    expect(statusAfterEdit('exported')).toBe('exported');
    expect(statusAfterEdit('captured')).toBe('captured');
  });

  it('a new receipt with an unresolved High flag starts in needs_review', () => {
    expect(initialStatus(ready({ anomalies: [high] }))).toBe('needs_review');
    expect(initialStatus(ready({ anomalies: [medium] }))).toBe('captured');
    expect(initialStatus(ready())).toBe('captured');
  });
});

describe('approval blockers (one test per blocker)', () => {
  const ctx = defaultContext();
  const blockersOf = (r: Receipt) => approvalBlockers(r, ctx);

  it('a complete receipt has no blockers', () => {
    expect(blockersOf(ready())).toEqual([]);
  });
  it('blocks an empty merchant', () => {
    expect(blockersOf(ready({ merchant: '   ' }))).toEqual(['Merchant is empty.']);
  });
  it('blocks a date that is not a real ISO date', () => {
    expect(blockersOf(ready({ date: '10/12/26' }))).toHaveLength(1);
    expect(blockersOf(ready({ date: '2026-02-30' }))).toHaveLength(1);
    expect(blockersOf(ready({ date: '' }))).toHaveLength(1);
  });
  it('blocks a paid-from account that is missing or archived', () => {
    expect(blockersOf(ready({ paidFromAccount: 'Nope' }))).toHaveLength(1);
    const archivedCtx = { ...ctx, paymentAccounts: ctx.paymentAccounts.map((a) => ({ ...a, archived: true })) };
    expect(approvalBlockers(ready(), archivedCtx)).toEqual(['Paid-from account is missing or archived.']);
  });
  it('blocks a van that is missing or archived', () => {
    expect(blockersOf(ready({ vanClass: 'Van #9' }))).toHaveLength(1);
  });
  it('blocks a total of zero or less', () => {
    expect(blockersOf(ready({ total: 0 }))).toHaveLength(1);
    expect(blockersOf(ready({ total: null }))).toHaveLength(1);
  });
  it('blocks a receipt with no lines', () => {
    expect(blockersOf(ready({ items: [] }))).toEqual(['Receipt has no line items.']);
  });
  it('blocks a line on an inactive account, and only that line', () => {
    const r = ready({ items: [{ name: 'Widget', qty: 1, price: 10, category: 'Gone account' }] });
    expect(blockersOf(r)).toEqual(['Line 1 ("Widget") is on an inactive or missing account.']);
  });
  it('blocks an unresolved High flag, but not a medium one', () => {
    expect(blockersOf(ready({ anomalies: [high] }))).toEqual([`Unresolved High flag: ${high.title}`]);
    expect(blockersOf(ready({ anomalies: [medium] }))).toEqual([]);
  });
  it('a Tier 2 (startup) account is blocked when CapEx mode is off', () => {
    const startup = ctx.coaAccounts.find((c) => c.tier === 'startup' && !c.archived);
    if (!startup) return;
    const r = ready({ items: [{ name: 'Thing', qty: 1, price: 10, category: startup.name }] });
    const capexOff = { ...ctx, startupPhaseMode: false };
    expect(approvalBlockers(r, capexOff)).toHaveLength(1);
    expect(approvalBlockers(r, { ...ctx, startupPhaseMode: true })).toEqual([]);
  });
});

describe('flag waivers', () => {
  it('a reason of at least the minimum length is accepted and stored with its key', () => {
    const res = acceptFlag(high, '  Client dinner, approved by Dana  ', 'Owner', '2026-10-16T10:00:00Z');
    expect(res).toEqual({
      ok: true,
      waiver: {
        code: 'OWNER_DRAW_SPLIT', key: `OWNER_DRAW_SPLIT|${high.title}`,
        note: 'Client dinner, approved by Dana', by: 'Owner', at: '2026-10-16T10:00:00Z'
      }
    });
  });

  it('a short or blank reason is refused', () => {
    expect(acceptFlag(high, '', 'Owner', 'x').ok).toBe(false);
    expect(acceptFlag(high, '  ok ', 'Owner', 'x').ok).toBe(false);
  });

  it('a waiver resolves the flag it matches', () => {
    const res = acceptFlag(high, 'Client dinner', 'Owner', 'x');
    if (!res.ok) throw new Error('setup');
    const r = ready({ anomalies: [high], waivers: [res.waiver] });
    expect(isFlagResolved(r, high)).toBe(true);
    expect(hasUnresolvedHighFlag(r)).toBe(false);
    expect(approvalBlockers(r, defaultContext())).toEqual([]);
    expect(waiverFor(r, high)).toBe(res.waiver);
  });

  it('a material change to the flag (new amount in the title) re-raises it', () => {
    const res = acceptFlag(high, 'Client dinner', 'Owner', 'x');
    if (!res.ok) throw new Error('setup');
    const changed: Anomaly = { ...high, title: 'Owner draw: wine $40.00' };
    const r = ready({ anomalies: [changed], waivers: [res.waiver] });
    expect(isFlagResolved(r, changed)).toBe(false);
    expect(hasUnresolvedHighFlag(r)).toBe(true);
  });
});

describe('ISO date check', () => {
  it.each([
    ['2026-10-16', true], ['2024-02-29', true], ['2026-02-29', false], ['2026-13-01', false],
    ['10/12/26', false], ['2026-1-5', false], ['', false], [undefined, false]
  ])('%s -> %s', (value, ok) => {
    expect(isIsoDate(value as string | undefined)).toBe(ok);
  });
});
