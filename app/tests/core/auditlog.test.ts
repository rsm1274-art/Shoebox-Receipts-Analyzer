import { describe, expect, it } from 'vitest';
import { appendLogEntries, appendLogEntry, GENESIS_HASH, hashEntry, stableStringify, verifyLog } from '../../src/core/auditlog';
import type { LogDraft, LogEntry } from '../../src/core/auditlog';

const draft = (over: Partial<LogDraft> = {}): LogDraft => ({
  at: '2026-10-16T09:00:00.000Z', actor: 'Owner', action: 'field.changed', receiptId: 'r1',
  field: 'merchant', from: 'OLD', to: 'NEW', ...over
});

function build(n: number): LogEntry[] {
  return appendLogEntries([], Array.from({ length: n }, (_, i) => draft({ receiptId: `r${i}`, to: `v${i}` })));
}

describe('audit log', () => {
  it('starts from the genesis hash and chains each entry to the one before', () => {
    const log = build(3);
    expect(log.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(log[0].prev).toBe(GENESIS_HASH);
    expect(log[1].prev).toBe(log[0].hash);
    expect(log[2].prev).toBe(log[1].hash);
    expect(verifyLog(log)).toEqual({ ok: true });
  });

  it('does not modify the log it was given', () => {
    const log = build(1);
    const copy = JSON.stringify(log);
    appendLogEntry(log, draft());
    expect(JSON.stringify(log)).toBe(copy);
  });

  it('verifies an empty log', () => {
    expect(verifyLog([])).toEqual({ ok: true });
  });

  it('detects a changed character in any field, at that entry', () => {
    const fields: Array<[keyof LogEntry, unknown]> = [
      ['at', '2026-10-16T09:00:01.000Z'], ['actor', 'Mallory'], ['action', 'receipt.deleted'],
      ['receiptId', 'r9'], ['batchId', 'B-1'], ['field', 'total'], ['line', 2], ['from', 'OLD!'], ['to', 'NEW!'],
      ['note', 'changed later']
    ];
    for (const [key, value] of fields) {
      const log = build(4);
      const tampered = log.map((e, i) => (i === 1 ? { ...e, [key]: value } : e));
      const result = verifyLog(tampered);
      expect(result.ok, `field ${String(key)}`).toBe(false);
      if (!result.ok) expect(result.seq, `field ${String(key)}`).toBe(2);
    }
  });

  it('detects a deleted entry', () => {
    const log = build(3);
    const result = verifyLog([log[0], log[2]]);
    expect(result.ok).toBe(false);
  });

  it('detects a reordered pair', () => {
    const log = build(3);
    const result = verifyLog([log[0], log[2], log[1]]);
    expect(result.ok).toBe(false);
  });

  it('detects a rewritten tail that keeps the hashes of the untouched entries', () => {
    const log = build(3);
    const forged = { ...log[2], to: 'forged' };
    const result = verifyLog([log[0], log[1], forged]);
    expect(result).toMatchObject({ ok: false, seq: 3 });
  });

  it('treats missing optional fields the same as null', () => {
    const a = appendLogEntry([], { at: 'x', actor: 'a', action: 'settings.changed', note: null, from: undefined } as LogDraft);
    expect(hashEntry({ ...a[0] })).toBe(a[0].hash);
    expect(verifyLog(a)).toEqual({ ok: true });
  });

  it('canonical JSON sorts keys so object values hash the same regardless of key order', () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    const x = appendLogEntry([], draft({ from: { p: 1, q: 2 } }));
    const y = appendLogEntry([], draft({ from: { q: 2, p: 1 } }));
    expect(x[0].hash).toBe(y[0].hash);
  });
});
