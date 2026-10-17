import re, os
HERE = os.path.dirname(__file__)
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SRC = os.path.join(REPO, "legacy", "local_shoebox_receipts_analyzer_v2.html")
OUT = os.path.join(REPO, "releases")
os.makedirs(OUT, exist_ok=True)
src = open(SRC, encoding="utf-8").read()
css_t = open(os.path.join(HERE, "working.css"), encoding="utf-8").read()

# markers in the original
s_start = src.index("<style>") + len("<style>")
s_end = src.index("</style>")
typekit = '    <link rel="stylesheet" href="https://use.typekit.net/wqy7ecr.css">\n'
assert typekit in src

LEGORA = dict(
    NAME="Legora", slug="legora-com", short="legora",
    fonts="Hanken+Grotesk:wght@300;400;500;600|JetBrains+Mono:wght@400;500",
    bg="#fafaf9", surface="#ffffff", ink="#0d1016", grey="#68655e", line="#e6e4df", lineStrong="#d3d0c9",
    primary="#005032", primaryInk="#ffffff", primaryHover="#003d26",
    secondary="#e6e6e6", secondaryInk="#0d1016", tint="#f0efeb", hover="#f3f2ee", sel="#eef4f1", focus="#005032",
    hiBg="#a4332b", hiFg="#ffffff", medBg="#efe3c4", medFg="#4d3b0a", lowBg="#ecebe7", lowFg="#343434", okBg="#dcebe3", okFg="#003d26",
    rXs="2px", rSm="5px", rMd="12px", rLg="20px", rBtn="999px",
    shadow="0 0 0 1px rgba(13,16,22,.06)", shadowPop="0 10px 30px -8px rgba(13,16,22,.18), 0 0 0 1px rgba(13,16,22,.06)",
    sans='"Hanken Grotesk", "Aktiv Grotesk", system-ui, sans-serif', mono='"JetBrains Mono", ui-monospace, monospace',
    headWeight="400", headTrack="-0.03em", ease="cubic-bezier(0.625, 0.05, 0, 1)", dur="0.5s",
    scrim="rgba(13,16,22,.45)",
    extra="""
.kpi-value { font-weight: 300; letter-spacing: -0.04em; }
.brand-title { font-weight: 400; letter-spacing: -0.04em; }
.btn-ghost { color: #0d1016; }
.chip { font-family: var(--font-sans); font-size: 11px; font-weight: 500; }
.topbar { border-bottom: 1px solid var(--line); }
""")

POOLSIDE = dict(
    NAME="Poolside", slug="poolside-ai", short="poolside",
    fonts="Geist:wght@400;500;600|JetBrains+Mono:wght@400;500",
    bg="#fbfaf6", surface="#ffffff", ink="#000000", grey="#6f6d69", line="#eeede6", lineStrong="#dad9d2",
    primary="#000000", primaryInk="#fbfaf6", primaryHover="#3b2c00",
    secondary="#eeede6", secondaryInk="#000000", tint="#f7f6ef", hover="#f7f6ef", sel="#fff4f2", focus="#ff5f57",
    hiBg="#ff5f57", hiFg="#ffffff", medBg="#f6e7b8", medFg="#3b2c00", lowBg="#eeede6", lowFg="#3b2c00", okBg="#e4ecd8", okFg="#2f4a14",
    rXs="1px", rSm="4px", rMd="10px", rLg="20px", rBtn="6px",
    shadow="0 0 0 1px rgba(59,44,0,.08), 0 1px 1px rgba(43,38,26,.02), 0 2px 4px rgba(43,39,25,.02)",
    shadowPop="0 0 0 1px rgba(43,38,26,.04), 0 2px 3px rgba(43,38,26,.04), 0 8px 16px rgba(43,38,26,.055), 0 20px 36px rgba(43,38,26,.07)",
    sans='"Geist", "Untitled Sans", system-ui, sans-serif', mono='"JetBrains Mono", ui-monospace, monospace',
    headWeight="400", headTrack="-0.03em", ease="ease", dur="0.2s",
    scrim="rgba(20,14,8,.4)",
    extra="""
.logo { background: #000; color: #fbfaf6; border-radius: var(--r-md); }
.kpi-icon { background: var(--tint); box-shadow: inset 0 0 0 1px rgba(59,44,0,.08); }
.kpi-icon.amber { background: #fff1ee; color: #ff5f57; }
.btn-ghost { background: var(--surface); color: #000; box-shadow: var(--shadow); border-color: transparent; }
.btn-amber { background: #ff5f57; border-color: #ff5f57; color: #fff; }
.btn-amber:hover { background: #e84a42; border-color: #e84a42; }
.progress-bar { background: #ff5f57; }
.kpi-label, .section-label, th { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0; }
.amount, .kpi-value { font-variant-numeric: tabular-nums; }
.topbar { border-bottom: 1px solid var(--line-strong); }
.seg-btn.active { background: #000; color: #fbfaf6; box-shadow: none; }
.seg { background: var(--line); }
""")

INTAKE_HTML = '<div class="intake">\n                        <button onclick="openCameraCapture()" class="btn btn-ghost" title="Capture with a webcam or USB document camera">\n                            <i data-lucide="camera" style="width:14px;height:14px"></i><span>Use Camera</span>\n                        </button>\n                        <button onclick="toggleScanFolder()" class="btn btn-ghost" title="Auto-import new images saved to a scanner or phone-scan folder">\n                            <i data-lucide="folder-input" style="width:14px;height:14px"></i><span id="watchBtnLabel">Watch Scan Folder</span>\n                        </button>\n                        <p id="watchStatus" class="muted"></p>\n                    </div>\n\n                    <!-- Progress Indicator -->'
CAMERA_HTML = '<div id="cameraModal" class="modal-backdrop hidden">\n        <div class="modal" style="max-width:680px">\n            <div class="modal-head">\n                <div><h3>Capture Receipt</h3><p class="muted">Lay the receipt flat, well lit, filling the frame.</p></div>\n                <button onclick="closeCameraCapture()" class="icon-btn" aria-label="Close"><i data-lucide="x" style="width:20px;height:20px"></i></button>\n            </div>\n            <div class="modal-body">\n                <select id="cameraSelect" class="select" onchange="startCamera(this.value).catch(e => showToast(e.message))"></select>\n                <video id="cameraVideo" autoplay playsinline muted></video>\n                <div style="display:flex;gap:0.6rem;flex-wrap:wrap">\n                    <button onclick="captureCameraFrame()" class="btn"><i data-lucide="aperture" style="width:14px;height:14px"></i><span>Capture</span></button>\n                    <button onclick="closeCameraCapture()" class="btn btn-ghost"><span>Cancel</span></button>\n                </div>\n            </div>\n        </div>\n    </div>\n\n    <!-- Toast Notification -->'

import sys
sys.path.insert(0, HERE)

def common(out, T):
    LOGO = ('<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            '<path d="M5 3h12v8M5 3v18l2-1.5L9 21l2-1.5 1.5 1.1"/><path d="M8.5 8h5M8.5 11.5h2.5"/>'
            '<circle cx="16" cy="16" r="3.6"/><path d="m18.7 18.7 2.8 2.8"/></svg>')
    out, n = re.subn(r'<i data-lucide="truck" style="width:22px;height:22px"></i>', LOGO, out, count=1)
    assert n == 1
    assert "White Van Shoebox &rarr; QBO</h1>" in out
    out = out.replace("White Van Shoebox &rarr; QBO</h1>", "Receipt Audit</h1>")
    out = out.replace("<title>Shoebox Receipts Analyzer — %s edition</title>" % T["NAME"], "<title>Receipt Audit — %s edition</title>" % T["NAME"])
    REPL = [
        ("Fleet Operations + Startup Phase Categorizer", "Fleet Operations + CapEx Categorizer"),
        ('title="Show/Hide Tier 2 Startup & Upfitting Categories"', 'title="Show/Hide Tier 2 CapEx & Upfitting Categories"'),
        ('<span id="startupModeLabel">Startup Phase: ON</span>', '<span id="startupModeLabel">CapEx Mode: ON</span>'),
        ("'Startup Phase: ON' : 'Startup Phase: OFF (Year 2+)'", "'CapEx Mode: ON' : 'CapEx Mode: OFF (Year 2+)'"),
        ("'Tier 2 Startup & Upfitting QBO categories enabled'", "'Tier 2 CapEx & Upfitting QBO categories enabled'"),
        ("'Startup categories hidden", "'CapEx categories hidden"),
        ('<p class="kpi-label">Startup &amp; CapEx Spend</p>', '<p class="kpi-label">CapEx Spend</p>'),
        ('Sec. 195 Startup + Upfitting', 'Sec. 195 + Upfitting & Fixed Assets'),
        ('Scan White Van / Startup Receipt', 'Scan White Van / CapEx Receipt'),
        ('White Van &amp; Startup Test Receipts', 'White Van &amp; CapEx Test Receipts'),
        ('Split + Startup</span>', 'Split + CapEx</span>'),
        ('>Startup / CapEx Only<', '>CapEx Only<'),
        ('Tier 2: Startup &amp; Launch (Archivable)', 'Tier 2: CapEx &amp; Launch (Archivable)'),
        ('<span class="chip chip-accent">Startup</span>', '<span class="chip chip-accent">CapEx</span>'),
        ('Tier 2: Startup & Upfitting (Launch Phase)', 'Tier 2: CapEx & Upfitting (Launch Phase)'),
        ('>Startup (One-Off / Sec. 195)<', '>CapEx (One-Off / Sec. 195)<'),
        ('White Van &amp; Startup Policy Audit', 'White Van &amp; CapEx Policy Audit'),
        ('Tier 2: Startup, Upfitting & Launch Accounts', 'Tier 2: CapEx, Upfitting & Launch Accounts'),
    ]
    for a, b in REPL:
        assert a in out, a
        out = out.replace(a, b)
    REPL2 = [
        ("Startup Costs:", "CapEx:"),
        ("Startup / Launch Phase (Unassigned)", "CapEx / Launch Phase (Unassigned)"),
        ("Startup (One-Off)", "CapEx (One-Off)"),
        ("sp.category.startsWith('Startup')", "(sp.category.startsWith('CapEx') || sp.category.startsWith('Startup'))"),
        ("s.category.includes('Startup')", "(s.category.includes('CapEx') || s.category.includes('Startup'))"),
        ("r.expensePhase.includes('Startup')", "(r.expensePhase.includes('CapEx') || r.expensePhase.includes('Startup'))"),
        ("Startup_Flag", "CapEx_Flag"),
        ("New Fleet / Startup Item", "New Fleet / CapEx Item"),
        ("qbo_white_van_coa_v1", "qbo_receipt_audit_coa_v1"),
    ]
    for a, b in REPL2:
        assert a in out, a
        out = out.replace(a, b)
    out = out.replace("<title>Shoebox Receipts Analyzer — QBO White Van &amp; Startup Edition</title>", "<title>Receipt Audit v2.1 — QBO Fleet &amp; CapEx Edition</title>")
    REPL3 = [
        ("Shoebox Queue", "Receipt Queue"),
        ("Scan White Van / CapEx Receipt", "Scan Fleet / CapEx Receipt"),
        ("White Van &amp; CapEx Test Receipts", "Fleet &amp; CapEx Test Receipts"),
        ("scan one of the White Van presets", "scan one of the Fleet presets"),
        ("Tier 1: White Van Operating", "Tier 1: Fleet Operating"),
        ("Tier 1: Core White Van Operating Accounts", "Tier 1: Core Fleet Operating Accounts"),
        ("All White Van &amp; QBO Audit", "All Fleet &amp; QBO Audit"),
        ("White Van &amp; CapEx Policy Audit", "Fleet &amp; CapEx Policy Audit"),
        ("WHITEVAN-FLEET-4921", "RECEIPTAUDIT-FLEET-4921"),
        ("WhiteVan_Shoebox_", "ReceiptAudit_"),
        ("QBO White Van &amp; Startup Edition", "QBO Fleet &amp; CapEx Edition"),
        ("Uploader + Sample Shoebox + Receipt Queue", "Uploader + Sample Receipts + Receipt Queue"),
        ("Receipt Shoebox Queue List", "Receipt Queue List"),
        ("White Van & Startup Sample Receipt Presets", "Fleet & CapEx Sample Receipt Presets"),
        ("WHITE VAN & STARTUP SAMPLE RECEIPT TEMPLATES", "FLEET & CAPEX SAMPLE RECEIPT TEMPLATES"),
        ("Core White Van Operating Accounts (Permanent)", "Core Fleet Operating Accounts (Permanent)"),
        ("White Van Fleet Rules", "Fleet Rules"),
        ("4 White Van & Startup sample receipts", "4 Fleet & CapEx sample receipts"),
    ]
    for a, b in REPL3:
        out = out.replace(a, b)
    left = [l.strip()[:90] for l in out.split(chr(10)) if re.search(r"white.?van|shoebox", l, re.I)]
    assert not left, left

    # ---------------- persistence (autosave + save file), photos not stored ----------------
    persist_js = open(os.path.join(HERE, "persist.js"), encoding="utf-8").read()
    a = out.index("// Initialize with the 4 Fleet & CapEx sample receipts")
    b = out.rindex("    </script>")
    intake_js = open(os.path.join(HERE, "intake.js"), encoding="utf-8").read()
    features_js = open(os.path.join(HERE, "features.js"), encoding="utf-8").read() + chr(10) + open(os.path.join(HERE, "thumbs.js"), encoding="utf-8").read()
    out = out[:a] + (features_js + chr(10) + persist_js + chr(10) + intake_js + chr(10) + open(os.path.join(HERE, "help.js"), encoding="utf-8").read() + chr(10) + open(os.path.join(HERE, "clearall.js"), encoding="utf-8").read()).replace(chr(10), chr(10) + "        ").rstrip() + chr(10) + out[b:]

    PATCHES = [
        # photos are not stored: queue thumbnail falls back to an icon tile
        ('<img src="${r.imageUrl}" alt="${r.merchant}" class="receipt-thumb">',
         '${(r.imageUrl || r.thumbUrl) ? `<img src="${r.imageUrl || r.thumbUrl}" alt="${r.merchant}" class="receipt-thumb">` : `<div class="receipt-thumb receipt-thumb-empty" title="No photo copy stored"><i data-lucide="file-text" style="width:18px;height:18px"></i></div>`}'),
        # inspector: say where to find the hard copy
        ('<img src="${receipt.imageUrl}" alt="Receipt Image">',
         '${(receipt.imageUrl || receipt.thumbUrl) ? `<div style="text-align:center"><img src="${receipt.imageUrl || receipt.thumbUrl}" alt="Receipt Image" title="Click to enlarge" style="cursor:zoom-in" onclick="viewReceiptImage(\'${receipt.id}\')">${receipt.imageUrl ? "" : `<p class="muted" style="margin-top:0.5rem">Low-resolution copy (about 60 KB). Click to enlarge. The hard copy filed under <b>${receipt.date}</b> has the fine print.</p>`}</div>` : `<div class="no-photo"><i data-lucide="archive" style="width:22px;height:22px"></i><p><b>No photo copy stored</b></p><p>Pull the hard copy filed under <b>${receipt.date}</b></p><p class="mono">${receipt.merchant} &bull; $${Number(receipt.total).toFixed(2)}</p></div>`}'),
        # keep a small low-resolution copy of every scanned photo
        ('receipts.unshift(audited);',
         'try { audited.thumbUrl = await makeThumbnail(imageDataUrl); } catch (thumbErr) { console.warn("No low-resolution copy made:", thumbErr); }\n                receipts.unshift(audited);'),
        ('receipts.push(audited);',
         'receipts.push(audited);\n                makeThumbnail(imageDataUrl).then(t => { audited.thumbUrl = t; scheduleAutosave(); }).catch(() => {});'),
        # confirmations now that work is persisted
        ('function loadAllSamples() {\n            receipts = [];',
         "function loadAllSamples(silent) {\n            if (!silent && receipts.length && !confirm('Replace everything in the queue with the 4 sample receipts?')) return;\n            receipts = [];"),
        ('function deleteReceipt(receiptId) {\n',
         "function deleteReceipt(receiptId) {\n            const _r = receipts.find(r => r.id === receiptId);\n            if (_r && !confirm(`Delete \"${_r.merchant}\" (${_r.date})? This also removes it from the saved session.`)) return;\n"),
        # session controls in the header
        ('<button id="btnStartupPhase"',
         '<button id="saveStatus" class="chip chip-medium" onclick="onSaveStatusClick()" title="Autosave status">Starting…</button>\n'
         '                <button onclick="openSessionFile()" class="btn btn-ghost" title="Open a saved session file">\n'
         '                    <i data-lucide="folder-open" style="width:15px;height:15px"></i>\n                    <span>Open</span>\n                </button>\n'
         '                <button onclick="linkSaveFile()" class="btn btn-ghost" title="Choose a file on disk that is autosaved as a second copy">\n'
         '                    <i data-lucide="save" style="width:15px;height:15px"></i>\n                    <span>Save File</span>\n                </button>\n'
         '                <button id="btnStartupPhase"'),
    ]
    import help_patches
    import feature_patches
    PATCHES = feature_patches.patches() + PATCHES
    PATCHES += [("<!-- Progress Indicator -->", INTAKE_HTML), ("<!-- Toast Notification -->", CAMERA_HTML)] + help_patches.patches()
    out = help_patches.add_header_button(out)
    CLEARALL_HTML = open(os.path.join(HERE, "clearall.html"), encoding="utf-8").read()
    PATCHES += [("<!-- Toast Notification -->", CLEARALL_HTML)]
    out, nq = re.subn(r'(<select id="filterAnomalySelect".*?</select>)',
                      lambda m: '<div class="queue-tools">'
                                '<button id="btnUndoClear" class="text-link hidden" onclick="undoClearAll()">Undo clear</button>'
                                '<button id="btnClearAll" class="text-link hidden" onclick="openClearAll()" title="Remove every receipt from the queue (asks first)">Clear all</button>'
                                + m.group(1) + '</div>', out, count=1, flags=re.S)
    assert nq == 1, "queue header anchor not found"
    for a_, b_ in PATCHES:
        assert out.count(a_) == 1, a_[:60]
        out = out.replace(a_, b_)
    # "Save QBO Image" only when a photo exists in memory
    out, n = re.subn(r'(<button onclick="downloadRenamedReceiptImage\(\'\$\{receipt\.id\}\'\)".*?</button>)',
                     lambda m: "${receipt.imageUrl ? `" + m.group(1) + "` : ''}", out, count=1, flags=re.S)
    assert n == 1
    _left = [l.strip()[:90] for l in out.split(chr(10)) if re.search(r"white.?van|shoebox", l, re.I)]
    assert not _left, _left
    EXTRA_CSS = """
/* --- session persistence UI --- */
#saveStatus { cursor: pointer; max-width: 22rem; overflow: hidden; text-overflow: ellipsis; }
.receipt-thumb-empty { display: flex; align-items: center; justify-content: center; color: var(--grey); background: var(--bg); }
.no-photo { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 2.2rem 1rem; text-align: center; font-size: 12.5px; color: var(--grey); line-height: 1.4; }
.no-photo b { color: var(--ink, #000); }
.queue-tools { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; }
.clearall-warn { border-left: 4px solid var(--burnt-orange); }
.clearall-list { margin: 0.3rem 0 0 1.1rem; padding: 0; line-height: 1.6; }
#clearAllGo:disabled { opacity: 0.45; cursor: not-allowed; }
.lightbox { position: fixed; inset: 0; z-index: 140; background: rgba(0,0,0,.84); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.7rem; padding: 1rem; cursor: zoom-out; }
.lightbox img { max-width: 96vw; max-height: 90vh; object-fit: contain; background: #fff; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.lightbox p { color: #fff; margin: 0; font-size: 13px; text-align: center; }
.dropzone.drag { background: var(--cream); outline: 3px solid var(--burnt-orange); outline-offset: -3px; }
.intake { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
.intake .muted { flex-basis: 100%; margin: 0; }
#cameraVideo { width: 100%; max-height: 60vh; background: #000; object-fit: contain; }
"""
    EXTRA_CSS += """
/* --- editable header / quantity / delete line --- */
.title-input { font: inherit; letter-spacing: inherit; color: inherit; width: 100%; background: transparent; border: 0; border-bottom: 1px dashed rgba(128,128,128,.55); padding: 0; margin: 0; border-radius: 0; }
.title-input:focus { outline: 2px solid currentColor; outline-offset: 2px; border-bottom-color: transparent; }
.date-edit { display: inline-flex; align-items: center; gap: 0.35rem; }
.date-edit .input { padding: 0.15rem 0.35rem; font-size: 12px; }
td .icon-btn { font-size: 16px; line-height: 1; padding: 0.15rem 0.45rem; }
"""
    EXTRA_CSS += feature_patches.CSS
    EXTRA_CSS += open(os.path.join(HERE, "help.css"), encoding="utf-8").read()
    if T["NAME"] != "Industry City":
        EXTRA_CSS += "button.chip { border: 0; }\n"
    assert out.count("</style>") == 1
    out = out.replace("</style>", EXTRA_CSS + "    </style>", 1)
    return out

for T in (LEGORA, POOSTSIDE if False else POOLSIDE):
    css = css_t
    for k, v in T.items():
        css = css.replace("{{%s}}" % k, v)
    assert "{{" not in css, re.findall(r"\{\{\w+\}\}", css)
    out = src[:s_start] + "\n" + css + "\n    " + src[s_end:]
    fonts = ('    <link rel="preconnect" href="https://fonts.googleapis.com">\n'
             '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
             '    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=%s&display=swap">\n'
             % T["fonts"].replace("|", "&family="))
    out = out.replace(typekit, "    <!-- Fonts: %s design system -->\n%s" % (T["NAME"], fonts))
    out = out.replace("<title>Shoebox Receipts Analyzer — QBO White Van &amp; Startup Edition</title>",
                      "<title>Shoebox Receipts Analyzer — %s edition</title>" % T["NAME"])
    out = common(out, T)
    path = os.path.join(OUT, "receipt_audit_v2.1-%s.html" % T["short"])
    open(path, "w", encoding="utf-8", newline="\n").write(out)
    print(path, len(out))

# v2.1: the original (industrycity) skin with the new name, logo and CapEx wording
V = common(src, {"NAME": "Industry City"})
assert "Receipt Audit v2.1" in V
vp = os.path.join(OUT, "receipt_audit_v2.1-industry.html")
open(vp, "w", encoding="utf-8", newline="\n").write(V)
print(vp, len(V))
