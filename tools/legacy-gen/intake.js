
// =====================================================================
// RECEIPT INTAKE: camera capture + watched scan folder (Chrome / Edge)
//   Camera  – any webcam / USB document camera the browser can see.
//   Folder  – point at the folder a scanner, "scan to folder" MFP or phone
//             scan app (synced via OneDrive/Dropbox/etc.) saves into; new
//             images are read automatically. The folder is only ever READ.
// =====================================================================
const SCAN_IMAGE_EXT = /\.(png|jpe?g|webp|bmp|gif)$/i;
const SCAN_POLL_MS = 4000;
const SCAN_SETTLE_MS = 2500;      // ignore files still being written
const SCAN_MAX_EDGE = 2200;       // long edge cap — faster OCR, lighter memory

// ---- shared helpers ----------------------------------------------------------
function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
    });
}
async function downscaleImageDataUrl(dataUrl, maxEdge = SCAN_MAX_EDGE) {
    const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('unreadable image'));
        i.src = dataUrl;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1) return dataUrl;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
}

// ---- camera ----------------------------------------------------------------------
let cameraStream = null;
async function openCameraCapture() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Camera is not available in this browser or context'); return;
    }
    document.getElementById('cameraModal').classList.remove('hidden');
    lucide.createIcons();
    try {
        await startCamera();
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
        const select = document.getElementById('cameraSelect');
        const current = cameraStream.getVideoTracks()[0].getSettings().deviceId;
        select.innerHTML = devices.map((d, i) =>
            `<option value="${d.deviceId}" ${d.deviceId === current ? 'selected' : ''}>${d.label || 'Camera ' + (i + 1)}</option>`).join('');
        select.classList.toggle('hidden', devices.length < 2);
    } catch (e) {
        closeCameraCapture();
        showToast('Camera blocked or not found: ' + (e.message || e.name));
    }
}
async function startCamera(deviceId) {
    stopCamera();
    const size = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    cameraStream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId }, ...size } : { facingMode: { ideal: 'environment' }, ...size },
        audio: false
    });
    document.getElementById('cameraVideo').srcObject = cameraStream;
}
function stopCamera() {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
}
function closeCameraCapture() {
    stopCamera();
    document.getElementById('cameraVideo').srcObject = null;
    document.getElementById('cameraModal').classList.add('hidden');
}
async function captureCameraFrame() {
    const video = document.getElementById('cameraVideo');
    if (!video.videoWidth) { showToast('Camera is still starting — try again in a second'); return; }
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = await downscaleImageDataUrl(c.toDataURL('image/jpeg', 0.92));
    closeCameraCapture();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    await processReceiptImageLocally(dataUrl, `Camera_${stamp}.jpg`);
}

// ---- watched scan folder -------------------------------------------------------------
let scanDirHandle = null;
let scanTimer = null;
let scanBusy = false;
let scanState = 'off';            // 'off' | 'watching' | 'needs-permission' | 'error'
let scanSeen = new Set();
let scanImported = 0;
let scanPdfSkipped = new Set();
let scanLastCheck = null;
let scanError = '';

const scanKey = f => `${f.name}|${f.size}|${f.lastModified}`;

async function saveScanSeen() {
    try { await idbSet('scanSeen', [...scanSeen]); } catch (e) { /* non-fatal */ }
}
function renderScanStatus() {
    const label = document.getElementById('watchBtnLabel');
    const status = document.getElementById('watchStatus');
    if (!label || !status) return;
    label.textContent = scanState === 'watching' ? 'Stop Watching'
        : scanState === 'needs-permission' ? 'Resume Watching' : 'Watch Scan Folder';
    const t = scanLastCheck ? scanLastCheck.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—';
    const pdf = scanPdfSkipped.size ? ` · ${scanPdfSkipped.size} PDF${scanPdfSkipped.size === 1 ? '' : 's'} skipped (save scans as JPG or PNG)` : '';
    if (scanState === 'watching') status.textContent = `Watching “${scanDirHandle.name}” · ${scanImported} imported · checked ${t}${pdf}`;
    else if (scanState === 'needs-permission') status.textContent = `Paused — click Resume to let the browser read “${scanDirHandle.name}” again`;
    else if (scanState === 'error') status.textContent = scanError;
    else status.textContent = 'Point at the folder your scanner or phone scan app saves to. New images import automatically.';
}

async function listScanImages() {
    const files = [];
    for await (const [name, entry] of scanDirHandle.entries()) {
        if (entry.kind !== 'file') continue;
        if (SCAN_IMAGE_EXT.test(name)) files.push(entry);
        else if (/\.pdf$/i.test(name)) scanPdfSkipped.add(name);
    }
    return files;
}

async function pollScanFolder() {
    if (scanBusy || scanState !== 'watching' || !scanDirHandle) return;
    scanBusy = true;
    try {
        const entries = await listScanImages();
        const fresh = [];
        for (const entry of entries) {
            const f = await entry.getFile();
            if (scanSeen.has(scanKey(f)) || f.size === 0) continue;
            if (Date.now() - f.lastModified < SCAN_SETTLE_MS) continue;   // still being written; next round
            fresh.push(f);
        }
        fresh.sort((a, b) => a.lastModified - b.lastModified);
        for (const f of fresh) {
            try {
                const dataUrl = await downscaleImageDataUrl(await blobToDataUrl(f));
                await processReceiptImageLocally(dataUrl, f.name);
                scanImported++;
            } catch (e) {
                console.warn('Skipped scan', f.name, e);
                showToast(`Could not read "${f.name}": ${e.message}`);
            }
            scanSeen.add(scanKey(f));          // mark even on failure so a bad file isn't retried forever
            await saveScanSeen();
        }
        scanLastCheck = new Date();
    } catch (e) {
        if (e && e.name === 'NotAllowedError') scanState = 'needs-permission';
        else if (e && e.name === 'NotFoundError') { scanState = 'error'; scanError = 'The scan folder was moved or deleted — choose it again.'; }
        else console.warn('Scan folder poll failed:', e);
        if (scanState !== 'watching') stopScanTimer();
    } finally {
        scanBusy = false;
        renderScanStatus();
    }
}
function startScanTimer() {
    stopScanTimer();
    scanTimer = setInterval(pollScanFolder, SCAN_POLL_MS);
    pollScanFolder();
}
function stopScanTimer() { clearInterval(scanTimer); scanTimer = null; }

async function toggleScanFolder() {
    if (scanState === 'watching') {
        scanState = 'off'; stopScanTimer(); renderScanStatus();
        showToast('Stopped watching the scan folder');
        return;
    }
    if (scanState === 'needs-permission' && scanDirHandle) return resumeScanFolder();
    if (!window.showDirectoryPicker) { showToast('Folder watching needs Chrome or Edge'); return; }
    try {
        const handle = await window.showDirectoryPicker({ id: 'receipt-scans', mode: 'read' });
        scanDirHandle = handle;
        scanSeen = new Set(); scanImported = 0; scanPdfSkipped = new Set(); scanLastCheck = null;
        const existing = await listScanImages();
        let importExisting = false;
        if (existing.length) {
            importExisting = confirm(`“${handle.name}” already has ${existing.length} image${existing.length === 1 ? '' : 's'}.\n\nOK = import them now\nCancel = ignore them and only import NEW scans`);
            if (!importExisting) for (const e of existing) scanSeen.add(scanKey(await e.getFile()));
        }
        await idbSet('scanDir', handle).catch(() => {});
        await saveScanSeen();
        scanState = 'watching';
        startScanTimer();
        showToast(`Watching “${handle.name}” for new scans`);
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.error(e); showToast('Could not watch folder: ' + e.message);
    }
}
async function resumeScanFolder() {
    try {
        if ((await scanDirHandle.requestPermission({ mode: 'read' })) !== 'granted') {
            showToast('Permission not granted — scan folder is still paused'); return;
        }
        scanState = 'watching'; startScanTimer();
        showToast(`Watching “${scanDirHandle.name}” again`);
    } catch (e) { scanState = 'error'; scanError = 'Could not reopen the scan folder — choose it again.'; renderScanStatus(); }
}
async function restoreScanFolder() {
    try {
        scanDirHandle = (await idbGet('scanDir')) || null;
        const seen = await idbGet('scanSeen');
        if (Array.isArray(seen)) scanSeen = new Set(seen);
    } catch (e) { /* storage unavailable */ }
    if (!scanDirHandle) { renderScanStatus(); return; }
    try {
        if ((await scanDirHandle.queryPermission({ mode: 'read' })) === 'granted') { scanState = 'watching'; startScanTimer(); }
        else scanState = 'needs-permission';
    } catch (e) { scanState = 'error'; scanError = 'Could not reopen the scan folder — choose it again.'; }
    renderScanStatus();
}

// ---- drag & drop onto the drop zone (the zone has always said "drag & drop") ----------------
(function enableDropZone() {
    const dz = document.getElementById('dropZone');
    if (!dz) return;
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', async e => {
        const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/'));
        if (!files.length) { showToast('Drop image files (JPG, PNG or WEBP) — PDFs are not supported'); return; }
        wfSource = 'drag-drop';
        try {
            for (const f of files) {
                try { await processReceiptImageLocally(await downscaleImageDataUrl(await blobToDataUrl(f)), f.name); }
                catch (err) { showToast(`Could not read "${f.name}": ${err.message}`); }
            }
        } finally { wfSource = null; }
    });
    // a file dropped anywhere else should not make the browser navigate away from the app
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());
})();
