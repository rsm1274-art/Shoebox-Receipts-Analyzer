// Export batches: which approved receipts went out together, and reopening an exported receipt for correction.
import type { LogDraft } from './auditlog';
import type { Receipt } from './types';
import { MIN_WAIVER_NOTE_LENGTH, transition } from './workflow';

export interface BatchDownload {
  format: string;
  at: string;
}

/** A frozen record of one export. Re-downloads come from `receipts`, so later edits or reopens never change them. */
export interface ExportBatch {
  id: string;
  at: string;
  actor: string;
  receiptIds: string[];
  count: number;
  total: number;
  downloads: BatchDownload[];
  /** Ids of the receipts in this batch that were reopened and exported again (revision > 0). */
  corrections: string[];
  receipts: Receipt[];
}

const isoDay = (now: Date) => now.toISOString().slice(0, 10);

/** B-YYYYMMDD-n, where n counts the batches already made on that day. */
export function nextBatchId(batches: readonly ExportBatch[], now: Date): string {
  const prefix = `B-${isoDay(now).replace(/-/g, '')}-`;
  const n = batches.filter((b) => b.id.startsWith(prefix)).length + 1;
  return `${prefix}${n}`;
}

/** A deep copy without the image URLs (those are not kept in batches). */
function batchSnapshot(r: Receipt): Receipt {
  const { imageUrl: _image, thumbUrl: _thumb, ...rest } = r as Receipt & { imageUrl?: unknown; thumbUrl?: unknown };
  return JSON.parse(JSON.stringify(rest)) as Receipt;
}

export type CreateBatchResult =
  | { ok: true; batch: ExportBatch; receipts: Receipt[]; batches: ExportBatch[]; drafts: LogDraft[] }
  | { ok: false; error: string };

/**
 * Exports every approved receipt as one batch and locks them (status exported). The batch keeps a snapshot of the
 * receipts; revisions are kept, so reopened receipts export as corrections.
 */
export function createBatch(receipts: Receipt[], batches: ExportBatch[], actor: string, now: Date): CreateBatchResult {
  const approved = receipts.filter((r) => r.status === 'approved');
  if (approved.length === 0) return { ok: false, error: 'No approved receipts to export.' };

  const at = now.toISOString();
  const id = nextBatchId(batches, now);
  const locked = new Map<string, Receipt>();
  for (const r of approved) {
    locked.set(r.id, { ...r, status: 'exported', statusAt: at, statusBy: actor, batchId: id, exportedAt: at });
  }
  const snapshot = approved.map((r) => batchSnapshot(locked.get(r.id) as Receipt));
  const total = Math.round(approved.reduce((sum, r) => sum + (Number(r.total) || 0), 0) * 100) / 100;

  const batch: ExportBatch = {
    id,
    at,
    actor,
    receiptIds: approved.map((r) => r.id),
    count: approved.length,
    total,
    downloads: [],
    corrections: approved.filter((r) => (r.revision || 0) > 0).map((r) => r.id),
    receipts: snapshot
  };

  const drafts: LogDraft[] = [
    { at, actor, action: 'batch.created', receiptId: null, batchId: id, field: null, line: null, from: null, to: null, note: `${batch.count} receipts` },
    ...approved.map<LogDraft>((r) => ({
      at, actor, action: 'status.changed', receiptId: r.id, batchId: id, field: 'status', line: null,
      from: 'approved', to: 'exported', note: null
    }))
  ];

  return {
    ok: true,
    batch,
    receipts: receipts.map((r) => locked.get(r.id) ?? r),
    batches: [...batches, batch],
    drafts
  };
}

export type ReopenResult =
  | { ok: true; receipt: Receipt; drafts: LogDraft[] }
  | { ok: false; error: string };

/**
 * Reopens an exported receipt for correction. The reason is required and logged. The next batch exports it as
 * a correction (revision + 1).
 */
export function reopenReceipt(receipt: Receipt, reason: string, actor: string, now: Date): ReopenResult {
  if (receipt.status !== 'exported') return { ok: false, error: 'Only exported receipts can be reopened.' };
  const note = (reason || '').trim();
  if (note.length < MIN_WAIVER_NOTE_LENGTH) {
    return { ok: false, error: `Write a reason of at least ${MIN_WAIVER_NOTE_LENGTH} characters.` };
  }
  const at = now.toISOString();
  const to = transition('exported', 'reopen');
  if (to === null) return { ok: false, error: 'This receipt cannot be reopened.' };

  const oldRevision = receipt.revision || 0;
  const newRevision = oldRevision + 1;
  const reopened: Receipt = { ...receipt, status: to, statusAt: at, statusBy: actor, revision: newRevision };
  const drafts: LogDraft[] = [
    {
      at, actor, action: 'batch.receipt.reopened', receiptId: receipt.id, batchId: receipt.batchId ?? null,
      field: 'revision', line: null, from: oldRevision, to: newRevision, note
    },
    {
      at, actor, action: 'status.changed', receiptId: receipt.id, batchId: receipt.batchId ?? null, field: 'status',
      line: null, from: 'exported', to, note: 'reopened'
    }
  ];
  return { ok: true, receipt: reopened, drafts };
}
