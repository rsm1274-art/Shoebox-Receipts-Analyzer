
// =====================================================================
// LOW-RESOLUTION RECEIPT COPIES
//   Every scanned photo also gets a small grayscale JPEG (target <= ~60 KB)
//   that is kept with the session. It is a reference copy, not a substitute
//   for the paper: fine print may not be legible.
// =====================================================================
const THUMB_TARGET_BYTES = 60000;
const THUMB_START_EDGE = 1000;       // long edge in px, shrinks if the target is not met
const THUMB_QUALITIES = [0.62, 0.55, 0.48, 0.42];

function dataUrlBytes(url) {
    const i = url.indexOf(',');
    return Math.floor((url.length - i - 1) * 3 / 4);
}

async function makeThumbnail(dataUrl, targetBytes = THUMB_TARGET_BYTES) {
    const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('unreadable image'));
        i.src = dataUrl;
    });
    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    let edge = Math.min(THUMB_START_EDGE, longEdge);
    let best = null;
    for (let round = 0; round < 6; round++) {
        const scale = edge / longEdge;
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * scale));
        c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.filter = 'grayscale(1)';             // receipts are black on white; dropping colour saves a lot of bytes
        ctx.drawImage(img, 0, 0, c.width, c.height);
        for (const q of THUMB_QUALITIES) {
            const out = c.toDataURL('image/jpeg', q);
            best = out;
            if (dataUrlBytes(out) <= targetBytes) return out;
        }
        edge = Math.round(edge * 0.82);          // still too big at the lowest quality: shrink and retry
    }
    return best;                                  // closest we got; never blocks a scan
}

// click-to-enlarge viewer (works for the full photo this session, or the saved copy later)
function viewReceiptImage(receiptId) {
    const r = receipts.find(x => x.id === receiptId);
    const src = r && (r.imageUrl || r.thumbUrl);
    if (!src) return;
    closeReceiptViewer();
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.id = 'receiptViewer';
    const low = !r.imageUrl;
    box.innerHTML = `<img src="${src}" alt="Receipt"><p>${low ? 'Low-resolution copy &mdash; check the hard copy for fine print. ' : ''}Click anywhere or press Esc to close.</p>`;
    box.addEventListener('click', closeReceiptViewer);
    document.body.appendChild(box);
}
function closeReceiptViewer() {
    const v = document.getElementById('receiptViewer');
    if (v) v.remove();
}
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('receiptViewer')) { closeReceiptViewer(); e.stopImmediatePropagation(); }
}, true);
