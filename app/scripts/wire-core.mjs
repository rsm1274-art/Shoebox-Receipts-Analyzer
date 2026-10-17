// Rewrites a generated release so its rule functions are thin adapters over the bundled TypeScript core.
// The page keeps the same function names, so the rest of the (legacy) UI code is untouched.
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'acorn';
import { BUNDLE_PATH } from './bundle-core.mjs';

const CTX_FN = `function coreCtx() {
            return { coaAccounts, startupPhaseMode, paymentAccounts: paymentAccountList, fleetClasses: fleetClassList };
        }`;

// name -> full replacement declaration
const ADAPTERS = {
  getActiveCategories: `function getActiveCategories() { return ReceiptCore.getActiveCategories(coreCtx()); }`,
  inferLineItemQboCategory: `function inferLineItemQboCategory(item) { return ReceiptCore.inferLineItemCategory(item, coreCtx()); }`,
  mapPaymentMethodToQboAccount: `function mapPaymentMethodToQboAccount(paymentStr = '') { return ReceiptCore.mapPaymentMethodToAccount(paymentStr, coreCtx()); }`,
  extractFuelMetadata: `function extractFuelMetadata(receiptData) { return ReceiptCore.extractFuelMetadata(receiptData); }`,
  computeProRataSplits: `function computeProRataSplits(receiptData) { return ReceiptCore.computeProRataSplits(receiptData); }`,
  // the legacy UI relies on this mutating the receipt it is given
  auditAndCategorizeReceipt: `function auditAndCategorizeReceipt(receiptData) {
            Object.assign(receiptData, ReceiptCore.auditAndCategorizeReceipt(receiptData, coreCtx()));
            return receiptData;
        }`,
  parseRawOcrTextToReceipt: `function parseRawOcrTextToReceipt(rawText, fallbackFileName = 'Uploaded Receipt') {
            return ReceiptCore.parseRawOcrTextToReceipt(rawText, coreCtx(), fallbackFileName);
        }`,
  formatDateForQBO: `function formatDateForQBO(dateStr) { return ReceiptCore.formatDateForQBO(dateStr); }`,
  buildQboBankMemo: `function buildQboBankMemo(receipt) { return ReceiptCore.buildQboBankMemo(receipt); }`,
  escapeCsvCell: `function escapeCsvCell(val) { return ReceiptCore.escapeCsvCell(val); }`,
  defaultFleetClass: `function defaultFleetClass() { return ReceiptCore.defaultFleetClass(coreCtx()); }`,
  downloadQboBankFeedCSV: `function downloadQboBankFeedCSV() {
            const list = getExportableReceipts();
            if (list.length === 0) return;
            const now = new Date();
            triggerBlobDownload(ReceiptCore.buildBankFeedCsv(list), ReceiptCore.bankFeedFileName(now, wfCurrentBatchId()));
            showToast('Downloaded QBO 4-Column Bank Feed CSV');
        }`,
  downloadQboSplitJournalCSV: `function downloadQboSplitJournalCSV() {
            const list = getExportableReceipts();
            if (list.length === 0) return;
            const now = new Date();
            triggerBlobDownload(ReceiptCore.buildSplitCsv(list), ReceiptCore.splitCsvFileName(now, wfCurrentBatchId()));
            showToast('Downloaded QBO Multi-Category Split CSV');
        }`,
  downloadQboWebConnectFile: `function downloadQboWebConnectFile() {
            const list = getExportableReceipts();
            if (list.length === 0) return;
            const now = new Date();
            triggerBlobDownload(ReceiptCore.buildQboWebConnect(list, now), ReceiptCore.webConnectFileName(now, wfCurrentBatchId()), 'application/vnd.intu.qbo');
            showToast('Downloaded QuickBooks Web Connect (.QBO) file');
        }`
};

export function wireHtml(html) {
  if (html.includes('var ReceiptCore =')) return { html, replaced: 0, skipped: true };
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const main = scripts.sort((a, b) => b[1].length - a[1].length)[0];
  const script = main[1];
  const ast = parse(script, { ecmaVersion: 'latest', sourceType: 'script' });

  const edits = [];
  const seen = new Set();
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && ADAPTERS[node.id.name]) {
      edits.push({ start: node.start, end: node.end, text: ADAPTERS[node.id.name] });
      seen.add(node.id.name);
    }
  }
  const missing = Object.keys(ADAPTERS).filter((n) => !seen.has(n));
  if (missing.length) throw new Error('functions not found in the release: ' + missing.join(', '));

  let out = script;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  const bundle = readFileSync(BUNDLE_PATH, 'utf8').replace(/\r\n/g, '\n');
  // NOTE: the bundle is inserted verbatim. Re-indenting it would change the contents of multi-line template literals
  // (the OFX/.QBO text), which are whitespace-sensitive.
  out = `\n        // ---- Receipt Audit core (generated from app/src/core) ----\n${bundle}\n        ${CTX_FN}\n${out}`;

  return { html: html.slice(0, main.index) + '<script>' + out + '</script>' + html.slice(main.index + main[0].length), replaced: edits.length, skipped: false };
}

export function wireFile(path) {
  const before = readFileSync(path, 'utf8');
  const { html, replaced, skipped } = wireHtml(before);
  if (!skipped) writeFileSync(path, html);
  return { path, replaced, skipped };
}

if (process.argv[1] && process.argv[1].endsWith('wire-core.mjs')) {
  for (const p of process.argv.slice(2)) console.log(wireFile(p));
}
