import type { Receipt } from './types';

/** YYYY-MM-DD -> MM/DD/YYYY (what the QuickBooks importer expects); other formats pass through as read. */
export function formatDateForQBO(dateStr: string | undefined | null, emptyFallback = '10/16/2026'): string {
  if (!dateStr) return emptyFallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${mm}/${dd}/${yyyy}`;
  }
  return dateStr;
}

export function escapeCsvCell(val: unknown): string {
  const str = String(val ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

/** The description packed into bank-feed and .QBO rows: merchant | split hint | van | fuel | first three items. */
export function buildQboBankMemo(receipt: Receipt): string {
  const splits = receipt.qboSplits || [];
  const splitHint = splits.length > 1
    ? `[SPLIT: ${splits.map((s) => `${s.category.split(':')[0]} $${s.qboSplitAmount.toFixed(2)}`).join(' / ')}]`
    : `[${receipt.category}]`;

  const vanShort = (receipt.vanClass || 'General').split(' - ')[0];
  const fuelStr = receipt.fuelMeta ? ` | ${receipt.fuelMeta}` : '';
  const itemsSummary = (receipt.items || []).map((i) => i.name).slice(0, 3).join(', ');

  return `${receipt.merchant} | ${splitHint} | ${vanShort}${fuelStr} | ${itemsSummary}`;
}

/** Receipts to export; optionally leaving out those still flagged with a math error. */
export function exportableReceipts(receipts: Receipt[], excludeMathErrors: boolean): Receipt[] {
  if (!excludeMathErrors) return receipts;
  return receipts.filter((r) => !(r.anomalies || []).some((a) => a.code === 'TOTAL_MATH_ERROR' || a.code === 'SUBTOTAL_MISMATCH'));
}

const isoDay = (now: Date) => now.toISOString().slice(0, 10);

/** Option 1: Date, Description, Credit, Debit (one row per receipt, full amount in Debit). */
export function buildBankFeedCsv(list: Receipt[]): string {
  const headers = ['Date', 'Description', 'Credit', 'Debit'];
  const rows = list.map((r) => [
    formatDateForQBO(r.date),
    escapeCsvCell(buildQboBankMemo(r)),
    '',
    Number(r.total || 0).toFixed(2)
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
export const bankFeedFileName = (now: Date) => `QBO_BankFeed_4Col_${isoDay(now)}.csv`;

/** Option 2: one row per account split, tax and tip included. */
export function buildSplitCsv(list: Receipt[]): string {
  const headers = [
    'ReceiptRefID', 'Date', 'Vendor_Payee', 'PaidFromAccount', 'QBO_Category_Account',
    'Split_Amount_Inc_Tax', 'Class_Van_ID', 'CapEx_Flag', 'Memo_Line_Items', 'Audit_Flags'
  ];
  const rows: string[][] = [];
  list.forEach((r) => {
    const auditFlags = (r.anomalies || []).map((a) => a.code).join('; ') || 'CLEAN';
    (r.qboSplits || []).forEach((sp) => {
      const memo = sp.itemNames.join('; ') + (r.fuelMeta ? ` [${r.fuelMeta}]` : '');
      rows.push([
        escapeCsvCell(r.id),
        formatDateForQBO(r.date),
        escapeCsvCell(r.merchant),
        escapeCsvCell(r.paidFromAccount),
        escapeCsvCell(sp.category),
        Number(sp.qboSplitAmount).toFixed(2),
        escapeCsvCell(r.vanClass),
        escapeCsvCell(/CapEx|Startup/.test(r.expensePhase || '') ? 'YES' : 'NO'),
        escapeCsvCell(memo),
        escapeCsvCell(auditFlags)
      ]);
    });
  });
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
export const splitCsvFileName = (now: Date) => `QBO_Detailed_Splits_${isoDay(now)}.csv`;

/** Option 3: OFX 1.02 credit-card statement (.QBO) with the receipt id as the transaction id. */
export function buildQboWebConnect(list: Receipt[], now: Date): string {
  const nowStamp = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const trnBlocks = list.map((r) => {
    const dtPosted = (r.date || '2026-10-16').replace(/-/g, '') + '120000';
    const cleanName = (r.merchant || 'VENDOR').replace(/[<>&]/g, '').slice(0, 32);
    const cleanMemo = buildQboBankMemo(r).replace(/[<>&]/g, '').slice(0, 240);
    return `
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>${dtPosted}
<TRNAMT>-${Number(r.total || 0).toFixed(2)}
<FITID>${r.id}
<NAME>${cleanName}
<MEMO>${cleanMemo}
</STMTTRN>`;
  }).join('\n');

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>${nowStamp}
<LANGUAGE>ENG
<INTU.BID>3000
</SONRS>
</SIGNONMSGSRSV1>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<TRNUID>1
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<CCSTMTRS>
<CURDEF>USD
<CCACCTFROM><ACCTID>RECEIPTAUDIT-FLEET-4921</CCACCTFROM>
<BANKTRANLIST>
<DTSTART>20260101000000
<DTEND>${nowStamp}
${trnBlocks}
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>`;
}
export const webConnectFileName = (now: Date) => `ReceiptAudit_${isoDay(now)}.qbo`;
