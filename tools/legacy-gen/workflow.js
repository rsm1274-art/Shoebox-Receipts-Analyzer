// =====================================================================
// REVIEW WORKFLOW: status, approval, accept-with-reason, reopen, export batches, audit log.
//   The rules live in the TypeScript core (ReceiptCore). This file is the browser glue:
//   - every state change is diffed by ChangeTracker, so no mutator has to log anything itself
//   - exported receipts are locked: their editors refuse changes and their inputs are disabled
//   - the audit log is hash-chained (tamper-evident, not tamper-proof) and saved with the session
// =====================================================================
let auditLog = [];
let batches = [];
let actorName = null;              // self-reported name; asked the first time a workflow action needs it
let wfSelectedBatchId = null;
let wfSource = null;               // how a new receipt arrived: upload, camera, scan-folder, drag-drop, sample, undo
let wfReason = null;               // bulk reason for deletions, e.g. 'clear-all'
let wfNamePending = null;          // action waiting for the name prompt
let wfAcceptTarget = null;         // { id, idx } of the flag being accepted
let wfSyncing = false;
const wfTracker = new ReceiptCore.ChangeTracker();

const WF_STATUS = { captured: 'Captured', needs_review: 'Needs review', approved: 'Approved', exported: 'Exported' };
const WF_CHIP = { captured: 'chip-medium', needs_review: 'chip-high', approved: 'chip-ok', exported: 'chip-dark' };

function wfEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function wfIso() { return new Date().toISOString(); }
function wfActor() { return actorName || 'Owner'; }
function wfFind(id) { return receipts.find(r => r.id === id); }
function wfIsLocked(r) { return !!r && r.status === 'exported'; }
function wfTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function wfAppendLog(drafts) {
    if (drafts.length) auditLog = ReceiptCore.appendLogEntries(auditLog, drafts);
}
// Copies the named fields from `updated` onto the live receipt objects, so references held elsewhere stay valid
// (a thumbnail that is still loading must land on the receipt that is shown).
function wfMergeFields(updated, keys) {
    updated.forEach((u, i) => {
        const cur = receipts[i];
        if (!cur || u === cur) return;
        keys.forEach(k => { cur[k] = u[k]; });
    });
}

// ---- Tracking: runs after every state change ------------------------------
function wfSyncChanges() {
    const at = wfIso();
    const drafts = wfTracker.sync(receipts, { at, actor: wfActor(), source: wfSource, reason: wfReason });
    const eff = ReceiptCore.applyWorkflowEffects(receipts, drafts, { at, actor: wfActor() });
    wfMergeFields(eff.receipts, ['status', 'statusAt', 'statusBy']);
    wfAppendLog(eff.drafts);
    return eff.drafts.length > 0;
}
(function wfWireDashboard() {
    const base = window.updateDashboard;
    window.updateDashboard = function (...args) {
        const result = base.apply(this, args);
        if (!wfSyncing) {
            wfSyncing = true;
            try {
                if (wfSyncChanges()) base.apply(this, args);   // draw again with the new statuses (not via this wrapper)
            } finally { wfSyncing = false; }
        }
        wfUpdateKpi();
        wfApplyLockUi();
        if (document.getElementById('qboExportModal') && !document.getElementById('qboExportModal').classList.contains('hidden')) wfRenderBatchPanel();
        return result;
    };
})();

function wfUpdateKpi() {
    const queue = receipts.filter(r => r.status === 'captured' || r.status === 'needs_review').length;
    const ready = receipts.filter(r => r.status === 'approved').length;
    const flagEl = document.getElementById('statAnomalies');
    if (flagEl) flagEl.textContent = queue;
    const subEl = document.getElementById('statReadySub');
    if (subEl) subEl.textContent = `${ready} ready to export`;
}

// Exported receipts: the inspector's inputs and the structural buttons are disabled. The review panel stays live.
function wfApplyLockUi() {
    const box = document.getElementById('inspectorContainer');
    if (!box) return;
    const locked = wfIsLocked(wfFind(selectedReceiptId));
    box.querySelectorAll('input, select, textarea, button[onclick*="addLineItem"], button[onclick*="deleteReceipt"]').forEach(el => {
        if (el.closest('[data-wf-panel]')) return;
        el.disabled = locked;
        el.title = locked ? 'Locked in an export batch. Reopen the receipt to change it.' : (el.title || '');
    });
}
(function wfWireSelect() {
    const base = window.selectReceipt;
    window.selectReceipt = function (...args) {
        const result = base.apply(this, args);
        wfApplyLockUi();
        return result;
    };
})();

// Edits to an exported receipt are refused (toast, and the inputs are redrawn so they show the saved value).
['updateLineItem', 'updateLineItemCategory', 'updateReceiptMetadata', 'updateReceiptField', 'addLineItem',
 'deleteLineItem', 'updateLineQty', 'updateReceiptMerchant', 'updateReceiptDate', 'deleteReceipt'].forEach(name => {
    const base = window[name];
    if (typeof base !== 'function') return;
    window[name] = function (receiptId, ...rest) {
        if (wfIsLocked(wfFind(receiptId))) {
            showToast('This receipt is locked in an export batch. Reopen it to change it.');
            updateDashboard();
            return;
        }
        return base.call(this, receiptId, ...rest);
    };
});

// Tags where a new receipt came from. The tag is read during the sync that creates the receipt.
function wfWithSource(name, source) {
    const base = window[name];
    if (typeof base !== 'function') return;
    window[name] = function (...args) {
        const prev = wfSource;
        wfSource = source;
        let out;
        try { out = base.apply(this, args); } catch (e) { wfSource = prev; throw e; }
        if (out && typeof out.then === 'function') return out.finally(() => { wfSource = prev; });
        wfSource = prev;
        return out;
    };
}
wfWithSource('handleFileUpload', 'upload');
wfWithSource('scanGeneratedSample', 'sample');
wfWithSource('loadAllSamples', 'sample');
wfWithSource('captureCameraFrame', 'camera');
wfWithSource('pollScanFolder', 'scan-folder');

// ---- Status, approval, flags ------------------------------------------------
function wfStatusChip(r) {
    const s = r.status || 'needs_review';
    return `<span class="chip ${WF_CHIP[s]}">${WF_STATUS[s]}</span>`;
}

function wfShow(v) { return v === null || v === undefined || v === '' ? '—' : wfEsc(v); }
function wfDescribe(e) {
    switch (e.action) {
        case 'receipt.created': return `Added (${wfShow(e.note)})`;
        case 'receipt.deleted': return `Deleted${e.note ? ` (${wfEsc(e.note)})` : ''}`;
        case 'field.changed': return `${wfEsc(e.field)}${e.line ? ` on line ${e.line}` : ''}: ${wfShow(e.from)} → ${wfShow(e.to)}${e.note ? ` (${wfEsc(e.note)})` : ''}`;
        case 'item.added': return `Line added: ${wfShow(e.to)}`;
        case 'item.deleted': return `Line deleted: ${wfShow(e.from)}`;
        case 'status.changed': return `Status ${WF_STATUS[e.from] || wfShow(e.from)} → ${WF_STATUS[e.to] || wfShow(e.to)}${e.note ? ` (${wfEsc(e.note)})` : ''}`;
        case 'flag.accepted': return `Flag accepted: ${wfShow(e.to)} — ${wfShow(e.note)}`;
        case 'batch.created': return `Batch ${wfShow(e.batchId)} created (${wfShow(e.note)})`;
        case 'batch.downloaded': return `Downloaded ${wfShow(e.to)} from ${wfShow(e.batchId)}`;
        case 'batch.receipt.reopened': return `Reopened for correction (revision ${wfShow(e.from)} → ${wfShow(e.to)}): ${wfShow(e.note)}`;
        case 'session.migrated': return wfEsc(e.note);
        default: return `${wfEsc(e.action)}${e.note ? `: ${wfEsc(e.note)}` : ''}`;
    }
}

function wfFlagActions(receipt, a) {
    const waiver = ReceiptCore.waiverFor(receipt, a);
    if (waiver) return `<p class="audit-detail" style="font-weight:600">Accepted by ${wfEsc(waiver.by)} on ${wfTime(waiver.at)}: ${wfEsc(waiver.note)}</p>`;
    if (a.severity !== 'high') return '';
    const idx = (receipt.anomalies || []).indexOf(a);
    return `<div style="margin-top:0.4rem"><button class="text-link" data-wf onclick="wfOpenAccept('${receipt.id}', ${idx})">Accept with reason…</button></div>`;
}

function wfPanelHtml(r) {
    const s = r.status || 'needs_review';
    const blockers = s === 'exported' ? [] : ReceiptCore.approvalBlockers(r, coreCtx());
    const history = auditLog.filter(e => e.receiptId === r.id).slice(-25).reverse();
    let action;
    if (s === 'exported') {
        action = `<button class="btn" data-wf onclick="wfOpenReopen('${r.id}')"><span>Reopen for correction…</span></button>`;
    } else if (s === 'approved') {
        action = `<button class="btn btn-ghost" data-wf onclick="wfSendBack('${r.id}')"><span>Send back to review</span></button>`;
    } else {
        action = `<button class="btn" data-wf onclick="wfApprove('${r.id}')"><span>Approve</span></button>`;
    }
    const blockHtml = blockers.length && s !== 'approved' && s !== 'exported'
        ? `<div class="note" style="margin-top:0.6rem"><p class="note-title">Can't approve yet</p><ul class="clearall-list">${blockers.map(b => `<li>${wfEsc(b)}</li>`).join('')}</ul></div>`
        : '';
    const lockHtml = s === 'exported'
        ? `<p class="muted" style="margin-top:0.5rem">Locked in batch <span class="mono">${wfEsc(r.batchId)}</span> on ${wfTime(r.exportedAt)}. Reopen it with a reason to change it.</p>`
        : '';
    const historyHtml = history.length
        ? `<ul class="clearall-list">${history.map(e => `<li><span class="mono">${wfTime(e.at)}</span> ${wfEsc(e.actor)} · ${wfDescribe(e)}</li>`).join('')}</ul>`
        : '<p class="muted">No history yet.</p>';
    return `
                    <div data-wf-panel class="note" style="display:flex;flex-direction:column;gap:0.4rem">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.8rem;flex-wrap:wrap">
                            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
                                <span class="section-label" style="margin:0">Review</span>
                                <span class="chip ${WF_CHIP[s]}">${WF_STATUS[s]}</span>
                                ${r.revision > 0 ? `<span class="chip chip-accent">Correction r${r.revision}</span>` : ''}
                            </div>
                            <div>${action}</div>
                        </div>
                        ${lockHtml}
                        ${blockHtml}
                        <details class="raw-ocr" style="margin-top:0.4rem">
                            <summary><span>History (${history.length})</span></summary>
                            <div style="padding:0.5rem 0">${historyHtml}</div>
                        </details>
                    </div>
                    `;
}

// Actions that record who did them ask for the name once.
function wfEnsureName(then) {
    if (actorName) return then();
    wfNamePending = then;
    wfOpenName();
}
function wfOpenName() {
    document.getElementById('wfNameInput').value = actorName || '';
    document.getElementById('wfNameModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('wfNameInput').focus(), 50);
}
function wfCloseName() {
    document.getElementById('wfNameModal').classList.add('hidden');
    wfNamePending = null;
}
function wfSaveName() {
    const name = document.getElementById('wfNameInput').value.trim();
    if (!name) { showToast('Enter a name'); return; }
    actorName = name;
    const then = wfNamePending;
    wfNamePending = null;
    document.getElementById('wfNameModal').classList.add('hidden');
    scheduleAutosave();
    if (then) then();
    else updateDashboard();
}

function wfApprove(id) {
    wfEnsureName(() => {
        const r = wfFind(id);
        if (!r) return;
        const blockers = ReceiptCore.approvalBlockers(r, coreCtx());
        if (blockers.length) {
            showToast(blockers[0]);
            updateDashboard();
            return;
        }
        wfSetStatus(r, 'approve', null);
    });
}
function wfSendBack(id) {
    wfEnsureName(() => {
        const r = wfFind(id);
        if (r) wfSetStatus(r, 'send_back', null);
    });
}
function wfSetStatus(r, event, note) {
    const from = r.status || 'needs_review';
    const to = ReceiptCore.transition(from, event);
    if (!to) { showToast(`Cannot change this receipt from ${WF_STATUS[from]} that way`); return; }
    const at = wfIso();
    r.status = to;
    r.statusAt = at;
    r.statusBy = wfActor();
    wfAppendLog([{ at, actor: wfActor(), action: 'status.changed', receiptId: r.id, batchId: null, field: 'status', line: null, from, to, note }]);
    updateDashboard();
}

function wfOpenAccept(id, idx) {
    const r = wfFind(id);
    const a = r && (r.anomalies || [])[idx];
    if (!a) return;
    wfEnsureName(() => {
        wfAcceptTarget = { id, idx };
        document.getElementById('wfAcceptTitle').textContent = a.title;
        document.getElementById('wfAcceptDetail').textContent = a.detail;
        document.getElementById('wfAcceptNote').value = '';
        document.getElementById('wfAcceptError').textContent = '';
        document.getElementById('wfAcceptModal').classList.remove('hidden');
        setTimeout(() => document.getElementById('wfAcceptNote').focus(), 50);
    });
}
function wfCloseAccept() {
    document.getElementById('wfAcceptModal').classList.add('hidden');
    wfAcceptTarget = null;
}
function wfConfirmAccept() {
    const r = wfFind(wfAcceptTarget?.id);
    const a = r && (r.anomalies || [])[wfAcceptTarget.idx];
    if (!a) { wfCloseAccept(); return; }
    const res = ReceiptCore.acceptFlag(a, document.getElementById('wfAcceptNote').value, wfActor(), wfIso());
    if (!res.ok) { document.getElementById('wfAcceptError').textContent = res.error; return; }
    r.waivers = [...(r.waivers || []), res.waiver];
    wfAppendLog([{ at: res.waiver.at, actor: wfActor(), action: 'flag.accepted', receiptId: r.id, batchId: null, field: a.code, line: null, from: null, to: a.title, note: res.waiver.note }]);
    wfCloseAccept();
    updateDashboard();
}

function wfOpenReopen(id) {
    const r = wfFind(id);
    if (!r) return;
    wfEnsureName(() => {
        wfReopenTarget = id;
        document.getElementById('wfReopenTitle').textContent = `${r.merchant} · ${r.date} · $${Number(r.total).toFixed(2)}`;
        document.getElementById('wfReopenNote').value = '';
        document.getElementById('wfReopenError').textContent = '';
        document.getElementById('wfReopenModal').classList.remove('hidden');
        setTimeout(() => document.getElementById('wfReopenNote').focus(), 50);
    });
}
let wfReopenTarget = null;
function wfCloseReopen() {
    document.getElementById('wfReopenModal').classList.add('hidden');
    wfReopenTarget = null;
}
function wfConfirmReopen() {
    const r = wfFind(wfReopenTarget);
    if (!r) { wfCloseReopen(); return; }
    const res = ReceiptCore.reopenReceipt(r, document.getElementById('wfReopenNote').value, wfActor(), new Date());
    if (!res.ok) { document.getElementById('wfReopenError').textContent = res.error; return; }
    Object.assign(r, { status: res.receipt.status, statusAt: res.receipt.statusAt, statusBy: res.receipt.statusBy, revision: res.receipt.revision });
    wfAppendLog(res.drafts);
    wfCloseReopen();
    updateDashboard();
}

// ---- Export batches ---------------------------------------------------------
function wfSelectedBatch() { return batches.find(b => b.id === wfSelectedBatchId) || null; }
function wfCurrentBatchId() { return wfSelectedBatchId || undefined; }

// getExportableReceipts() (the download functions) delegates here. Without a selected batch nothing can be exported.
function wfExportList() {
    const b = wfSelectedBatch();
    if (!b) { showToast('Create an export batch first'); return []; }
    return b.receipts;
}
// The live preview shows the approved set before a batch exists, otherwise the selected batch.
function wfPreviewList() {
    const b = wfSelectedBatch();
    return b ? b.receipts : receipts.filter(r => r.status === 'approved');
}

function wfExportCounts() {
    const approved = receipts.filter(r => r.status === 'approved');
    return {
        approved: approved.length,
        approvedTotal: approved.reduce((s, r) => s + (Number(r.total) || 0), 0),
        review: receipts.filter(r => r.status === 'captured' || r.status === 'needs_review').length,
        exported: receipts.filter(r => r.status === 'exported').length
    };
}

function wfCreateBatch() {
    wfEnsureName(() => {
        const res = ReceiptCore.createBatch(receipts, batches, wfActor(), new Date());
        if (!res.ok) { showToast(res.error); return; }
        wfMergeFields(res.receipts, ['status', 'statusAt', 'statusBy', 'batchId', 'exportedAt']);
        batches = res.batches;
        wfAppendLog(res.drafts);
        wfSelectedBatchId = res.batch.id;
        showToast(`Created ${res.batch.id}: ${res.batch.count} receipt${res.batch.count === 1 ? '' : 's'} exported and locked`);
        updateDashboard();
        renderQboModalPreview();
    });
}

function wfSelectBatch(id) {
    wfSelectedBatchId = id;
    renderQboModalPreview();
    wfRenderBatchPanel();
    scheduleAutosave();
}

function wfRecordDownload(format) {
    const b = wfSelectedBatch();
    if (!b) return;
    const at = wfIso();
    b.downloads.push({ format, at });
    wfAppendLog([{ at, actor: wfActor(), action: 'batch.downloaded', receiptId: null, batchId: b.id, field: null, line: null, from: null, to: format, note: null }]);
    scheduleAutosave();
    wfRenderBatchPanel();
}
[['downloadQboBankFeedCSV', 'bank-feed-csv'], ['downloadQboSplitJournalCSV', 'split-csv'], ['downloadQboWebConnectFile', 'qbo-web-connect']]
    .forEach(([name, format]) => {
        const base = window[name];
        if (typeof base !== 'function') return;
        window[name] = function (...args) {
            const out = base.apply(this, args);
            wfRecordDownload(format);
            return out;
        };
    });

(function wfWireExportModal() {
    const base = window.toggleQboExportModal;
    window.toggleQboExportModal = function (...args) {
        const out = base.apply(this, args);
        wfRenderBatchPanel();
        return out;
    };
})();

function wfRenderBatchPanel() {
    const el = document.getElementById('wfBatchPanel');
    if (!el) return;
    const c = wfExportCounts();
    const summary = document.getElementById('wfExportSummary');
    if (summary) summary.textContent = `Ready: ${c.approved} approved ($${c.approvedTotal.toFixed(2)}) · Needs review: ${c.review} not included · Already exported: ${c.exported}`;
    const btn = document.getElementById('wfCreateBatchBtn');
    if (btn) btn.disabled = c.approved === 0;
    const rows = batches.slice().reverse().map(b => `
                        <tr>
                            <td class="mono">${wfEsc(b.id)}</td>
                            <td class="mono">${wfTime(b.at)}</td>
                            <td>${b.count}${b.corrections.length ? ` <span class="chip chip-accent">${b.corrections.length} correction${b.corrections.length === 1 ? '' : 's'}</span>` : ''}</td>
                            <td class="num mono">$${Number(b.total).toFixed(2)}</td>
                            <td class="muted">${b.downloads.length} download${b.downloads.length === 1 ? '' : 's'}</td>
                            <td><button class="text-link" onclick="wfSelectBatch('${b.id}')">${b.id === wfSelectedBatchId ? 'Selected' : 'Select'}</button></td>
                        </tr>`).join('');
    el.innerHTML = `
                <div style="margin-bottom:1rem">
                    <div class="table-head">
                        <h4 class="section-label" style="margin:0">Batch history</h4>
                        <span class="muted">Downloads come from the selected batch. Re-downloads never change.</span>
                    </div>
                    ${batches.length ? `<div style="overflow-x:auto"><table><thead><tr><th>Batch</th><th>Created</th><th>Receipts</th><th class="num">Total</th><th>Downloads</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">No batches yet. Approve receipts, then create an export batch.</p>'}
                </div>`;
}

// ---- Audit log window -------------------------------------------------------
function wfOpenLog() {
    document.getElementById('wfLogModal').classList.remove('hidden');
    document.getElementById('wfLogActor').value = actorName || '';
    wfRenderLog();
    lucide.createIcons();
}
function wfCloseLog() { document.getElementById('wfLogModal').classList.add('hidden'); }
function wfLogFiltered() {
    const q = document.getElementById('wfLogSearch').value.trim().toLowerCase();
    const action = document.getElementById('wfLogAction').value;
    return auditLog.filter(e => {
        if (action !== 'all' && e.action !== action) return false;
        if (!q) return true;
        const r = receipts.find(x => x.id === e.receiptId);
        return [e.receiptId, e.batchId, e.actor, e.note, e.field, r && r.merchant, JSON.stringify(e.from ?? ''), JSON.stringify(e.to ?? '')]
            .some(v => String(v ?? '').toLowerCase().includes(q));
    });
}
function wfRenderLog() {
    const list = wfLogFiltered();
    const shown = list.slice(-500).reverse();
    document.getElementById('wfLogCount').textContent = `${list.length} of ${auditLog.length} entries${list.length > 500 ? ' (showing the latest 500)' : ''}`;
    document.getElementById('wfLogRows').innerHTML = shown.map(e => {
        const r = receipts.find(x => x.id === e.receiptId);
        const rec = e.receiptId ? `${wfEsc(r ? r.merchant : e.receiptId)}` : '';
        return `<tr><td class="mono">${e.seq}</td><td class="mono">${wfTime(e.at)}</td><td>${wfEsc(e.actor)}</td><td class="mono">${wfEsc(e.action)}</td><td>${rec}</td><td class="mono">${wfShow(e.batchId)}</td><td>${wfDescribe(e)}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="muted">No entries match.</td></tr>';
}
function wfVerifyLog() {
    const res = ReceiptCore.verifyLog(auditLog);
    const el = document.getElementById('wfLogVerify');
    el.className = res.ok ? 'chip chip-ok' : 'chip chip-high';
    el.textContent = res.ok
        ? `Integrity OK · ${auditLog.length} entries`
        : `Integrity FAILED at entry ${res.seq}: ${res.reason}`;
}
function wfSaveActor() {
    const name = document.getElementById('wfLogActor').value.trim();
    if (!name) { showToast('Enter a name'); return; }
    actorName = name;
    scheduleAutosave();
    showToast(`Changes will be recorded as "${name}"`);
}
function wfDownloadLog() {
    const cols = ['seq', 'at', 'actor', 'action', 'receiptId', 'batchId', 'field', 'line', 'from', 'to', 'note', 'hash'];
    const cell = v => escapeCsvCell(v === null || v === undefined ? '' : (typeof v === 'object' ? JSON.stringify(v) : v));
    const csv = [cols.join(','), ...auditLog.map(e => cols.map(c => cell(e[c])).join(','))].join('\n');
    triggerBlobDownload(csv, `receipt-audit-log_${new Date().toISOString().slice(0, 10)}.csv`);
}

// ---- Settings and account lists: logged directly (they are not receipt fields) ----
function wfLogSetting(action, note, from = null, to = null) {
    if (!persistReady) return;   // the startup load is not a change
    wfAppendLog([{ at: wfIso(), actor: wfActor(), action, receiptId: null, batchId: null, field: null, line: null, from, to, note }]);
}
(function wfWireSettings() {
    const saveCoa = window.saveCoaToStorage;
    window.saveCoaToStorage = function (...args) {
        const out = saveCoa.apply(this, args);
        wfLogSetting('coa.changed', 'chart of accounts');
        return out;
    };
    const toggle = window.toggleStartupPhaseMode;
    window.toggleStartupPhaseMode = function (...args) {
        const before = startupPhaseMode;
        const out = toggle.apply(this, args);
        if (startupPhaseMode !== before) wfLogSetting('settings.changed', 'CapEx mode', before, startupPhaseMode);
        return out;
    };
    ['addListEntry', 'renameListEntry', 'updatePayMatch', 'toggleListEntryArchive'].forEach(name => {
        const base = window[name];
        if (typeof base !== 'function') return;
        window[name] = function (...args) {
            const out = base.apply(this, args);
            wfLogSetting('lists.changed', `${name} ${args.filter(a => typeof a === 'string').join(' ')}`.trim());
            return out;
        };
    });
})();

// Esc closes whichever workflow dialog is open.
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    for (const [id, close] of [['wfNameModal', wfCloseName], ['wfAcceptModal', wfCloseAccept], ['wfReopenModal', wfCloseReopen], ['wfLogModal', wfCloseLog]]) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) { close(); e.stopImmediatePropagation(); return; }
    }
}, true);
