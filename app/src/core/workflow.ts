// Review workflow rules: receipt status, approval blockers and flag waivers. Pure; the browser glue calls these.
import { getActiveCategories } from './categorize';
import type { Anomaly, CoreContext, Receipt, ReceiptStatus, Waiver } from './types';

export type WorkflowEvent = 'escalate' | 'send_back' | 'approve' | 'edit' | 'export' | 'reopen';

export const STATUSES: readonly ReceiptStatus[] = ['captured', 'needs_review', 'approved', 'exported'];
export const MIN_WAIVER_NOTE_LENGTH = 3;

const TRANSITIONS: Record<ReceiptStatus, Partial<Record<WorkflowEvent, ReceiptStatus>>> = {
  captured: { escalate: 'needs_review', send_back: 'needs_review', approve: 'approved', edit: 'captured' },
  needs_review: { escalate: 'needs_review', send_back: 'needs_review', approve: 'approved', edit: 'needs_review' },
  approved: { escalate: 'needs_review', send_back: 'needs_review', edit: 'needs_review', export: 'exported' },
  exported: { reopen: 'needs_review' }
};

/** The status after `event`, or null when the pair is not allowed (for example, approving an exported receipt). */
export function transition(status: ReceiptStatus, event: WorkflowEvent): ReceiptStatus | null {
  return TRANSITIONS[status][event] ?? null;
}

/** Status for a receipt that has just been captured: needs review at once if it has an unresolved High flag. */
export function initialStatus(receipt: Receipt): ReceiptStatus {
  return hasUnresolvedHighFlag(receipt) ? 'needs_review' : 'captured';
}

/** After a tracked field changes: an approved receipt loses its approval. Other statuses stay put. */
export function statusAfterEdit(status: ReceiptStatus): ReceiptStatus {
  return transition(status, 'edit') ?? status;
}

/** Waiver key: the code plus the title. The title carries the item and amount, so a material change re-raises the flag. */
export function flagKey(anomaly: Pick<Anomaly, 'code' | 'title'>): string {
  return `${anomaly.code}|${anomaly.title}`;
}

export function waiverFor(receipt: Pick<Receipt, 'waivers'>, anomaly: Pick<Anomaly, 'code' | 'title'>): Waiver | undefined {
  const key = flagKey(anomaly);
  return (receipt.waivers || []).find((w) => w.key === key);
}

/** A High flag blocks approval until someone accepts it with a written reason. Medium and low never block. */
export function isFlagResolved(receipt: Pick<Receipt, 'waivers'>, anomaly: Anomaly): boolean {
  return anomaly.severity !== 'high' || waiverFor(receipt, anomaly) !== undefined;
}

export function hasUnresolvedHighFlag(receipt: Receipt): boolean {
  return (receipt.anomalies || []).some((a) => !isFlagResolved(receipt, a));
}

export type AcceptResult = { ok: true; waiver: Waiver } | { ok: false; error: string };

/** Accepts a flag with a written reason. Returns the waiver to store, or why it was refused. */
export function acceptFlag(anomaly: Anomaly, note: string, by: string, at: string): AcceptResult {
  const trimmed = (note || '').trim();
  if (trimmed.length < MIN_WAIVER_NOTE_LENGTH) {
    return { ok: false, error: `Write a reason of at least ${MIN_WAIVER_NOTE_LENGTH} characters.` };
  }
  return { ok: true, waiver: { code: anomaly.code, key: flagKey(anomaly), note: trimmed, by, at } };
}

export function isIsoDate(value: string | undefined | null): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Everything that stops a receipt from being approved. An empty list means it can be approved. */
export function approvalBlockers(receipt: Receipt, ctx: CoreContext): string[] {
  const blockers: string[] = [];
  if (!receipt.merchant || !receipt.merchant.trim()) blockers.push('Merchant is empty.');
  if (!isIsoDate(receipt.date)) blockers.push('Date is not a real YYYY-MM-DD date. Fix it with the date box.');
  if (!ctx.paymentAccounts.some((a) => a.name === receipt.paidFromAccount && !a.archived)) {
    blockers.push('Paid-from account is missing or archived.');
  }
  if (!ctx.fleetClasses.some((c) => c.name === receipt.vanClass && !c.archived)) {
    blockers.push('Van is missing or archived.');
  }
  if (!(Number(receipt.total) > 0)) blockers.push('Total must be greater than zero.');
  const items = receipt.items || [];
  if (items.length === 0) blockers.push('Receipt has no line items.');
  const active = getActiveCategories(ctx);
  items.forEach((item, i) => {
    if (!active.some((c) => c.name === item.category)) {
      blockers.push(`Line ${i + 1} ("${item.name}") is on an inactive or missing account.`);
    }
  });
  for (const a of receipt.anomalies || []) {
    if (!isFlagResolved(receipt, a)) blockers.push(`Unresolved High flag: ${a.title}`);
  }
  return blockers;
}
