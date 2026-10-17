// =====================================================================
// SESSION PERSISTENCE
//   Layer 1: autosave to IndexedDB on every change (survives crashes / closed tabs)
//   Layer 2: optional linked save file on disk (Chrome / Edge File System Access API)
//   Receipt photos are NOT stored — only the extracted data. Hard copies are
//   filed by date, so a restored receipt shows where to find the original.
// =====================================================================
const SESSION_APP_ID = 'receipt-audit';
// schema 2 adds paymentAccounts + fleetClasses. Schema-1 files still open (they just keep the built-in lists);
// a schema-2 file is not opened by an older build, which would otherwise silently drop the lists.
const SESSION_SCHEMA = 2;
const SESSION_FILE_NAME = 'receipt-audit-session.json';
const SESSION_FILE_TYPES = [{ description: 'Receipt Audit session', accept: { 'application/json': ['.json'] } }];

let persistReady = false;
let savePending = false;
let saveTimer = null;
let saveChain = Promise.resolve();
let fileHandle = null;
let fileState = 'none';   // 'none' | 'ok' | 'needs-permission' | 'error'
let idbState = 'ok';      // 'ok' | 'error'
let lastSavedAt = null;
let dbPromise = null;

// ---- IndexedDB helpers ------------------------------------------------
function sessionDb() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
            const req = indexedDB.open('receipt_audit', 2);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
                if (!db.objectStoreNames.contains('thumbs')) db.createObjectStore('thumbs');   // one record per receipt, written once
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
}
async function idbGet(key) {
    const db = await sessionDb();
    return new Promise((resolve, reject) => {
        const req = db.transaction('kv').objectStore('kv').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function idbSet(key, value) {
    const db = await sessionDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

async function thumbPut(id, url) {
    const db = await sessionDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('thumbs', 'readwrite');
        tx.objectStore('thumbs').put(url, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
}
async function thumbDelete(id) {
    const db = await sessionDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('thumbs', 'readwrite');
        tx.objectStore('thumbs').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
}
async function thumbGetAll() {
    const db = await sessionDb();
    return new Promise((resolve, reject) => {
        const out = new Map();
        const req = db.transaction('thumbs').objectStore('thumbs').openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { out.set(c.key, c.value); c.continue(); } else resolve(out); };
        req.onerror = () => reject(req.error);
    });
}

// ---- Snapshot (what gets saved) --------------------------------------
function buildSessionSnapshot() {
    return {
        app: SESSION_APP_ID,
        schema: SESSION_SCHEMA,
        savedAt: new Date().toISOString(),
        startupPhaseMode,
        selectedReceiptId,
        coaAccounts,
        paymentAccounts: paymentAccountList,
        fleetClasses: fleetClassList,
        actorName,
        auditLog,
        batches,
        receipts: receipts.map(({ imageUrl, thumbUrl, ...rest }) => rest)   // full photos are never persisted; thumbnails are stored separately
    };
}
// The save file = readable snapshot + one "thumbs" map {receiptId: dataUrl}. The big thumbs text is cached
// and only rebuilt when the set of thumbnails changes, so ordinary edits stay cheap.
let thumbsJsonCache = { sig: '', json: '{}' };
function thumbsJson() {
    const withThumb = receipts.filter(r => r.thumbUrl);
    const sig = withThumb.map(r => r.id + ':' + r.thumbUrl.length).join('|');
    if (sig !== thumbsJsonCache.sig) {
        const o = {};
        withThumb.forEach(r => { o[r.id] = r.thumbUrl; });
        thumbsJsonCache = { sig, json: JSON.stringify(o) };
    }
    return thumbsJsonCache.json;
}
function serializeSession(snap, withThumbs) {
    const base = JSON.stringify(snap, null, 2);               // always ends with a newline + closing brace
    return withThumbs ? base.slice(0, -2) + ',\n  "thumbs": ' + thumbsJson() + '\n}' : base;
}
const thumbsInIdb = new Set();
let thumbsKnown = false;
async function hydrateThumbs(inlineMap) {
    let stored = new Map();
    try { stored = await thumbGetAll(); } catch (e) { /* storage unavailable: file copies only */ }
    receipts.forEach(r => { r.thumbUrl = (inlineMap && inlineMap[r.id]) || stored.get(r.id) || null; });
    stored.forEach((_, id) => thumbsInIdb.add(id));
    thumbsKnown = true;
}
async function syncThumbStore() {
    if (!thumbsKnown) {
        try { (await thumbGetAll()).forEach((_, id) => thumbsInIdb.add(id)); thumbsKnown = true; } catch (e) { return; }
    }
    for (const r of receipts) {
        if (r.thumbUrl && !thumbsInIdb.has(r.id)) { await thumbPut(r.id, r.thumbUrl); thumbsInIdb.add(r.id); }
    }
    const live = new Set(receipts.map(r => r.id));
    for (const id of [...thumbsInIdb]) {
        if (!live.has(id)) { await thumbDelete(id); thumbsInIdb.delete(id); }
    }
}
function validateSession(s) {
    return !!s && s.app === SESSION_APP_ID && Number(s.schema) <= SESSION_SCHEMA
        && Array.isArray(s.receipts) && Array.isArray(s.coaAccounts);
}
function syncCapexToggleUi() {
    document.getElementById('btnStartupPhase').classList.toggle('active', startupPhaseMode);
    document.getElementById('startupModeLabel').textContent =
        startupPhaseMode ? 'CapEx Mode: ON' : 'CapEx Mode: OFF (Year 2+)';
}
async function applySession(s) {
    // Older files (no review workflow yet) get every receipt set to Needs review and a migration entry in the log.
    const m = ReceiptCore.migrateSession(s, new Date().toISOString(), 'Owner');
    coaAccounts = m.coaAccounts;
    loadManagedLists(m);
    receipts = m.receipts.map(r => ({ ...r, imageUrl: null, thumbUrl: null }));
    await hydrateThumbs(s.thumbs);
    auditLog = m.auditLog;
    batches = m.batches;
    actorName = s.actorName || null;
    wfSelectedBatchId = batches.length ? batches[batches.length - 1].id : null;
    wfTracker.seed(receipts);          // restoring must not log every receipt as "created"
    selectedReceiptId = receipts.some(r => r.id === s.selectedReceiptId) ? s.selectedReceiptId : (receipts[0]?.id || null);
    startupPhaseMode = s.startupPhaseMode !== false;
    syncCapexToggleUi();
    updateDashboard();
}

// ---- Writing ----------------------------------------------------------
let fileDirty = false, fileTimer = null, fileFirstDirtyAt = 0, lastFileBytes = 0;
const FILE_IDLE_MS = 4000;        // wait for a quiet moment before rewriting the file (kinder to OneDrive and similar sync tools)
const FILE_MAX_WAIT_MS = 30000;   // ...but never let the file lag by more than this

async function writeSessionFile(handle, text) {
    const w = await handle.createWritable();
    try { await w.write(text); } finally { await w.close(); }
}
function queueFileWrite() {
    fileDirty = true;
    if (!fileFirstDirtyAt) fileFirstDirtyAt = Date.now();
    clearTimeout(fileTimer);
    const wait = Date.now() - fileFirstDirtyAt >= FILE_MAX_WAIT_MS ? 0 : FILE_IDLE_MS;
    fileTimer = setTimeout(() => { saveChain = saveChain.then(flushFile).catch(e => console.warn(e)); }, wait);
}
async function flushFile() {
    clearTimeout(fileTimer); fileTimer = null;
    if (!fileDirty || !fileHandle || fileState !== 'ok') return;
    fileDirty = false; fileFirstDirtyAt = 0;
    const text = serializeSession(buildSessionSnapshot(), true);
    try { await writeSessionFile(fileHandle, text); lastFileBytes = text.length; }
    catch (e) {
        console.warn('Save file write failed:', e);
        fileDirty = true;
        fileState = e && e.name === 'NotAllowedError' ? 'needs-permission' : 'error';
    }
    renderSaveStatus();
}
async function persistNow(force) {
    const snap = buildSessionSnapshot();
    try { await idbSet('session', snap); await syncThumbStore(); idbState = 'ok'; }
    catch (e) { idbState = 'error'; console.warn('Browser autosave failed:', e); }
    lastSavedAt = new Date(snap.savedAt);
    if (fileHandle && fileState === 'ok') {
        fileDirty = true;
        if (force) await flushFile(); else queueFileWrite();
    }
    savePending = false;
    renderSaveStatus();
}
function runAutosave(force) {
    clearTimeout(saveTimer);
    saveChain = saveChain.then(() => persistNow(force)).catch(e => console.warn(e));
    return saveChain;
}
function scheduleAutosave() {
    if (!persistReady) return;
    savePending = true;
    clearTimeout(saveTimer);
    renderSaveStatus();
    saveTimer = setTimeout(() => runAutosave(false), 500);
}
function flushAutosave() { return runAutosave(true); }   // immediate, includes the save file (manual save, link, open, closing)

// ---- Status chip ------------------------------------------------------
function renderSaveStatus() {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    const t = lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    let cls = 'chip-medium', text, tip;
    if (savePending) {
        text = 'Saving…'; tip = 'Changes are being saved';
    } else if (fileState === 'needs-permission') {
        cls = 'chip-high'; text = 'Reconnect save file';
        tip = 'The browser needs your OK to write to the linked save file again. Click to reconnect.';
    } else if (fileState === 'error') {
        cls = 'chip-high'; text = 'Save file error — relink';
        tip = 'The linked save file could not be written (moved, deleted or locked). Click to choose a file.';
    } else if (idbState === 'error' && fileState !== 'ok') {
        cls = 'chip-high'; text = 'Not saved — link a save file';
        tip = 'Browser storage is unavailable. Link a save file so your work is kept.';
    } else if (fileState === 'ok' && fileHandle) {
        const mb = lastFileBytes ? ` File size about ${(lastFileBytes / 1048576).toFixed(1)} MB.` : '';
        if (fileDirty) { cls = 'chip-medium'; text = `Saved ${t} · updating file…`; tip = 'Saved in the browser; the save file is rewritten a few seconds after you stop making changes.' + mb; }
        else { cls = 'chip-ok'; text = `Saved ${t} · ${fileHandle.name}`; tip = 'Autosaving to the browser and to your save file. Click to save now.' + mb; }
    } else {
        text = `Saved in browser ${t} · link a file`;
        tip = 'Autosaved in this browser only. Click to link a save file on disk as a second copy.';
    }
    el.className = 'chip ' + cls;
    el.textContent = text;
    el.title = tip;
}
function onSaveStatusClick() {
    if (fileState === 'needs-permission') return reconnectSaveFile();
    if (!fileHandle || fileState === 'error') return linkSaveFile();
    flushAutosave().then(() => showToast('Session saved'));
}

// ---- Save file linking / opening ---------------------------------------
async function linkSaveFile() {
    if (!window.showSaveFilePicker) { downloadSessionBackup(); return; }
    try {
        const handle = await window.showSaveFilePicker({ suggestedName: SESSION_FILE_NAME, types: SESSION_FILE_TYPES });
        fileHandle = handle; fileState = 'ok';
        await idbSet('fileHandle', handle).catch(() => {});
        await flushAutosave();
        showToast(`Autosaving to "${handle.name}"`);
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.error(e); showToast('Could not link save file: ' + e.message);
    }
}
function downloadSessionBackup() {
    const stamp = new Date().toISOString().slice(0, 10);
    triggerBlobDownload(serializeSession(buildSessionSnapshot(), true), `receipt-audit-session_${stamp}.json`, 'application/json');
    showToast('Downloaded session backup');
}
function pickSessionTextViaInput() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json,application/json';
        input.onchange = async () => {
            const f = input.files && input.files[0];
            if (!f) return reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
            resolve(await f.text());
        };
        input.click();
    });
}
async function openSessionFile() {
    if (receipts.length && !confirm('Open a saved session? This replaces the receipts and accounts currently loaded.')) return;
    try {
        let handle = null, text;
        if (window.showOpenFilePicker) {
            [handle] = await window.showOpenFilePicker({ types: SESSION_FILE_TYPES });
            const perm = await handle.requestPermission({ mode: 'readwrite' });   // ask while the click is fresh
            text = await (await handle.getFile()).text();
            if (perm !== 'granted') handle = null;
        } else {
            text = await pickSessionTextViaInput();
        }
        const s = JSON.parse(text);
        if (!validateSession(s)) throw new Error('not a Receipt Audit session file');
        await applySession(s);
        if (handle) { fileHandle = handle; fileState = 'ok'; await idbSet('fileHandle', handle).catch(() => {}); }
        await flushAutosave();
        showToast(`Opened ${receipts.length} receipt${receipts.length === 1 ? '' : 's'}${handle ? ` — now autosaving to "${handle.name}"` : ''}`);
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.error(e); showToast('Could not open session: ' + e.message);
    }
}
async function reconnectSaveFile() {
    try {
        const perm = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') return showToast('Permission not granted — still saving in the browser only');
        fileState = 'ok';
        // If the file was updated elsewhere since this session loaded, offer to take it instead of overwriting it.
        try {
            const fs = JSON.parse(await (await fileHandle.getFile()).text());
            if (validateSession(fs) && (!lastSavedAt || fs.savedAt > lastSavedAt.toISOString())
                && confirm('The save file is newer than this session. Load the save file? (Cancel keeps this session and overwrites the file.)')) {
                await applySession(fs);
            }
        } catch (e) { /* unreadable/empty file — it will simply be rewritten */ }
        await flushAutosave();
        showToast('Save file reconnected');
    } catch (e) {
        console.error(e); fileState = 'error'; renderSaveStatus(); showToast('Could not reconnect: ' + e.message);
    }
}

// ---- Restore on startup --------------------------------------------------
async function restoreSession() {
    let snap = null;
    try {
        const stored = await idbGet('session');
        if (validateSession(stored)) snap = stored;
        fileHandle = (await idbGet('fileHandle')) || null;
    } catch (e) { idbState = 'error'; console.warn('Browser storage unavailable:', e); }
    if (fileHandle) {
        try {
            if ((await fileHandle.queryPermission({ mode: 'readwrite' })) === 'granted') {
                const fs = JSON.parse(await (await fileHandle.getFile()).text());
                if (validateSession(fs) && (!snap || fs.savedAt > snap.savedAt)) snap = fs;
                fileState = 'ok';
            } else {
                fileState = 'needs-permission';
            }
        } catch (e) { console.warn('Save file unreadable:', e); fileState = 'error'; }
    }
    if (!snap) return false;
    await applySession(snap);
    lastSavedAt = new Date(snap.savedAt);
    return true;
}

// ---- Hooks: autosave after every state change ------------------------------
['updateDashboard', 'saveCoaToStorage', 'selectReceipt', 'toggleStartupPhaseMode'].forEach(name => {
    const original = window[name];
    window[name] = function (...args) {
        const result = original.apply(this, args);
        scheduleAutosave();
        return result;
    };
});
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && (savePending || fileDirty)) flushAutosave();
});
window.addEventListener('beforeunload', e => {
    if (fileDirty && !savePending) flushAutosave();
    if (savePending) { flushAutosave(); e.preventDefault(); e.returnValue = ''; }
});

// Start with the 4 Fleet & CapEx sample receipts only on the very first launch;
// afterwards the last session is restored.
async function initSession() {
    lucide.createIcons();
    document.getElementById('topbar').classList.add('loaded');
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const restored = await restoreSession();
    if (!restored) loadAllSamples(true);
    persistReady = true;
    await flushAutosave();
    restoreScanFolder();
    if (restored) showToast(`Restored ${receipts.length} receipt${receipts.length === 1 ? '' : 's'} from your last session`);
}
// DOMContentLoaded (not window.onload) so slow CDN fonts/scripts can't delay restoring your work.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSession);
else initSession();
