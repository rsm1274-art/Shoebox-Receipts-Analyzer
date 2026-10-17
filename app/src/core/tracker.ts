// Change tracking: turns differences between two states of the receipts into audit-log drafts.
// Pure. The browser glue calls `seed` once after load and `sync` after every state change.
import type { LogDraft, LogAction } from './auditlog';
import { hasUnresolvedHighFlag, initialStatus, statusAfterEdit } from './workflow';
import type { Receipt, ReceiptStatus } from './types';

/** Receipt-level fields whose edits are logged. */
export const TRACKED_RECEIPT_FIELDS = [
  'merchant', 'date', 'paidFromAccount', 'vanClass', 'expensePhase', 'subtotal', 'tax', 'tip', 'total'
] as const;

/** Line fields whose edits are logged. */
export const TRACKED_LINE_FIELDS = ['name', 'qty', 'price', 'category', 'manualCategory'] as const;

type Plain = Record<string, unknown>;
interface Snapshot {
  fields: Plain;
  lines: Plain[];
}

export interface SyncOptions {
  /** ISO timestamp for every draft from this sync. */
  at: string;
  actor: string;
  /** Where a new receipt came from: upload, camera, scan-folder, drag-drop, sample. Stored as the note of receipt.created. */
  source?: string;
  /** Why receipts disappeared, e.g. "clear-all". Stored as the note of receipt.deleted. */
  reason?: string;
}

const norm = (v: unknown) => (v === undefined ? null : v);
const same = (a: unknown, b: unknown) => a === b;
const pick = (obj: object, keys: readonly string[]): Plain =>
  Object.fromEntries(keys.map((k) => [k, norm((obj as Plain)[k])]));

const lineKey = (l: Plain) => `${l.name}|${l.qty}|${l.price}`;

function snapshotOf(r: Receipt): Snapshot {
  return {
    fields: pick(r, TRACKED_RECEIPT_FIELDS),
    lines: (r.items || []).map((item) => pick(item, TRACKED_LINE_FIELDS))
  };
}

function draft(opts: SyncOptions, action: LogAction, receiptId: string | null, extra: Partial<LogDraft> = {}): LogDraft {
  return {
    at: opts.at, actor: opts.actor, action, receiptId, batchId: null, field: null, line: null,
    from: null, to: null, note: null, ...extra
  };
}

/**
 * Index of the one line whose removal makes `longer` match `shorter`, or -1.
 * First by name, qty and price; then by name alone, so a deletion plus a qty edit on another line is still one deletion.
 */
function findRemovalIndex(longer: Plain[], shorter: Plain[]): number {
  for (const key of [lineKey, (l: Plain) => String(l.name)]) {
    const target = shorter.map(key).join('\n');
    for (let j = 0; j < longer.length; j++) {
      const without = longer.filter((_, i) => i !== j).map(key).join('\n');
      if (without === target) return j;
    }
  }
  return -1;
}

function diffLineFields(receiptId: string, prev: Plain, next: Plain, line: number, opts: SyncOptions): LogDraft[] {
  const out: LogDraft[] = [];
  for (const f of TRACKED_LINE_FIELDS) {
    if (same(prev[f], next[f])) continue;
    const note = f === 'category' ? (next.manualCategory ? 'manual' : 'auto') : null;
    out.push(draft(opts, 'field.changed', receiptId, { field: f, line, from: prev[f], to: next[f], note }));
  }
  return out;
}

function diffReceipt(receiptId: string, prev: Snapshot, next: Snapshot, opts: SyncOptions): LogDraft[] {
  const out: LogDraft[] = [];
  for (const f of TRACKED_RECEIPT_FIELDS) {
    if (!same(prev.fields[f], next.fields[f])) {
      out.push(draft(opts, 'field.changed', receiptId, { field: f, from: prev.fields[f], to: next.fields[f] }));
    }
  }

  const a = prev.lines;
  const b = next.lines;
  if (a.length === b.length) {
    a.forEach((line, i) => out.push(...diffLineFields(receiptId, line, b[i], i + 1, opts)));
    return out;
  }

  // One line added or deleted: find which one, then compare the lines that remain.
  if (Math.abs(a.length - b.length) === 1) {
    const added = b.length > a.length;
    const j = added ? findRemovalIndex(b, a) : findRemovalIndex(a, b);
    if (j >= 0) {
      const changed = added ? b[j] : a[j];
      out.push(draft(opts, added ? 'item.added' : 'item.deleted', receiptId, {
        line: j + 1, [added ? 'to' : 'from']: changed.name
      }));
      const keptPrev = added ? a : a.filter((_, i) => i !== j);
      const keptNext = added ? b.filter((_, i) => i !== j) : b;
      keptPrev.forEach((line, k) => {
        const lineNo = added ? (k < j ? k + 1 : k + 2) : k + 1;
        out.push(...diffLineFields(receiptId, line, keptNext[k], lineNo, opts));
      });
      return out;
    }
  }

  // Anything else (several lines at once): count the difference, then compare by position.
  const extra = Math.abs(a.length - b.length);
  for (let i = 0; i < extra; i++) {
    out.push(draft(opts, a.length < b.length ? 'item.added' : 'item.deleted', receiptId));
  }
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) out.push(...diffLineFields(receiptId, a[i], b[i], i + 1, opts));
  return out;
}

/** Remembers what each receipt looked like at the last sync, so the next sync can say what changed. */
export class ChangeTracker {
  private snaps = new Map<string, Snapshot>();

  /** Starts tracking without logging anything. Call after load and migration, so restore never logs "created". */
  seed(receipts: Receipt[]): void {
    this.snaps = new Map(receipts.map((r) => [r.id, snapshotOf(r)]));
  }

  /** Log drafts for everything that changed since the last sync. A no-op sync returns []. */
  sync(receipts: Receipt[], opts: SyncOptions): LogDraft[] {
    const drafts: LogDraft[] = [];
    const seen = new Set<string>();
    for (const r of receipts) {
      seen.add(r.id);
      const next = snapshotOf(r);
      const prev = this.snaps.get(r.id);
      if (!prev) {
        drafts.push(draft(opts, 'receipt.created', r.id, { note: opts.source ?? null }));
      } else {
        drafts.push(...diffReceipt(r.id, prev, next, opts));
      }
      this.snaps.set(r.id, next);
    }
    for (const id of [...this.snaps.keys()]) {
      if (!seen.has(id)) {
        drafts.push(draft(opts, 'receipt.deleted', id, { note: opts.reason ?? null }));
        this.snaps.delete(id);
      }
    }
    return drafts;
  }
}

export interface WorkflowEffects {
  receipts: Receipt[];
  drafts: LogDraft[];
}

const EDIT_ACTIONS: ReadonlySet<LogAction> = new Set<LogAction>(['field.changed', 'item.added', 'item.deleted']);

/**
 * Status rules that follow a sync. Pure: returns the receipts with their statuses set and the log drafts for the changes.
 *  - A new receipt starts as captured, or needs_review when it has an unresolved High flag.
 *  - A captured receipt with an unresolved High flag is escalated to needs_review (never back automatically).
 *  - An approved receipt that was edited loses its approval (needs_review).
 * Exported receipts are never changed here; the glue blocks their edits.
 */
export function applyWorkflowEffects(receipts: Receipt[], drafts: LogDraft[], opts: { at: string; actor: string }): WorkflowEffects {
  const createdIds = new Set(drafts.filter((d) => d.action === 'receipt.created').map((d) => d.receiptId as string));
  const editedIds = new Set(drafts.filter((d) => EDIT_ACTIONS.has(d.action)).map((d) => d.receiptId as string));
  const extra: LogDraft[] = [];

  const updated = receipts.map((r) => {
    if (!r.status && !createdIds.has(r.id)) return r;
    if (createdIds.has(r.id)) {
      return { ...r, status: initialStatus(r), statusAt: opts.at, statusBy: opts.actor };
    }
    const from: ReceiptStatus = r.status as ReceiptStatus;
    if (from === 'captured' && hasUnresolvedHighFlag(r)) {
      extra.push(statusDraft(opts, r.id, from, 'needs_review', 'auto escalation: unresolved High flag'));
      return { ...r, status: 'needs_review' as ReceiptStatus, statusAt: opts.at, statusBy: opts.actor };
    }
    if (editedIds.has(r.id)) {
      const to = statusAfterEdit(from);
      if (to !== from) {
        extra.push(statusDraft(opts, r.id, from, to, 'edited after approval'));
        return { ...r, status: to, statusAt: opts.at, statusBy: opts.actor };
      }
    }
    return r;
  });

  return { receipts: updated, drafts: [...drafts, ...extra] };
}

function statusDraft(opts: { at: string; actor: string }, receiptId: string, from: ReceiptStatus, to: ReceiptStatus, note: string): LogDraft {
  return {
    at: opts.at, actor: opts.actor, action: 'status.changed', receiptId, batchId: null, field: 'status', line: null,
    from, to, note
  };
}
