export type Tier = 'operating' | 'startup';
export type Severity = 'high' | 'medium' | 'low';
export type AnomalyCode =
  | 'OWNER_DRAW_SPLIT'
  | 'CAPEX_THRESHOLD'
  | 'MIXED_RECEIPT_SPLIT'
  | 'FUEL_GALLONS_CHECK'
  | 'SUBTOTAL_MISMATCH'
  | 'TOTAL_MATH_ERROR'
  | 'EXCESSIVE_TIP'
  | 'DUPLICATE_ITEM';

/** One account in the chart of accounts the app files receipt lines into. */
export interface CoaAccount {
  id: string;
  name: string;
  tier: Tier;
  archived: boolean;
  keywords: string[];
}

/** A "paid from" card or bank account. `match` words are looked for in the printed payment text. */
export interface PaymentAccount {
  name: string;
  archived: boolean;
  match: string[];
}

/** A van / QuickBooks class. */
export interface FleetClass {
  name: string;
  archived: boolean;
}

/** Everything the rules need that is not on the receipt itself. Passed explicitly instead of read from globals. */
export interface CoreContext {
  coaAccounts: CoaAccount[];
  startupPhaseMode: boolean;
  paymentAccounts: PaymentAccount[];
  fleetClasses: FleetClass[];
}

export interface LineItem {
  name: string;
  qty: number;
  price: number;
  category?: string;
  /** Set when the user picked the account by hand; locks the line against re-categorizing. */
  manualCategory?: boolean;
  taxInclusiveAmount?: number;
}

export interface Split {
  category: string;
  rawSubtotal: number;
  allocatedTaxTip: number;
  qboSplitAmount: number;
  itemNames: string[];
}

export interface Anomaly {
  severity: Severity;
  code: AnomalyCode;
  title: string;
  detail: string;
}

export interface Receipt {
  id: string;
  merchant: string;
  /** YYYY-MM-DD when known; OCR may leave other formats as read. */
  date: string;
  paymentMethod?: string;
  paidFromAccount?: string;
  vanClass?: string;
  expensePhase?: string;
  items: LineItem[];
  subtotal?: number | null;
  tax?: number;
  tip?: number;
  total?: number | null;
  extraNote?: string;
  rawOcrText?: string;
  engineUsed?: string;
  // derived by auditAndCategorizeReceipt
  category?: string;
  qboSplits?: Split[];
  anomalies?: Anomaly[];
  fuelMeta?: string | null;
  computedSubtotal?: number;
  expectedTotal?: number;
  // review workflow (schema 2)
  status?: ReceiptStatus;
  statusAt?: string;
  statusBy?: string;
  waivers?: Waiver[];
  batchId?: string | null;
  exportedAt?: string | null;
  revision?: number;
  [extra: string]: unknown;
}

export type ReceiptStatus = 'captured' | 'needs_review' | 'approved' | 'exported';

/** A High flag accepted with a written reason. Matches the flag by `key` = code + '|' + title. */
export interface Waiver {
  code: string;
  key: string;
  note: string;
  by: string;
  at: string;
}

export interface ParsedReceipt {
  merchant: string;
  date: string;
  paymentMethod: string;
  paidFromAccount: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  rawOcrText: string;
}
