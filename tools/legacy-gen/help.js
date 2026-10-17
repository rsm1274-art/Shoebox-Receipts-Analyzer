
// =====================================================================
// HELP & MANUAL (interactive): search, detail levels, live widgets,
// "Show me" spotlights and a guided tour. Reads app state, never changes it
// (except selecting a receipt so the Inspector can be highlighted).
// =====================================================================
let helpLast = 'help-start';
let helpTocBuilt = false;
let tour = null;     // { steps, i, single }

const helpEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const helpStore = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked — fine */ } }
};

// ---- open / close -----------------------------------------------------------
function openHelp(sectionId) {
    const modal = document.getElementById('helpModal');
    modal.classList.remove('hidden');
    setHelpLevel(helpStore.get('ra_help_level', 'novice'), true);
    if (!helpTocBuilt) buildHelpToc();
    renderHelpLive();
    lucide.createIcons();
    const id = sectionId || helpLast || 'help-start';
    // wait a frame so the modal has layout before scrolling
    requestAnimationFrame(() => helpGo(id, true));
}
function closeHelp() {
    document.getElementById('helpModal').classList.add('hidden');
}
function isHelpOpen() { return !document.getElementById('helpModal').classList.contains('hidden'); }

function buildHelpToc() {
    const toc = document.getElementById('helpToc');
    const secs = [...document.querySelectorAll('#helpContent .help-sec')];
    toc.innerHTML = secs.map((s, i) => `<button data-target="${s.id}" class="${s.classList.contains('lvl-cpa') ? 'lvl-cpa' : ''}" onclick="helpGo('${s.id}')"><span class="toc-n">${i + 1}</span><span>${s.dataset.title}</span></button>`).join('');
    document.getElementById('helpContent').addEventListener('scroll', helpSpy, { passive: true });
    helpTocBuilt = true;
}
function helpSpy() {
    const content = document.getElementById('helpContent');
    const y = content.getBoundingClientRect().top + 90;
    let current = null;
    document.querySelectorAll('#helpContent .help-sec').forEach(s => {
        if (s.offsetParent !== null && s.getBoundingClientRect().top <= y) current = s.id;
    });
    if (!current) return;
    helpLast = current;
    document.querySelectorAll('#helpToc button').forEach(b => b.classList.toggle('active', b.dataset.target === current));
}
function helpGo(id, instant) {
    const el = document.getElementById(id);
    if (!el || el.offsetParent === null) return;
    const content = document.getElementById('helpContent');
    if (instant) content.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: 'start' });
    if (instant) setTimeout(() => { content.style.scrollBehavior = ''; }, 50);
    helpSpy();
    if (!el.classList.contains('help-sec')) { el.classList.add('help-hit'); setTimeout(() => el.classList.remove('help-hit'), 1600); }
}

// ---- detail level ------------------------------------------------------------------
function setHelpLevel(level, silent) {
    if (!['novice', 'standard', 'cpa'].includes(level)) level = 'novice';
    document.getElementById('helpModal').dataset.level = level;
    document.querySelectorAll('#helpLevel .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.level === level));
    helpStore.set('ra_help_level', level);
    if (!silent) helpSpy();
}

// ---- search --------------------------------------------------------------------------
function helpSearch(raw) {
    const q = raw.trim().toLowerCase();
    const modal = document.getElementById('helpModal');
    const status = document.getElementById('helpSearchStatus');
    modal.classList.toggle('help-all', !!q);
    const secs = [...document.querySelectorAll('#helpContent .help-sec')];
    if (!q) {
        secs.forEach(s => { s.classList.remove('help-nohit'); s.querySelectorAll('.hb').forEach(h => h.classList.remove('help-nohit')); });
        status.classList.add('hidden');
        return;
    }
    const tokens = q.split(/\s+/);
    let total = 0;
    secs.forEach(s => {
        const titleHit = tokens.every(t => s.dataset.title.toLowerCase().includes(t));
        let hits = 0;
        s.querySelectorAll('.hb').forEach(h => {
            const ok = titleHit || tokens.every(t => h.textContent.toLowerCase().includes(t));
            h.classList.toggle('help-nohit', !ok);
            if (ok) hits++;
        });
        s.classList.toggle('help-nohit', hits === 0);
        total += hits;
    });
    status.classList.remove('hidden');
    status.textContent = total
        ? `${total} matching topic${total === 1 ? '' : 's'} (showing every detail level while you search).`
        : 'No matches. Try a simpler word, for example “camera”, “keyword”, “export” or “tax”.';
    document.getElementById('helpContent').scrollTop = 0;
}

// ---- live content (reads the real app state) -------------------------------------------
function renderHelpLive() {
    // accounts table
    const rows = coaAccounts.map(a => `<tr class="${a.archived ? 'help-miss' : ''}">
        <td><b>${helpEsc(a.name)}</b></td>
        <td>${a.tier === 'startup' ? 'Tier 2 &mdash; CapEx' : 'Tier 1 &mdash; Operating'}</td>
        <td>${a.archived ? 'Archived' : 'Active'}</td>
        <td class="mono">${helpEsc((a.keywords || []).join(', ') || '—')}</td></tr>`).join('');
    document.getElementById('helpCoaTable').innerHTML =
        `<table class="help-table"><thead><tr><th>Account (name sent to QuickBooks)</th><th>Tier</th><th>Status</th><th>Keywords</th></tr></thead><tbody>${rows}</tbody></table>
         <p class="muted">Matching order is top to bottom. This is your live list &mdash; it includes anything you have added.</p>`;
    // fixed lists
    document.getElementById('helpFixedLists').innerHTML =
        `<div class="help-row" style="align-items:flex-start">
            <div style="flex:1;min-width:240px"><b>Paid From accounts</b><ul>${paymentAccountList.map(a => `<li${a.archived ? ' class="help-miss"' : ''}>${helpEsc(a.name)}${a.archived ? ' (archived)' : ''}</li>`).join('')}</ul></div>
            <div style="flex:1;min-width:240px"><b>Fleet / Van classes</b><ul>${fleetClassList.map(a => `<li${a.archived ? ' class="help-miss"' : ''}>${helpEsc(a.name)}${a.archived ? ' (archived)' : ''}</li>`).join('')}</ul></div>
         </div>`;
    helpRunMatcher();
    helpBuildSplit();
    helpLoadChecklist();
}

// keyword matcher (mirrors inferLineItemQboCategory and explains the result)
function helpRunMatcher() {
    const name = (document.getElementById('kwTestInput').value || '').trim();
    const price = Number(document.getElementById('kwTestPrice').value || 0);
    const out = document.getElementById('kwTestResult');
    if (!name && !price) { out.className = 'help-result muted'; out.textContent = 'Type a line above.'; return; }
    out.className = 'help-result';
    const lower = name.toLowerCase();
    let html;
    if (price >= 2500) {
        html = `<b>→ Fixed Assets: Equipment &amp; Tools (&gt; $2,500)</b><br>Because the price is $2,500 or more, this rule wins over any keyword. A <code>CAPEX_THRESHOLD</code> flag would also be raised.`;
    } else {
        let hit = null;
        for (const acc of getActiveCategories()) {
            const kw = (acc.keywords || []).find(k => lower.includes(String(k).toLowerCase()));
            if (kw) { hit = { acc, kw }; break; }
        }
        if (hit) {
            const note = hit.acc.tier === 'startup' ? '<br><span class="muted">Tier 2 account — counts toward CapEx Spend.</span>' : '';
            html = `<b>→ ${helpEsc(hit.acc.name)}</b><br>Matched keyword <code>${helpEsc(hit.kw)}</code> in the account “${helpEsc(hit.acc.name)}” (first match in list order).${note}`;
        } else {
            html = `<b>→ Operating Supplies &amp; Moving Gear</b><br>No keyword matched, so a new line starts in this default account. Pick the right account from the line&rsquo;s menu, or add a keyword to the account you want.`;
        }
    }
    out.innerHTML = html;
}

// split calculator (uses the app's real computeProRataSplits)
const HELP_SPLIT_DEFAULT = [
    { name: 'Ratchet straps', price: 65, cat: 'A' }, { name: 'E-Track shelving', price: 340, cat: 'B' },
    { name: 'Moving blankets', price: 95, cat: 'A' }, { name: '', price: '', cat: 'A' }
];
function helpBuildSplit() {
    const tbody = document.getElementById('splitCalcRows');
    if (tbody.children.length) return;
    tbody.innerHTML = HELP_SPLIT_DEFAULT.map((r, i) => `<tr>
        <td><input class="input sc-name" type="text" value="${helpEsc(r.name)}" placeholder="Item ${i + 1}" oninput="helpRunSplit()"></td>
        <td><input class="input sc-price" type="number" step="0.01" value="${r.price}" oninput="helpRunSplit()"></td>
        <td><select class="select sc-cat" onchange="helpRunSplit()">${['A', 'B', 'C', 'D'].map(c => `<option ${c === r.cat ? 'selected' : ''}>Account ${c}</option>`).join('')}</select></td></tr>`).join('');
    // fix selected option values
    [...tbody.querySelectorAll('.sc-cat')].forEach((sel, i) => { sel.value = 'Account ' + HELP_SPLIT_DEFAULT[i].cat; });
    helpRunSplit();
}
function helpResetSplit() {
    document.getElementById('splitCalcRows').innerHTML = '';
    document.getElementById('scTax').value = '41.23'; document.getElementById('scTip').value = '0'; document.getElementById('scTotal').value = '';
    helpBuildSplit();
}
function helpRunSplit() {
    const rows = [...document.querySelectorAll('#splitCalcRows tr')];
    const items = rows.map(r => ({
        name: r.querySelector('.sc-name').value || 'Item', qty: 1,
        price: parseFloat(r.querySelector('.sc-price').value) || 0, category: r.querySelector('.sc-cat').value
    })).filter(i => i.price > 0);
    const tax = parseFloat(document.getElementById('scTax').value) || 0;
    const tip = parseFloat(document.getElementById('scTip').value) || 0;
    const sub = items.reduce((s, i) => s + i.price, 0);
    const typed = document.getElementById('scTotal').value;
    const total = typed === '' ? Number((sub + tax + tip).toFixed(2)) : parseFloat(typed) || 0;
    const out = document.getElementById('splitCalcResult');
    if (!items.length) { out.innerHTML = '<span class="muted">Enter at least one item price.</span>'; return; }
    const splits = computeProRataSplits({ items, tax, tip, total });
    const sum = splits.reduce((s, x) => s + x.qboSplitAmount, 0);
    const body = splits.map(s => `<tr><td><b>${helpEsc(s.category)}</b></td><td class="mono">$${s.rawSubtotal.toFixed(2)}</td><td class="mono">+ $${s.allocatedTaxTip.toFixed(2)}</td><td class="mono"><b>$${s.qboSplitAmount.toFixed(2)}</b></td><td class="mono">${sub ? (s.rawSubtotal / sub * 100).toFixed(1) : '0.0'}%</td></tr>`).join('');
    const ok = Math.abs(sum - total) < 0.005;
    out.innerHTML = `<table class="help-table"><thead><tr><th>Account</th><th>Items</th><th>Tax + tip share</th><th>Posts as</th><th>Share</th></tr></thead><tbody>${body}</tbody></table>
        <p>Splits add up to <b>$${sum.toFixed(2)}</b>; card charge / printed total is <b>$${total.toFixed(2)}</b>. ${ok ? '✓ They match to the penny.' : '✗ They differ because the receipt’s own math is off by more than 5¢, so no penny adjustment is made &mdash; the <code>TOTAL_MATH_ERROR</code> flag would appear.'}</p>`;
}

// quick-start checklist
function helpLoadChecklist() {
    let saved = {};
    try { saved = JSON.parse(helpStore.get('ra_help_steps', '{}')) || {}; } catch (e) { saved = {}; }
    const boxes = [...document.querySelectorAll('.help-checklist input[data-step]')];
    boxes.forEach(b => { b.checked = !!saved[b.dataset.step]; b.closest('li').classList.toggle('done', b.checked); });
    helpUpdateProgress(boxes);
}
function helpUpdateProgress(boxes) {
    boxes = boxes || [...document.querySelectorAll('.help-checklist input[data-step]')];
    const n = boxes.filter(b => b.checked).length;
    document.getElementById('helpProgress').textContent = `— ${n} of ${boxes.length} done`;
}
document.addEventListener('change', e => {
    const b = e.target.closest && e.target.closest('.help-checklist input[data-step]');
    if (!b) return;
    let saved = {};
    try { saved = JSON.parse(helpStore.get('ra_help_steps', '{}')) || {}; } catch (er) { saved = {}; }
    saved[b.dataset.step] = b.checked;
    helpStore.set('ra_help_steps', JSON.stringify(saved));
    b.closest('li').classList.toggle('done', b.checked);
    helpUpdateProgress();
});

// ---- click delegation: Show me + copy ----------------------------------------------------------
document.addEventListener('click', e => {
    const show = e.target.closest && e.target.closest('.help-show');
    if (show) { e.preventDefault(); showMe(show.dataset.show); return; }
    const copy = e.target.closest && e.target.closest('[data-copy]');
    if (copy) {
        const text = copy.dataset.copy;
        const done = () => { const o = copy.textContent; copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = o; }, 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => showToast('Could not copy — select the text and press Ctrl+C'));
        else showToast('Select the text and press Ctrl+C to copy');
    }
});

// ---- spotlight + guided tour --------------------------------------------------------------
const helpVisible = sel => { const el = document.querySelector(sel); return !!el && el.getClientRects().length > 0; };
function ensureReceiptSelected() {
    if (receipts.length && !receipts.some(r => r.id === selectedReceiptId)) selectReceipt(receipts[0].id);
    return receipts.length > 0;
}
const openModalFor = (modalId, toggleFn) => () => { if (document.getElementById(modalId).classList.contains('hidden')) window[toggleFn](); };
const closeModalFor = (modalId, toggleFn) => () => { if (!document.getElementById(modalId).classList.contains('hidden')) window[toggleFn](); };

const HELP_SHOW = {
    savestatus: { sel: '#saveStatus', title: 'Save status', text: 'This chip shows when your work was last saved. Green means it is also saved to your save file. Click it to save right now.' },
    savefile: { sel: '.topbar button[onclick="linkSaveFile()"]', title: 'Save File', text: 'Click here once and choose a place for your save file (for example Documents). After that, every change is saved there automatically as a second copy.' },
    kpis: { sel: '.kpi-grid', title: 'Your four totals', text: 'Queue size, operating spend, CapEx spend and the number of audit flags. They update as you scan and edit.' },
    scanpanel: { sel: '.workspace .stack .panel', title: 'Bring receipts in', text: 'Upload a photo (or drag it here), use the camera, or watch a scan folder. The four samples let you practise.' },
    dropzone: { sel: '#dropZone', title: 'Drop zone', text: 'Click to choose photos, or drag image files onto this box. JPG, PNG and WEBP work; PDFs do not.' },
    intake: { sel: '.intake', title: 'Camera & scan folder', text: 'Use Camera takes a picture with a webcam or document camera. Watch Scan Folder reads new images that your scanner or phone scan app saves into a folder.' },
    samples: { sel: '.sample-grid', title: 'Sample receipts', text: 'Click any sample to scan it and see how the app reads, categorizes, splits and audits a receipt.' },
    queue: { sel: '#receiptListContainer', title: 'Receipt Queue', text: 'One row per receipt, newest first. Click a row to open it in the Inspector. Use the menu above to show only splits, CapEx or flagged receipts.' },
    inspector: { sel: '#inspectorContainer', needsReceipt: true, title: 'The Inspector', text: 'Everything about the selected receipt: routing menus, split breakdown, audit flags, line items and totals.' },
    routing: { sel: '.qbo-bar', needsReceipt: true, title: 'Routing menus', text: 'Paid From (which card/bank), Fleet / Van (which vehicle) and Expense Phase (operating or CapEx). Check these match the paper receipt.' },
    audit: { sel: '.audit-list', needsReceipt: true, title: 'Audit flags', text: 'Colored bars are things to check. High (red) means money or tax treatment is at risk. Green means every check passed.' },
    items: { sel: '.items-panel', needsReceipt: true, title: 'Line items & totals', text: 'Fix descriptions and prices, pick an account for each line, and make the four total boxes match the paper receipt.' },
    coa: { sel: '.topbar button[onclick="toggleCoaModal()"]', title: 'QBO Accounts', text: 'Opens your chart of accounts: add categories, set keywords and archive old accounts.' },
    coaform: { sel: '#coaModal .note', before: openModalFor('coaModal', 'toggleCoaModal'), after: closeModalFor('coaModal', 'toggleCoaModal'), title: 'Add an account', text: 'Type the account name exactly as in QuickBooks, choose Tier 1 or Tier 2, add comma-separated keywords, then click Add QBO Account.' },
    export: { sel: '.topbar button[onclick="toggleQboExportModal()"]', title: 'QBO Export Suite', text: 'Opens the download options for QuickBooks. Clear the red flags first.' },
    exportmodal: { sel: '#qboExportModal .export-card-grid', before: openModalFor('qboExportModal', 'toggleQboExportModal'), after: closeModalFor('qboExportModal', 'toggleQboExportModal'), title: 'Three export options', text: 'Option 1: bank-feed CSV for QuickBooks upload. Option 2: detailed split CSV (a ledger for your bookkeeper). Option 3: .QBO file with duplicate protection.' },
    capex: { sel: '#btnStartupPhase', title: 'CapEx Mode', text: 'ON shows the Tier 2 (CapEx and launch) accounts. OFF hides them once you are past the launch phase.' },
    clearall: { sel: '.queue-tools', title: 'Clear all', text: 'Clear all empties the whole queue after a warning and a typed confirmation. Do it only after exporting and saving an archive copy. Undo clear appears here right afterwards.' },
    engine: { sel: '.topbar .seg', title: 'Reading engine', text: 'WASM OCR works with no setup. Ollama VLM uses an AI model on your own PC if you have set it up.' }
};
const HELP_TOUR = ['savestatus', 'kpis', 'scanpanel', 'queue', 'routing', 'audit', 'items', 'coa', 'export', 'capex'];

function startTour() { startTourSteps(HELP_TOUR.map(k => HELP_SHOW[k]), false); }
function showMe(key) {
    const spec = HELP_SHOW[key];
    if (!spec) return;
    startTourSteps([spec], true);
}
function startTourSteps(steps, single) {
    if (tour) endTour(false, true);
    closeHelp();
    tour = { steps, i: 0, single };
    renderTourStep();
}
function tourStep(d) {
    if (!tour) return;
    const next = tour.i + d;
    if (next < 0) return;
    if (next >= tour.steps.length) { endTour(false); return; }
    const cur = tour.steps[tour.i];
    if (cur.after) cur.after();
    tour.i = next;
    renderTourStep();
}
function renderTourStep() {
    const s = tour.steps[tour.i];
    let spec = s;
    if (s.needsReceipt && !ensureReceiptSelected()) {
        spec = { sel: '.sample-grid', title: 'Add a receipt first', text: 'There are no receipts in the queue yet. Click one of these samples, then ask for this again.' };
    }
    if (spec.before) spec.before();
    setTimeout(() => {
        const el = document.querySelector(spec.sel);
        if (!el || !el.getClientRects().length) {
            if (tour.steps.length > 1 && tour.i < tour.steps.length - 1) { tour.i++; renderTourStep(); } else { endTour(true); showToast('That part of the screen is not visible right now'); }
            return;
        }
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        document.getElementById('helpBubbleTitle').textContent = spec.title;
        document.getElementById('helpBubbleText').textContent = spec.text;
        const multi = tour.steps.length > 1;
        document.getElementById('helpBubbleCount').textContent = multi ? `Step ${tour.i + 1} of ${tour.steps.length}` : '';
        document.getElementById('helpBubbleBack').classList.toggle('hidden', !multi || tour.i === 0);
        document.getElementById('helpBubbleNext').textContent = multi ? (tour.i === tour.steps.length - 1 ? 'Done' : 'Next') : 'Got it';
        document.getElementById('helpSpot').classList.remove('hidden');
        document.getElementById('helpBubble').classList.remove('hidden');
        tour.el = el;
        setTimeout(positionTour, 60);
        setTimeout(positionTour, 420);   // again after any smooth scrolling has settled
        lucide.createIcons();
    }, 80);
}
function positionTour() {
    if (!tour || !tour.el) return;
    const r = tour.el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(r.top - pad, 4), left = Math.max(r.left - pad, 4);
    const bottom = Math.min(r.bottom + pad, innerHeight - 4), right = Math.min(r.right + pad, innerWidth - 4);
    const spot = document.getElementById('helpSpot');
    Object.assign(spot.style, { top: top + 'px', left: left + 'px', width: Math.max(right - left, 20) + 'px', height: Math.max(bottom - top, 20) + 'px' });
    const bubble = document.getElementById('helpBubble');
    const bh = bubble.offsetHeight, bw = bubble.offsetWidth;
    let y;
    if (bottom + 14 + bh < innerHeight) y = bottom + 14;
    else if (top - 14 - bh > 0) y = top - 14 - bh;
    else y = Math.max(innerHeight - bh - 16, 8);
    const x = Math.min(Math.max(left, 12), innerWidth - bw - 12);
    Object.assign(bubble.style, { top: y + 'px', left: x + 'px' });
}
function endTour(reopenHelp, quiet) {
    if (!tour) return;
    const cur = tour.steps[tour.i];
    if (cur && cur.after) cur.after();
    tour = null;
    document.getElementById('helpSpot').classList.add('hidden');
    document.getElementById('helpBubble').classList.add('hidden');
    if (reopenHelp && !quiet) openHelp(helpLast);
}
window.addEventListener('resize', positionTour);
window.addEventListener('scroll', positionTour, true);

// ---- print the whole manual -------------------------------------------------------------------
function printHelp() {
    if (!isHelpOpen()) openHelp();
    const modal = document.getElementById('helpModal');
    const details = [...modal.querySelectorAll('details')];
    const wasOpen = details.map(d => d.open);
    details.forEach(d => { d.open = true; });
    modal.classList.add('help-all');
    document.body.classList.add('help-printing');
    const restore = () => {
        document.body.classList.remove('help-printing');
        if (!document.getElementById('helpSearch').value) modal.classList.remove('help-all');
        details.forEach((d, i) => { d.open = wasOpen[i]; });
        window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => window.print(), 50);
}

// ---- keyboard & first-run hint -----------------------------------------------------------------
document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
    if (e.key === 'Escape') {
        if (tour) { endTour(true); e.preventDefault(); return; }
        if (isHelpOpen()) { closeHelp(); e.preventDefault(); return; }
    }
    if (e.key === 'F1') { e.preventDefault(); openHelp(); return; }
    if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openHelp(); return; }
    if (e.key === '/' && !typing && isHelpOpen()) { e.preventDefault(); document.getElementById('helpSearch').focus(); }
});
document.getElementById('helpModal').addEventListener('mousedown', e => { if (e.target.id === 'helpModal') closeHelp(); });
window.addEventListener('load', () => {
    if (helpStore.get('ra_help_seen', '') !== '1') {
        helpStore.set('ra_help_seen', '1');
        setTimeout(() => showToast('New here? Click Help (or press ?) for the manual and a guided tour.'), 2500);
    }
});
