// Append-only, hash-chained audit log. Tamper-evident, NOT tamper-proof: anyone with the file can rewrite the
// whole chain. The Help manual must say so.
import { sha256Hex } from './sha256';

export const GENESIS_HASH = '0'.repeat(64);

export type LogAction =
  | 'receipt.created' | 'receipt.deleted' | 'receipts.cleared' | 'field.changed' | 'item.added' | 'item.deleted'
  | 'status.changed' | 'flag.accepted' | 'batch.created' | 'batch.downloaded' | 'batch.receipt.reopened'
  | 'coa.changed' | 'lists.changed' | 'settings.changed' | 'session.migrated';

export interface LogEntry {
  seq: number;
  at: string;
  /** Self-reported name until accounts exist (Phase 2b). */
  actor: string;
  action: LogAction;
  receiptId?: string | null;
  batchId?: string | null;
  field?: string | null;
  line?: number | null;
  from?: unknown;
  to?: unknown;
  note?: string | null;
  prev: string;
  hash: string;
}

/** A log entry before the log assigns seq, prev and hash. */
export type LogDraft = Omit<LogEntry, 'seq' | 'prev' | 'hash'>;

export type VerifyResult = { ok: true } | { ok: false; seq: number; reason: string };

/** JSON with object keys sorted, so the same value always produces the same text. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

const nul = (v: unknown) => (v === undefined ? null : v);

/** hash = sha256 over the canonical fields and the previous hash. Missing optional fields hash as null. */
export function hashEntry(e: Omit<LogEntry, 'hash'>): string {
  return sha256Hex(stableStringify([
    e.seq, e.at, e.actor, e.action, nul(e.receiptId), nul(e.batchId), nul(e.field), nul(e.line),
    nul(e.from), nul(e.to), nul(e.note), e.prev
  ]));
}

/** Returns a new log with `draft` appended. The input log is not modified. */
export function appendLogEntry(log: readonly LogEntry[], draft: LogDraft): LogEntry[] {
  const last = log[log.length - 1];
  const seq = last ? last.seq + 1 : 1;
  const prev = last ? last.hash : GENESIS_HASH;
  const withoutHash = { ...draft, seq, prev };
  return [...log, { ...withoutHash, hash: hashEntry(withoutHash) }];
}

/** Appends several drafts in order. */
export function appendLogEntries(log: readonly LogEntry[], drafts: readonly LogDraft[]): LogEntry[] {
  return drafts.reduce((acc, d) => appendLogEntry(acc, d), [...log]);
}

/** Checks sequence numbers, the previous-hash chain and every entry's hash. Reports the first bad entry. */
export function verifyLog(log: readonly LogEntry[]): VerifyResult {
  let prev = GENESIS_HASH;
  for (let i = 0; i < log.length; i++) {
    const e = log[i];
    if (e.seq !== i + 1) return { ok: false, seq: e.seq, reason: `sequence should be ${i + 1}, found ${e.seq}` };
    if (e.prev !== prev) return { ok: false, seq: e.seq, reason: 'previous hash does not match the entry before it' };
    if (hashEntry(e) !== e.hash) return { ok: false, seq: e.seq, reason: 'entry contents do not match their hash' };
    prev = e.hash;
  }
  return { ok: true };
}
