// Deterministic test corpus: seeded random receipts, OCR text and context variants.
import { defaultContext } from '../../src/core/defaults';
import type { CoreContext, LineItem, Receipt } from '../../src/core/types';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ContextVariant { id: string; ctx: CoreContext }

export function contextVariants(): ContextVariant[] {
  const base = () => defaultContext();
  const out: ContextVariant[] = [{ id: 'default', ctx: base() }];

  const off = base(); off.startupPhaseMode = false;
  out.push({ id: 'capex-mode-off', ctx: off });

  const archived = base();
  archived.coaAccounts.find((a) => a.id === 'veh_maint')!.archived = true;
  archived.coaAccounts.find((a) => a.id === 'startup_upfit')!.archived = true;
  out.push({ id: 'archived-accounts', ctx: archived });

  const custom = base();
  custom.coaAccounts.push({ id: 'custom_1', name: 'CapEx: Warehouse Security', tier: 'startup', archived: false, keywords: ['padlock', 'cctv', 'service', 'camera'] });
  custom.coaAccounts.push({ id: 'custom_2', name: 'Subcontractors', tier: 'operating', archived: false, keywords: ['labor', 'install', 'strap'] });
  out.push({ id: 'custom-accounts', ctx: custom });

  const lists = base();
  lists.paymentAccounts[0].archived = true;
  lists.paymentAccounts.push({ name: 'Fuel Card (*7777)', archived: false, match: ['7777', 'wex'] });
  lists.fleetClasses[0].archived = true;
  out.push({ id: 'managed-lists', ctx: lists });

  const noFixed = base();
  noFixed.coaAccounts = noFixed.coaAccounts.filter((a) => a.id !== 'fixed_assets');
  out.push({ id: 'no-fixed-asset-account', ctx: noFixed });

  return out;
}

const WORDS = [
  'Diesel 21.5 GAL @ $3.80/gal', 'BlueDEF 2.5G', 'Unleaded regular', 'Oil change', 'Tire rotation', 'Car wash', 'Wiper blades',
  'I-40 bridge toll', 'Parking garage', 'Ratchet straps 4pk', 'Moving blankets', 'Dolly', 'Shrink wrap', 'Work gloves',
  'Pan seared salmon', 'Coffee', 'Bottled water', 'Truffle fries', 'Cabernet glass', 'Gift card', 'PlayStation', 'Toner cartridge',
  'USB hub', 'Phone charger', 'Steel E-Track shelving', 'Cargo bulkhead partition', 'USDOT magnetic decal', 'Hydraulic liftgate',
  'Pallet jack', 'Generator', 'Service fee', 'Padlock', 'Widget', 'Misc supplies', 'Napkins', 'Sandpaper', 'Entire set', 'Labor install',
  'LAMINATE FLOORING', 'Starter kit', 'Permit filing'
];

const PAYMENTS = ['VISA *4921', 'AMEX *1004', 'MASTERCARD *8832', 'PERSONAL VISA *0091', 'CASH', 'DISCOVER', '', 'WEX 7777', 'DEBIT *1234'];
const MERCHANTS = ['PRO VAN UPFITTERS', 'METRO DIESEL', 'APEX TRUCK EQUIP', 'HIGHWAY 61 DINER', 'CITY HARDWARE', 'QUIK STOP'];

const cents = (n: number) => Math.round(n * 100) / 100;

export function randomReceipts(count: number, seed = 20261016, ctxCategories: string[] = []): Receipt[] {
  const rnd = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const out: Receipt[] = [];
  for (let n = 0; n < count; n++) {
    const itemCount = 1 + Math.floor(rnd() * 6);
    const items: LineItem[] = [];
    for (let i = 0; i < itemCount; i++) {
      const big = rnd() < 0.08;
      const price = cents(big ? 2400 + rnd() * 1500 : rnd() * 180 + 0.5);
      const item: LineItem = { name: pick(WORDS), qty: rnd() < 0.2 ? 1 + Math.floor(rnd() * 3) : 1, price };
      if (rnd() < 0.1 && ctxCategories.length) { item.category = pick(ctxCategories); item.manualCategory = true; }
      else if (rnd() < 0.1 && ctxCategories.length) { item.category = pick(ctxCategories); }
      if (rnd() < 0.05) items.push({ ...item });   // duplicate line
      items.push(item);
    }
    const sub = cents(items.reduce((s, i) => s + i.price * i.qty, 0));
    const tax = rnd() < 0.85 ? cents(sub * (0.04 + rnd() * 0.06)) : 0;
    const tip = rnd() < 0.25 ? cents(sub * (0.05 + rnd() * 0.3)) : 0;
    let total = cents(sub + tax + tip);
    let subtotal: number | null = sub;
    const r = rnd();
    if (r < 0.1) total = cents(total + (rnd() < 0.5 ? 10 : 0.03));    // math error (or tolerated penny difference)
    else if (r < 0.15) subtotal = cents(sub + 5);                        // subtotal mismatch
    else if (r < 0.18) subtotal = null;
    const receipt: Receipt = {
      id: `rcpt_${n}`,
      merchant: pick(MERCHANTS),
      date: rnd() < 0.9 ? `2026-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}` : '10/12/26',
      paymentMethod: pick(PAYMENTS),
      items, subtotal, tax, tip, total
    };
    if (rnd() < 0.15) receipt.extraNote = 'PUMP #04: 21.500 GAL @ $3.809/GAL';
    if (rnd() < 0.1) receipt.rawOcrText = `FUEL ${(10 + rnd() * 30).toFixed(3)} GALLONS`;
    if (rnd() < 0.15) receipt.paidFromAccount = 'Amex Plum Fleet Card (*1004)';
    if (rnd() < 0.15) receipt.vanClass = 'Van #2 - Mercedes Sprinter';
    if (rnd() < 0.15) receipt.expensePhase = rnd() < 0.5 ? 'CapEx (One-Off)' : 'Operating (Recurring)';
    out.push(receipt);
  }
  return out;
}

export const OCR_TEXTS: { fileName: string; text: string }[] = [
  { fileName: 'clean.png', text: 'PRO VAN UPFITTERS\n1140 Industrial Pkwy\nDATE: 2026-10-14 TIME: 09:42\nSteel E-Track Shelving Kit $340.00\nCargo Bulkhead Partition 480.00\nHeavy Duty Ratchet Straps 65.00\nSUBTOTAL $885.00\nTAX $81.86\nTIP $0.00\nTOTAL $966.86\nPAID VIA VISA *4921' },
  { fileName: 'fuel.jpg', text: 'METRO DIESEL & FLEET STOP\n780 I-40 East\n10/15/2026\nULSD #2 Diesel 21.50 GAL @ $3.80/gal 81.70\nBlueDEF 18.50\nSUB TOTAL 100.20\nTAX 4.30\nTOTAL 104.50\nAMEX *1004' },
  { fileName: 'noisy.png', text: '| 12345\nHW 61 DINER |\nDinner 32.00\nTIP 28.00\nGRATUITY 5.00\nCASH 100.00\nCHANGE 10.00\nAmount Due 146.50' },
  { fileName: 'no-prices.png', text: 'JUST SOME TEXT\nwith no amounts at all' },
  { fileName: 'receipt scan (3).JPG', text: '' },
  { fileName: 'dated.png', text: 'QUIK STOP #12\nDATE: 3/4/26\nCoffee 2.19\nTOTAL 2.19\nDEBIT' },
  { fileName: 'personal.png', text: 'WINE SHOP\nCabernet 24.00\nGift card 50.00\nSubtotal 74.00\nTax 6.20\nTotal 80.20\nPERSONAL VISA *0091' },
  { fileName: 'weird.png', text: '***\n007\nA\nB&B Hardware!!\n  Padlock  $12.99 \n  Entire set 5.01\nVAT 1.00\nTOTAL 19.00\nMASTERCARD' }
];

export const PAYMENT_STRINGS = ['VISA *4921', 'visa *4921', 'AMEX *1004', 'AMEX', 'MASTERCARD *8832', 'MASTERCARD', 'PERSONAL VISA *0091', '0091', 'CASH', 'CASH PAID', 'DISCOVER', 'DEBIT *1234', '', 'WEX 7777', '7777'];

export const SPLIT_CASES: { items: any[]; tax: number; tip: number; total?: number | null }[] = [
  { items: [{ name: 'A', qty: 1, price: 65, category: 'X' }, { name: 'B', qty: 1, price: 340, category: 'Y' }, { name: 'C', qty: 1, price: 95, category: 'X' }], tax: 41.23, tip: 0 },
  { items: [{ name: 'A', qty: 1, price: 10, category: 'X' }, { name: 'B', qty: 1, price: 10, category: 'Y' }, { name: 'C', qty: 1, price: 10, category: 'Z' }], tax: 0.1, tip: 0, total: 30.1 },
  { items: [{ name: 'A', qty: 1, price: 0, category: 'X' }, { name: 'B', qty: 1, price: 0, category: 'Y' }], tax: 5, tip: 1, total: 6 },
  { items: [{ name: 'A', qty: 2, price: 9.99, category: 'X' }], tax: 1.6, tip: 3, total: 24.58 },
  { items: [{ name: 'A', qty: 1, price: 33.33, category: 'X' }, { name: 'B', qty: 1, price: 33.33, category: 'Y' }, { name: 'C', qty: 1, price: 33.34, category: 'Z' }], tax: 7, tip: 0 },
  { items: [{ name: 'A', qty: 1, price: 50 }, { name: 'B', qty: 1, price: 50 }], tax: 0, tip: 0, total: 150 },
  { items: [], tax: 3, tip: 1, total: 4 }
];
