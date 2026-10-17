// Readable examples of the rules the Help manual describes. If one of these changes, the manual must change too.
import { describe, expect, it } from 'vitest';
import {
  auditAndCategorizeReceipt, buildBankFeedCsv, buildQboBankMemo, buildSplitCsv, computeProRataSplits, defaultContext,
  exportableReceipts, extractFuelMetadata, formatDateForQBO, inferLineItemCategory, mapPaymentMethodToAccount,
  parseRawOcrTextToReceipt
} from '../../src/core';
import type { Receipt } from '../../src/core';

const base = (over: Partial<Receipt> = {}): Receipt => ({
  id: 'r1', merchant: 'TEST SHOP', date: '2026-10-14', paymentMethod: 'VISA *4921',
  items: [{ name: 'Widget', qty: 1, price: 10 }], subtotal: 10, tax: 0, tip: 0, total: 10, ...over
});
const codes = (r: Receipt) => (r.anomalies || []).map((a) => a.code);

describe('tax and tip split (manual: "Splits, tax & tip")', () => {
  it('shares tax across accounts and the splits add up to the card charge', () => {
    const s = computeProRataSplits({
      items: [{ name: 'a', price: 65, category: 'A' }, { name: 'b', price: 340, category: 'B' }, { name: 'c', price: 95, category: 'A' }],
      tax: 41.23, tip: 0
    });
    expect(s.map((x) => [x.category, x.qboSplitAmount])).toEqual([['A', 173.19], ['B', 368.04]]);
    expect(s.reduce((t, x) => t + x.qboSplitAmount, 0)).toBeCloseTo(541.23, 2);
  });

  it('does not force a penny plug when the receipt math is off by more than 5 cents', () => {
    const s = computeProRataSplits({ items: [{ name: 'a', price: 50, category: 'A' }, { name: 'b', price: 50, category: 'B' }], tax: 0, tip: 0, total: 150 });
    expect(s.reduce((t, x) => t + x.qboSplitAmount, 0)).toBe(100);
  });

  it('keeps accounts in first-seen order', () => {
    const s = computeProRataSplits({ items: [{ name: 'a', price: 1, category: 'Z' }, { name: 'b', price: 1, category: 'A' }], tax: 0, tip: 0 });
    expect(s.map((x) => x.category)).toEqual(['Z', 'A']);
  });
});

describe('categorizing (manual: "Accounts & categories")', () => {
  const ctx = defaultContext();
  const cat = (name: string, price = 5, extra: object = {}) => inferLineItemCategory({ name, qty: 1, price, ...extra }, ctx);

  it('matches keywords case-insensitively as substrings, first account in list order wins', () => {
    expect(cat('ULSD #2 DIESEL')).toBe('Vehicle: Fuel & DEF');
    expect(cat('Bottled water')).toBe('Meals (50% Limit) & Driver Per Diem');
    expect(cat('Service fee')).toBe('Vehicle: Repairs & Maintenance');   // the documented "common surprise"
    expect(cat('Sandpaper')).toBe('Office & Dispatch Software');         // "paper"
  });

  it('files a line of $2,500 or more as a fixed asset regardless of keywords', () => {
    expect(cat('Diesel', 2500)).toBe('Fixed Assets: Equipment & Tools (> $2,500)');
    expect(cat('Diesel', 2499.99)).toBe('Vehicle: Fuel & DEF');
    expect(inferLineItemCategory({ name: 'x', qty: 5, price: 500 }, ctx)).toBe('Fixed Assets: Equipment & Tools (> $2,500)');
  });

  it('a hand-picked account is locked', () => {
    expect(cat('Diesel', 5, { manualCategory: true, category: 'Subcontractors' })).toBe('Subcontractors');
    expect(cat('Diesel', 9000, { manualCategory: true, category: 'Subcontractors' })).toBe('Subcontractors');
  });

  it('unmatched lines keep their account, else start in operating supplies', () => {
    expect(cat('Zzz')).toBe('Operating Supplies & Moving Gear');
    expect(cat('Zzz', 5, { category: 'Subcontractors' })).toBe('Subcontractors');
  });

  it('archived accounts and Tier 2 accounts hidden by CapEx mode do not auto-match', () => {
    const c = defaultContext();
    c.coaAccounts.find((a) => a.id === 'veh_fuel')!.archived = true;
    expect(inferLineItemCategory({ name: 'Diesel', qty: 1, price: 5 }, c)).toBe('Operating Supplies & Moving Gear');
    const off = defaultContext(); off.startupPhaseMode = false;
    expect(inferLineItemCategory({ name: 'E-Track shelving', qty: 1, price: 5 }, off)).toBe('Operating Supplies & Moving Gear');
  });
});

describe('payment account (manual: "Paid From")', () => {
  const ctx = defaultContext();
  it('matches by last digits or card name and falls back to the first active account', () => {
    expect(mapPaymentMethodToAccount('AMEX', ctx)).toBe('Amex Plum Fleet Card (*1004)');
    expect(mapPaymentMethodToAccount('PERSONAL VISA *0091', ctx)).toBe('Founder Personal Card (Due to Owner / Reimbursable)');
    expect(mapPaymentMethodToAccount('CASH', ctx)).toBe('Petty Cash / Driver Cash');
    expect(mapPaymentMethodToAccount('DISCOVER', ctx)).toBe('Chase Ink Business Visa (*4921)');
  });
});

describe('audit flags (manual: "Audit flags explained")', () => {
  const ctx = defaultContext();
  const run = (r: Receipt) => auditAndCategorizeReceipt(r, ctx);

  it('clean receipt has no flags', () => {
    const r = run(base({ items: [{ name: 'Widget', qty: 1, price: 10 }], subtotal: 10, tax: 1, total: 11 }));
    expect(codes(r)).toEqual([]);
  });
  it('TOTAL_MATH_ERROR when subtotal + tax + tip is more than 5 cents from the printed total', () => {
    expect(codes(run(base({ total: 10.06 })))).toContain('TOTAL_MATH_ERROR');
    expect(codes(run(base({ total: 10.04 })))).not.toContain('TOTAL_MATH_ERROR');
    // note: exactly 5 cents is decided by floating-point rounding (|10 - 10.05| is 0.05000000000000071), so it flags
  });
  it('SUBTOTAL_MISMATCH when the lines differ from the subtotal by more than 5 cents', () => {
    expect(codes(run(base({ subtotal: 10.1, total: 10.1 })))).toContain('SUBTOTAL_MISMATCH');
  });
  it('EXCESSIVE_TIP above 20.5% of the subtotal', () => {
    expect(codes(run(base({ tip: 2.06, total: 12.06 })))).toContain('EXCESSIVE_TIP');
    expect(codes(run(base({ tip: 2.05, total: 12.05 })))).not.toContain('EXCESSIVE_TIP');
  });
  it('DUPLICATE_ITEM for the same description and price', () => {
    const r = run(base({ items: [{ name: 'Widget', qty: 1, price: 10 }, { name: 'widget ', qty: 1, price: 10 }], subtotal: 20, total: 20 }));
    expect(codes(r)).toContain('DUPLICATE_ITEM');
  });
  it('OWNER_DRAW_SPLIT for personal accounts and wine / gift card text', () => {
    expect(codes(run(base({ items: [{ name: 'Gift card', qty: 1, price: 10 }] })))).toContain('OWNER_DRAW_SPLIT');
    expect(codes(run(base({ items: [{ name: 'Cabernet', qty: 1, price: 10 }] })))).toContain('OWNER_DRAW_SPLIT');
  });
  it('CAPEX_THRESHOLD from $2,500 per line, before tax', () => {
    const r = run(base({ items: [{ name: 'Hydraulic liftgate', qty: 1, price: 2850 }], subtotal: 2850, total: 2850 }));
    expect(codes(r)).toContain('CAPEX_THRESHOLD');
    expect(r.expensePhase).toBe('CapEx (One-Off)');
  });
  it('FUEL_GALLONS_CHECK only when fuel has no gallons text', () => {
    const fuel = base({ items: [{ name: 'Diesel', qty: 1, price: 50 }], subtotal: 50, total: 50 });
    expect(codes(run(fuel))).toContain('FUEL_GALLONS_CHECK');
    expect(codes(run({ ...fuel, extraNote: '21.500 GAL @ $3.809/GAL' }))).not.toContain('FUEL_GALLONS_CHECK');
  });
  it('MIXED_RECEIPT_SPLIT when lines land in more than one account', () => {
    const r = run(base({ items: [{ name: 'Diesel', qty: 1, price: 5 }, { name: 'Toll', qty: 1, price: 5 }], subtotal: 10, total: 10 }));
    expect(codes(r)).toContain('MIXED_RECEIPT_SPLIT');
    expect(r.qboSplits).toHaveLength(2);
  });
  it('the expense phase is set once, at first audit, and not recalculated', () => {
    const first = run(base());
    expect(first.expensePhase).toBe('Operating (Recurring)');
    const recoded = run({ ...first, items: [{ name: 'Hydraulic liftgate', qty: 1, price: 2850 }], subtotal: 2850, total: 2850 });
    expect(recoded.expensePhase).toBe('Operating (Recurring)');
  });
});

describe('fuel text', () => {
  it('reads gallons and price per gallon', () => {
    expect(extractFuelMetadata({ items: [], extraNote: 'PUMP #04: 21.500 GAL @ $3.809/GAL' })).toBe('21.50 gal @ $3.81/gal');
    expect(extractFuelMetadata({ items: [{ name: 'Diesel 12.25 gallons', qty: 1, price: 1 }] })).toBe('12.25 gal pumped');
    expect(extractFuelMetadata({ items: [] })).toBeNull();
  });
});

describe('OCR parsing', () => {
  it('reads merchant, date, card, items and totals', () => {
    const p = parseRawOcrTextToReceipt('PRO VAN\nDATE: 2026-10-14\nStraps $65.00\nSUBTOTAL $65.00\nTAX $5.00\nTOTAL $70.00\nVISA *4921', defaultContext(), 'x.png', new Date('2026-01-01T00:00:00Z'));
    expect(p).toMatchObject({ merchant: 'PRO VAN', date: '2026-10-14', paymentMethod: 'VISA *4921', subtotal: 65, tax: 5, total: 70 });
    expect(p.items).toEqual([{ name: 'Straps', qty: 1, price: 65 }]);
  });
  it('falls back to the file name and today when nothing is readable', () => {
    const p = parseRawOcrTextToReceipt('', defaultContext(), 'scan (3).JPG', new Date('2026-03-04T10:00:00Z'));
    expect(p).toMatchObject({ merchant: 'scan (3)', date: '2026-03-04', total: 0, paidFromAccount: 'Chase Ink Business Visa (*4921)' });
  });
});

describe('exports', () => {
  const ctx = defaultContext();
  const good = auditAndCategorizeReceipt(base({ items: [{ name: 'Diesel', qty: 1, price: 40 }, { name: 'Toll', qty: 1, price: 10 }], subtotal: 50, tax: 4, total: 54, extraNote: '12.000 GAL' }), ctx);
  const bad = auditAndCategorizeReceipt(base({ id: 'r2', total: 99 }), ctx);

  it('date format is MM/DD/YYYY; other formats pass through', () => {
    expect(formatDateForQBO('2026-10-14')).toBe('10/14/2026');
    expect(formatDateForQBO('10/12/26')).toBe('10/12/26');
  });
  it('bank-feed CSV: one row per receipt, full amount in Debit', () => {
    const lines = buildBankFeedCsv([good]).split('\n');
    expect(lines[0]).toBe('Date,Description,Credit,Debit');
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith(',,54.00')).toBe(true);
  });
  it('split CSV: one row per account, CapEx flag YES/NO, CLEAN when no flags', () => {
    const lines = buildSplitCsv([good]).split('\n');
    expect(lines[0]).toContain('CapEx_Flag');
    expect(lines).toHaveLength(3);                       // header + 2 splits
    expect(lines[1]).toContain('"NO"');
  });
  it('excluding math errors leaves out flagged receipts', () => {
    expect(codes(bad)).toContain('TOTAL_MATH_ERROR');
    expect(exportableReceipts([good, bad], true).map((r) => r.id)).toEqual(['r1']);
    expect(exportableReceipts([good, bad], false)).toHaveLength(2);
  });
  it('memo packs merchant, split hint, van, fuel and the first three items', () => {
    expect(buildQboBankMemo(good)).toContain('[SPLIT:');
    expect(buildQboBankMemo(good)).toContain('12.00 gal pumped');
  });
});
