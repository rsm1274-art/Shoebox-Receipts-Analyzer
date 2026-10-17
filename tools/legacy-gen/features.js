// =====================================================================
// EDITING FEATURES
//   - receipt header: merchant + date    - line items: quantity + delete
//   - QBO accounts: rename + keywords    - Paid From accounts / Fleet classes: add / rename / archive
//   Functions that share a name with one in the original script deliberately override it
//   (the later declaration wins).
// =====================================================================
function fxEsc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fxFindReceipt(id) { return receipts.find(r => r.id === id); }

// ---- managed lists: Paid From accounts and Fleet / Van classes ----------------------------
// Each entry: { name, archived, match? }. `match` (Paid From only) lists words or last-4 digits
// that identify the account in OCR payment text (e.g. "4921", "amex").
const PAYMENT_MATCH_DEFAULTS = [['4921'], ['1004', 'amex'], ['8832', 'mastercard'], ['personal', '0091'], ['cash']];
let paymentAccountList = QBO_PAYMENT_ACCOUNTS.map((name, i) => ({ name, archived: false, match: PAYMENT_MATCH_DEFAULTS[i] || [] }));
let fleetClassList = QBO_FLEET_CLASSES.map(name => ({ name, archived: false }));

function syncManagedLists() {
    QBO_PAYMENT_ACCOUNTS = paymentAccountList.filter(a => !a.archived).map(a => a.name);
    QBO_FLEET_CLASSES = fleetClassList.filter(c => !c.archived).map(c => c.name);
}
function loadManagedLists(s) {
    const clean = (list, withMatch) => list.filter(e => e && typeof e.name === 'string' && e.name.trim()).map(e => {
        const o = { name: e.name, archived: !!e.archived };
        if (withMatch) o.match = Array.isArray(e.match) ? e.match.map(String) : [];
        return o;
    });
    const pay = Array.isArray(s.paymentAccounts) ? clean(s.paymentAccounts, true) : [];
    const fleet = Array.isArray(s.fleetClasses) ? clean(s.fleetClasses, false) : [];
    // sessions saved before these lists were editable (schema 1) carry no lists: keep the built-in ones
    if (pay.length) paymentAccountList = pay;
    if (fleet.length) fleetClassList = fleet;
    syncManagedLists();
}
function defaultFleetClass() {
    return (fleetClassList.find(c => !c.archived) || fleetClassList[0] || { name: 'Van #1 - Ford Transit 250' }).name;
}
// Overrides the original: match by each active account's words, first hit in list order wins.
function mapPaymentMethodToQboAccount(paymentStr = '') {
    const upper = String(paymentStr).toUpperCase();
    const active = paymentAccountList.filter(a => !a.archived);
    for (const a of active) {
        if ((a.match || []).some(m => m && upper.includes(String(m).toUpperCase()))) return a.name;
    }
    return (active[0] || paymentAccountList[0] || { name: 'Chase Ink Business Visa (*4921)' }).name;
}
// Names for a receipt's <select>: active entries, plus the receipt's current value if it was archived/renamed away.
function listChoices(list, current) {
    const names = list.filter(e => !e.archived).map(e => e.name);
    if (current && !names.includes(current)) names.push(current);
    return names;
}
function listArchivedSuffix(list, name) {
    const e = list.find(x => x.name === name);
    return !e ? ' (not in list)' : (e.archived ? ' (Archived)' : '');
}

function parseMatchWords(text) {
    return String(text || '').split(',').map(w => w.trim()).filter(Boolean);
}
function listKind(kind) {
    return kind === 'pay'
        ? { list: paymentAccountList, field: 'paidFromAccount', label: 'Paid From account' }
        : { list: fleetClassList, field: 'vanClass', label: 'fleet class' };
}
function addListEntry(kind) {
    const k = listKind(kind);
    const nameEl = document.getElementById(kind === 'pay' ? 'newPayName' : 'newFleetName');
    const name = nameEl.value.trim();
    if (!name) return;
    if (k.list.some(e => e.name.toLowerCase() === name.toLowerCase())) return showToast(`A ${k.label} named "${name}" already exists`);
    const entry = { name, archived: false };
    if (kind === 'pay') entry.match = parseMatchWords(document.getElementById('newPayMatch').value);
    k.list.push(entry);
    nameEl.value = '';
    if (kind === 'pay') document.getElementById('newPayMatch').value = '';
    syncManagedLists();
    updateDashboard();
    renderCoaManagerList();
    showToast(`Added ${k.label}: "${name}"`);
}
function renameListEntry(kind, idx, value) {
    const k = listKind(kind);
    const entry = k.list[idx];
    const name = String(value || '').trim();
    if (!entry || name === entry.name) return renderCoaManagerList();
    if (!name) { showToast('Name cannot be empty'); return renderCoaManagerList(); }
    if (k.list.some((e, i) => i !== idx && e.name.toLowerCase() === name.toLowerCase())) {
        showToast(`A ${k.label} named "${name}" already exists`); return renderCoaManagerList();
    }
    const old = entry.name;
    entry.name = name;
    let moved = 0;
    receipts.forEach(r => { if (r[k.field] === old) { r[k.field] = name; moved++; } });
    syncManagedLists();
    updateDashboard();
    renderCoaManagerList();
    showToast(`Renamed "${old}" to "${name}"${moved ? ` (${moved} receipt${moved === 1 ? '' : 's'} updated)` : ''}`);
}
function updatePayMatch(idx, value) {
    const entry = paymentAccountList[idx];
    if (!entry) return;
    entry.match = parseMatchWords(value);
    syncManagedLists();
    updateDashboard();
    renderCoaManagerList();
}
function toggleListEntryArchive(kind, idx) {
    const k = listKind(kind);
    const entry = k.list[idx];
    if (!entry) return;
    if (!entry.archived && k.list.filter(e => !e.archived).length <= 1) {
        return showToast(`Keep at least one active ${k.label}`);
    }
    entry.archived = !entry.archived;
    syncManagedLists();
    updateDashboard();
    renderCoaManagerList();
}

// ---- receipt header: merchant + date -----------------------------------------------------
function updateReceiptMerchant(receiptId, value) {
    const r = fxFindReceipt(receiptId);
    if (!r) return;
    const merchant = String(value || '').replace(/[<>]/g, '').replace(/"/g, "'").trim();
    if (!merchant) { showToast('Merchant name cannot be empty'); return renderInspector(); }
    if (merchant === r.merchant) return renderInspector();
    r.merchant = merchant;
    auditAndCategorizeReceipt(r);
    updateDashboard();
}
function updateReceiptDate(receiptId, value) {
    const r = fxFindReceipt(receiptId);
    if (!r) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || isNaN(Date.parse(value))) {
        showToast('Pick a valid date'); return renderInspector();
    }
    if (value === r.date) return renderInspector();
    r.date = value;
    auditAndCategorizeReceipt(r);
    updateDashboard();
}

// ---- line items: quantity + delete --------------------------------------------------------
function updateLineQty(receiptId, itemIdx, value) {
    const r = fxFindReceipt(receiptId);
    if (!r || !r.items[itemIdx]) return;
    const qty = parseFloat(value);
    if (!isFinite(qty) || qty < 0) { showToast('Quantity must be 0 or more'); return renderInspector(); }
    r.items[itemIdx].qty = qty;
    auditAndCategorizeReceipt(r);
    updateDashboard();
}
function deleteLineItem(receiptId, itemIdx) {
    const r = fxFindReceipt(receiptId);
    if (!r || !r.items[itemIdx]) return;
    const it = r.items[itemIdx];
    if (!confirm(`Delete the line "${it.name}" ($${(Number(it.price) * Number(it.qty ?? 1)).toFixed(2)}) from this receipt?`)) return;
    r.items.splice(itemIdx, 1);
    auditAndCategorizeReceipt(r);
    updateDashboard();
    showToast('Line deleted — check Subtotal and Printed Total still match the paper');
}

// ---- QBO accounts: rename + keywords ---------------------------------------------------------
// Keywords are shown comma-separated. A word wrapped in "double quotes" keeps its spaces
// (the built-in 'def ' needs its trailing space so it does not match "default").
function keywordsToText(kws) {
    return (kws || []).map(k => (k !== k.trim() || k.includes(',')) ? `"${k}"` : k).join(', ');
}
function textToKeywords(text) {
    return String(text || '').split(',').map(p => {
        const t = p.trim();
        const q = t.match(/^"(.*)"$/);
        return q ? q[1].toLowerCase() : t.toLowerCase();
    }).filter(k => k.trim());
}
function renameCoaAccount(id, value) {
    const acc = coaAccounts.find(c => c.id === id);
    const name = String(value || '').trim();
    if (!acc || name === acc.name) return renderCoaManagerList();
    if (!name) { showToast('Account name cannot be empty'); return renderCoaManagerList(); }
    if (coaAccounts.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
        showToast(`An account named "${name}" already exists`); return renderCoaManagerList();
    }
    const old = acc.name;
    acc.name = name;
    let touched = 0;
    receipts.forEach(r => {
        let hit = false;
        (r.items || []).forEach(it => { if (it.category === old) { it.category = name; hit = true; } });
        if (hit) { auditAndCategorizeReceipt(r); touched++; }   // rebuilds splits so exports carry the new name
    });
    saveCoaToStorage();
    updateDashboard();
    renderCoaManagerList();
    showToast(`Renamed "${old}" to "${name}"${touched ? ` — ${touched} receipt${touched === 1 ? '' : 's'} updated` : ''}`);
}
function updateCoaKeywords(id, value) {
    const acc = coaAccounts.find(c => c.id === id);
    if (!acc) return;
    const kws = textToKeywords(value);
    if (JSON.stringify(kws) === JSON.stringify(acc.keywords || [])) return renderCoaManagerList();
    acc.keywords = kws;
    saveCoaToStorage();
    renderCoaManagerList();
    if (receipts.length && confirm(`Keywords saved for "${acc.name}".\n\nRe-check the ${receipts.length} receipt${receipts.length === 1 ? '' : 's'} already in the queue against the new keywords?\nLines whose account you picked by hand are never changed.\n\nOK = re-check now. Cancel = new keywords apply to new receipts and to lines you edit later.`)) {
        receipts.forEach(auditAndCategorizeReceipt);
        updateDashboard();
        showToast('Existing receipts re-checked');
    } else {
        showToast(`Keywords saved for "${acc.name}"`);
    }
}

// Overrides the original manager list: editable names/keywords + Paid From + Fleet class sections.
function renderCoaManagerList() {
    const container = document.getElementById('coaManagerList');
    if (!container) return;
    const row = 'display:flex;align-items:center;gap:0.6rem;padding:0.45rem 0;border-bottom:1px solid #ddd;flex-wrap:wrap';
    const arch = (a) => a ? 'text-decoration:line-through;color:var(--grey)' : '';
    const archBtn = (onclick, archived) =>
        `<button onclick="${onclick}" class="btn btn-ghost" style="padding:0.35rem 0.65rem;font-size:10px">${archived ? 'Restore' : 'Archive'}</button>`;
    const coaSection = (tierKey, title) => `
        <div class="note">
            <p class="note-title">${title}</p>
            <div style="display:flex;flex-direction:column;margin-top:0.4rem">
                ${coaAccounts.filter(c => c.tier === tierKey).map(acc => `
                    <div style="${row}">
                        <span class="chip ${acc.tier === 'startup' ? 'chip-accent' : 'chip-ok'}">${acc.tier === 'startup' ? 'capex' : 'operating'}</span>
                        <input class="input" type="text" value="${fxEsc(acc.name)}" aria-label="Account name" title="Account name sent to QuickBooks. Renaming also updates existing receipts."
                            style="flex:1.4;min-width:240px;font-weight:700;${arch(acc.archived)}" onchange="renameCoaAccount('${acc.id}', this.value)">
                        <input class="input mono" type="text" value="${fxEsc(keywordsToText(acc.keywords))}" aria-label="Keywords" placeholder="keywords, comma-separated"
                            title="Words that auto-file a line here. Put a word in &quot;quotes&quot; to keep its spaces." style="flex:2;min-width:260px" onchange="updateCoaKeywords('${acc.id}', this.value)">
                        ${archBtn(`toggleArchiveCoa('${acc.id}')`, acc.archived)}
                    </div>`).join('')}
            </div>
        </div>`;
    const payRows = paymentAccountList.map((a, i) => `
        <div style="${row}">
            <input class="input" type="text" value="${fxEsc(a.name)}" aria-label="Paid From account name" style="flex:1.4;min-width:240px;font-weight:700;${arch(a.archived)}"
                onchange="renameListEntry('pay', ${i}, this.value)">
            <input class="input mono" type="text" value="${fxEsc((a.match || []).join(', '))}" aria-label="Card words" placeholder="e.g. 4921, amex"
                title="Words or last-4 digits that identify this account in the payment text read from a receipt" style="flex:2;min-width:260px" onchange="updatePayMatch(${i}, this.value)">
            ${archBtn(`toggleListEntryArchive('pay', ${i})`, a.archived)}
        </div>`).join('');
    const fleetRows = fleetClassList.map((c, i) => `
        <div style="${row}">
            <input class="input" type="text" value="${fxEsc(c.name)}" aria-label="Fleet class name" style="flex:1;min-width:300px;font-weight:700;${arch(c.archived)}"
                onchange="renameListEntry('fleet', ${i}, this.value)">
            ${archBtn(`toggleListEntryArchive('fleet', ${i})`, c.archived)}
        </div>`).join('');

    container.innerHTML =
        coaSection('operating', 'Tier 1: Core Fleet Operating Accounts (Permanent)') +
        coaSection('startup', 'Tier 2: CapEx, Upfitting & Launch Accounts (Archivable after Launch)') + `
        <div class="note" id="coaPaySection">
            <p class="note-title">Paid From accounts (cards &amp; bank accounts)</p>
            <p class="muted">The words decide which account a scanned receipt starts in (first match in list order; otherwise the first active account). Receipts already using an archived account keep it.</p>
            <div style="display:flex;flex-direction:column;margin-top:0.4rem">${payRows}</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:0.7rem">
                <input id="newPayName" type="text" placeholder="New account, e.g. Capital One Spark (*7712)" class="input" style="flex:1;min-width:240px">
                <input id="newPayMatch" type="text" placeholder="Words, e.g. 7712" class="input" style="width:170px">
                <button onclick="addListEntry('pay')" class="btn"><i data-lucide="plus" style="width:14px;height:14px"></i> Add</button>
            </div>
        </div>
        <div class="note" id="coaFleetSection">
            <p class="note-title">Fleet / Van classes</p>
            <div style="display:flex;flex-direction:column;margin-top:0.4rem">${fleetRows}</div>
            <div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:0.7rem">
                <input id="newFleetName" type="text" placeholder="New class, e.g. Van #4 - Ford E-Transit" class="input" style="flex:1;min-width:240px">
                <button onclick="addListEntry('fleet')" class="btn"><i data-lucide="plus" style="width:14px;height:14px"></i> Add</button>
            </div>
        </div>`;
    if (window.lucide) lucide.createIcons();
}
