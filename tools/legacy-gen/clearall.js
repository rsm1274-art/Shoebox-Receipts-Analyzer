
// =====================================================================
// CLEAR ALL RECEIPTS (with a warning, typed confirmation and a short-lived undo)
// =====================================================================
let clearedBackup = null;     // { receipts, selectedReceiptId } kept in memory only, until the page closes or a new receipt arrives

function refreshClearButtons() {
    const clearBtn = document.getElementById('btnClearAll');
    const undoBtn = document.getElementById('btnUndoClear');
    if (!clearBtn || !undoBtn) return;
    clearBtn.classList.toggle('hidden', receipts.length === 0);
    if (receipts.length > 0) clearedBackup = null;                    // a new receipt arrived: the undo window closes
    undoBtn.classList.toggle('hidden', !(clearedBackup && receipts.length === 0));
    if (clearedBackup && receipts.length === 0) undoBtn.textContent = `Undo clear (${clearedBackup.receipts.length})`;
}

function openClearAll() {
    if (!receipts.length) return;
    document.getElementById('clearAllCount').textContent = receipts.length;
    const status = document.getElementById('clearAllFileStatus');
    if (fileHandle && fileState === 'ok') {
        status.innerHTML = `Your save file <b>${helpEsc(fileHandle.name)}</b> will be emptied too a few seconds after you confirm. If you have not made an archive copy of it, do that first.`;
    } else if (fileHandle) {
        status.innerHTML = `Your save file <b>${helpEsc(fileHandle.name)}</b> is not connected right now, so it keeps its current contents &mdash; but this browser&rsquo;s copy will be emptied.`;
    } else {
        status.innerHTML = '<b>No save file is linked.</b> The only copy of these receipts is in this browser &mdash; download a backup copy first if you may need them.';
    }
    const input = document.getElementById('clearAllConfirm');
    input.value = '';
    refreshClearAllGo();
    document.getElementById('clearAllModal').classList.remove('hidden');
    lucide.createIcons();
    setTimeout(() => input.focus(), 50);
}
function closeClearAll() { document.getElementById('clearAllModal').classList.add('hidden'); }
function refreshClearAllGo() {
    const ok = document.getElementById('clearAllConfirm').value.trim().toUpperCase() === 'CLEAR';
    document.getElementById('clearAllGo').disabled = !ok;
}
function clearAllReceipts() {
    if (document.getElementById('clearAllConfirm').value.trim().toUpperCase() !== 'CLEAR' || !receipts.length) return;
    const n = receipts.length;
    clearedBackup = { receipts: receipts.slice(), selectedReceiptId };
    receipts = [];
    selectedReceiptId = null;
    closeClearAll();
    wfReason = 'clear-all';                            // every removal is logged with this reason
    updateDashboard();                                 // re-renders, autosaves, and refreshes the buttons
    wfReason = null;
    showToast(`Cleared ${n} receipt${n === 1 ? '' : 's'} — click “Undo clear” in the queue to bring them back`);
}
function undoClearAll() {
    if (!clearedBackup || receipts.length) return;
    receipts = clearedBackup.receipts;
    selectedReceiptId = clearedBackup.selectedReceiptId;
    const n = receipts.length;
    clearedBackup = null;
    wfSource = 'undo';
    updateDashboard();
    wfSource = null;
    showToast(`Restored ${n} receipt${n === 1 ? '' : 's'}`);
}

(function wireClearAll() {
    const original = window.updateDashboard;
    window.updateDashboard = function (...args) {
        const result = original.apply(this, args);
        refreshClearButtons();
        return result;
    };
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !document.getElementById('clearAllModal').classList.contains('hidden')) {
            closeClearAll(); e.stopImmediatePropagation();
        }
    }, true);
    document.getElementById('clearAllModal').addEventListener('mousedown', e => { if (e.target.id === 'clearAllModal') closeClearAll(); });
})();
