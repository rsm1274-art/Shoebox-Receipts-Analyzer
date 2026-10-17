// Save-file migration: schema 1 (no review workflow) -> schema 2 (status, waivers, batches, audit log).
// Additive and idempotent: migrating a schema 2 session again changes nothing.
import { appendLogEntry } from './auditlog';
import type { LogEntry } from './auditlog';
import type { ExportBatch } from './batches';
import type { Receipt } from './types';

export const SESSION_SCHEMA = 2;

export interface SessionLike {
  schema?: number;
  receipts?: Receipt[];
  auditLog?: LogEntry[];
  batches?: ExportBatch[];
  actorName?: string;
  [extra: string]: unknown;
}

export interface SessionV2 extends SessionLike {
  schema: 2;
  receipts: Receipt[];
  auditLog: LogEntry[];
  batches: ExportBatch[];
  actorName: string;
}

/**
 * Upgrades a loaded session to schema 2. Receipts without a status become needs_review: nothing is approved on the
 * user's behalf. An empty log gets one `session.migrated` entry when there are receipts.
 */
export function migrateSession(session: SessionLike, at: string, actor: string): SessionV2 {
  const fromSchema = session.schema ?? 1;
  if (fromSchema > SESSION_SCHEMA) {
    throw new Error(`This file was saved by a newer version (schema ${fromSchema}). Update the app to open it.`);
  }

  let needsReview = 0;
  const receipts = (session.receipts || []).map((r) => {
    const withDefaults: Receipt = {
      ...r,
      waivers: r.waivers ?? [],
      batchId: r.batchId ?? null,
      exportedAt: r.exportedAt ?? null,
      revision: r.revision ?? 0
    };
    if (r.status) return withDefaults;
    needsReview += 1;
    return { ...withDefaults, status: 'needs_review' as const, statusAt: at, statusBy: actor };
  });

  let auditLog: LogEntry[] = [...(session.auditLog || [])];
  if (receipts.length > 0 && auditLog.length === 0) {
    auditLog = appendLogEntry(auditLog, {
      at, actor, action: 'session.migrated', receiptId: null, batchId: null, field: null, line: null,
      from: fromSchema, to: SESSION_SCHEMA,
      note: `Migrated from schema ${fromSchema}; ${needsReview} receipts set to Needs review`
    });
  }

  return {
    ...session,
    schema: SESSION_SCHEMA,
    receipts,
    auditLog,
    batches: session.batches || [],
    actorName: session.actorName || actor
  };
}
