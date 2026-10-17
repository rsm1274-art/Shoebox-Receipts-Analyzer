import type { CoaAccount, CoreContext, FleetClass, PaymentAccount } from './types';

/** Built-in chart of accounts. Order matters: the first account whose keyword matches wins. */
export const DEFAULT_COA_ACCOUNTS: CoaAccount[] = [
  // Tier 1: core fleet operating accounts (permanent)
  { id: 'veh_fuel', name: 'Vehicle: Fuel & DEF', tier: 'operating', archived: false,
    keywords: ['fuel', 'diesel', 'unleaded', 'gasoline', 'def ', 'blue def', 'gallon', 'shell', 'chevron', 'exxon', 'pilot', 'loves'] },
  { id: 'veh_maint', name: 'Vehicle: Repairs & Maintenance', tier: 'operating', archived: false,
    keywords: ['oil change', 'tire', 'brake', 'car wash', 'wiper', 'alignment', 'filter', 'mechanic', 'service', 'wash'] },
  { id: 'veh_tolls', name: 'Vehicle: Parking, Tolls & Citations', tier: 'operating', archived: false,
    keywords: ['toll', 'ezpass', 'turnpike', 'parking', 'meter', 'garage', 'bridge'] },
  { id: 'op_supplies', name: 'Operating Supplies & Moving Gear', tier: 'operating', archived: false,
    keywords: ['ratchet', 'strap', 'blanket', 'dolly', 'shrink wrap', 'tape', 'gloves', 'ppe', 'bungee', 'tarp', 'moving'] },
  { id: 'meals_perdiem', name: 'Meals (50% Limit) & Driver Per Diem', tier: 'operating', archived: false,
    keywords: ['bistro', 'cafe', 'coffee', 'grill', 'burger', 'pizza', 'salmon', 'fries', 'flatbread', 'dinner', 'lunch', 'water', 'platter'] },
  { id: 'office_dispatch', name: 'Office & Dispatch Software', tier: 'operating', archived: false,
    keywords: ['toner', 'paper', 'usb', 'hub', 'clipboard', 'mount', 'charger', 'cable', 'dispatch', 'eld'] },
  { id: 'owners_draw', name: "Owner's Draw / Personal (Non-Reimbursable)", tier: 'operating', archived: false,
    keywords: ['gift card', 'playstation', 'xbox', 'cabernet', 'wine', 'beer', 'bourbon', 'personal', 'lottery'] },
  // Tier 2: CapEx, upfitting and launch accounts (toggleable / archivable)
  { id: 'startup_upfit', name: 'CapEx: Fleet Upfitting & Shelving', tier: 'startup', archived: false,
    keywords: ['e-track', 'etrack', 'shelving', 'bulkhead', 'partition', 'roof rack', 'cargo light', 'upfit', 'floor mat'] },
  { id: 'startup_dot', name: 'CapEx: Licensing, Permits & DOT', tier: 'startup', archived: false,
    keywords: ['usdot', 'mc number', 'llc', 'permit', 'registration', 'inspection fee', 'filing', 'authority'] },
  { id: 'startup_brand', name: 'CapEx: Branding & Signage', tier: 'startup', archived: false,
    keywords: ['decal', 'vinyl wrap', 'magnet', 'lettering', 'logo', 'uniform', 'signage'] },
  { id: 'fixed_assets', name: 'Fixed Assets: Equipment & Tools (> $2,500)', tier: 'startup', archived: false,
    keywords: ['liftgate', 'hydraulic', 'pallet jack', 'forklift', 'hoist', 'generator'] },
  { id: 'startup_preopen', name: 'CapEx: Pre-Opening Supplies', tier: 'startup', archived: false,
    keywords: ['initial stock', 'starter kit', 'launch kit', 'lockbox'] }
];

const PAYMENT_NAMES = [
  'Chase Ink Business Visa (*4921)',
  'Amex Plum Fleet Card (*1004)',
  'Relay Business Checking (*8832)',
  'Founder Personal Card (Due to Owner / Reimbursable)',
  'Petty Cash / Driver Cash'
];
export const PAYMENT_MATCH_DEFAULTS: string[][] = [['4921'], ['1004', 'amex'], ['8832', 'mastercard'], ['personal', '0091'], ['cash']];

export const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccount[] = PAYMENT_NAMES.map((name, i) => ({
  name, archived: false, match: PAYMENT_MATCH_DEFAULTS[i] || []
}));

export const DEFAULT_FLEET_CLASSES: FleetClass[] = [
  'Van #1 - Ford Transit 250',
  'Van #2 - Mercedes Sprinter',
  'Van #3 - RAM ProMaster',
  'General Fleet / Shared Ops',
  'CapEx / Launch Phase (Unassigned)'
].map((name) => ({ name, archived: false }));

/** A fresh, independent default context (deep copies, so callers can mutate safely). */
export function defaultContext(): CoreContext {
  return {
    coaAccounts: structuredClone(DEFAULT_COA_ACCOUNTS),
    startupPhaseMode: true,
    paymentAccounts: structuredClone(DEFAULT_PAYMENT_ACCOUNTS),
    fleetClasses: structuredClone(DEFAULT_FLEET_CLASSES)
  };
}

/** The single threshold used for capitalization: a line at or above this (price x quantity, before tax) is a fixed asset. */
export const CAPEX_LINE_THRESHOLD = 2500;
export const FIXED_ASSET_ACCOUNT_ID = 'fixed_assets';
export const FIXED_ASSET_FALLBACK_NAME = 'Fixed Assets: Equipment & Tools (> $2,500)';
export const DEFAULT_LINE_CATEGORY = 'Operating Supplies & Moving Gear';
