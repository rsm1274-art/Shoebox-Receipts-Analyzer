// Runs the shipped (legacy) core functions in a VM so their outputs can be captured as golden data.
import vm from 'node:vm';
import { declarationSource, mainScript } from './legacyScript';
import type { CoreContext, Receipt } from '../../src/core/types';

export const FIXED_NOW_ISO = '2026-10-16T12:00:00.000Z';

const FUNCTIONS = [
  'getActiveCategories', 'inferLineItemQboCategory', 'mapPaymentMethodToQboAccount', 'extractFuelMetadata',
  'computeProRataSplits', 'auditAndCategorizeReceipt', 'parseRawOcrTextToReceipt', 'formatDateForQBO',
  'buildQboBankMemo', 'escapeCsvCell', 'defaultFleetClass', 'getExportableReceipts', 'escapeCsvCell',
  'downloadQboBankFeedCSV', 'downloadQboSplitJournalCSV', 'downloadQboWebConnectFile'
];

export interface Download { content: string; filename: string }

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function createLegacyCore(htmlPath?: string) {
  const source = mainScript(htmlPath);
  const downloads: Download[] = [];
  let excludeHigh = false;

  const sandbox: Record<string, any> = {
    console, Math, Number, JSON, String, Array, Object, RegExp, parseFloat, isNaN, Map, Set,
    coaAccounts: [], startupPhaseMode: true, paymentAccountList: [], fleetClassList: [], receipts: [],
    document: { getElementById: () => ({ checked: excludeHigh }) },
    triggerBlobDownload: (content: string, filename: string) => { downloads.push({ content, filename }); },
    showToast: () => {}
  };
  vm.createContext(sandbox);
  // a fixed clock so parsing and file names are reproducible
  vm.runInContext(`
    const __RealDate = Date;
    globalThis.Date = class extends __RealDate {
      constructor(...a) { if (a.length === 0) super('${FIXED_NOW_ISO}'); else super(...a); }
      static now() { return new __RealDate('${FIXED_NOW_ISO}').getTime(); }
    };`, sandbox);
  const unique = [...new Set(FUNCTIONS)];
  // a wired release carries the bundled core and a context adapter; load them first when present
  const wired = source.includes('var ReceiptCore =');
  const names = wired ? ['ReceiptCore', 'coreCtx', ...unique] : unique;
  vm.runInContext(names.map((n) => declarationSource(source, n)).join('\n'), sandbox);

  const apply = (ctx: CoreContext) => {
    sandbox.coaAccounts = clone(ctx.coaAccounts);
    sandbox.startupPhaseMode = ctx.startupPhaseMode;
    sandbox.paymentAccountList = clone(ctx.paymentAccounts);
    sandbox.fleetClassList = clone(ctx.fleetClasses);
  };

  return {
    audit(receipt: Receipt, ctx: CoreContext): Receipt { apply(ctx); return clone(sandbox.auditAndCategorizeReceipt(clone(receipt))); },
    splits(receipt: unknown) { return clone(sandbox.computeProRataSplits(clone(receipt))); },
    infer(item: unknown, ctx: CoreContext): string { apply(ctx); return sandbox.inferLineItemQboCategory(clone(item)); },
    payment(text: string, ctx: CoreContext): string { apply(ctx); return sandbox.mapPaymentMethodToQboAccount(text); },
    parse(text: string, fileName: string, ctx: CoreContext) { apply(ctx); return clone(sandbox.parseRawOcrTextToReceipt(text, fileName)); },
    fuel(receipt: unknown) { return sandbox.extractFuelMetadata(clone(receipt)); },
    memo(receipt: unknown): string { return sandbox.buildQboBankMemo(clone(receipt)); },
    formatDate(d: unknown): string { return sandbox.formatDateForQBO(d); },
    exports(list: Receipt[], excludeMathErrors: boolean) {
      sandbox.receipts = clone(list);
      excludeHigh = excludeMathErrors;
      const out: Record<string, Download | null> = {};
      for (const [key, fn] of [['bankFeed', 'downloadQboBankFeedCSV'], ['split', 'downloadQboSplitJournalCSV'], ['webConnect', 'downloadQboWebConnectFile']] as const) {
        downloads.length = 0;
        sandbox[fn]();
        out[key] = downloads[0] ? { ...downloads[0] } : null;
      }
      return out;
    }
  };
}
