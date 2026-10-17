import { mapPaymentMethodToAccount } from './categorize';
import type { CoreContext, LineItem, ParsedReceipt } from './types';

/**
 * Turns OCR text into a receipt: merchant (first usable line of the first four), date, card, item lines
 * ("description ... 12.34") and Subtotal / Tax / Tip / Total lines.
 * `today` is injectable so tests are deterministic.
 */
export function parseRawOcrTextToReceipt(
  rawText: string,
  ctx: CoreContext,
  fallbackFileName = 'Uploaded Receipt',
  today: Date = new Date()
): ParsedReceipt {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  let merchant = fallbackFileName.replace(/\.[^/.]+$/, '');
  let date = today.toISOString().slice(0, 10);
  let paymentMethod = 'VISA *4921';
  const items: LineItem[] = [];
  let subtotal: number | null = null;
  let tax = 0;
  let tip = 0;
  let total: number | null = null;

  for (const line of lines.slice(0, 4)) {
    if (line.length > 3 && !line.includes('DATE:') && !/^\d+$/.test(line)) {
      merchant = line.replace(/[^a-zA-Z0-9 &'-]/g, '').trim();
      break;
    }
  }

  const dateMatch = rawText.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dateMatch) date = dateMatch[0];

  const payMatch = rawText.match(/(VISA|AMEX|MASTERCARD|DISCOVER|DEBIT|CASH)\s*(?:\*+\d{4})?/i);
  if (payMatch) paymentMethod = payMatch[0].toUpperCase();

  const priceLineRegex = /^(.+?)\s+\$?(\d+\.\d{2})$/;

  lines.forEach((line) => {
    const cleanLine = line.replace(/[|]/g, '').trim();
    const match = cleanLine.match(priceLineRegex);
    if (match) {
      const label = match[1].replace(/^[-\d\s*]+/, '').trim();
      const amount = parseFloat(match[2]);
      const upperLabel = label.toUpperCase();

      if (upperLabel.includes('SUBTOTAL') || upperLabel.includes('SUB TOTAL')) {
        subtotal = amount;
      } else if (upperLabel.includes('TAX') || upperLabel.includes('VAT')) {
        tax = amount;
      } else if (upperLabel.includes('TIP') || upperLabel.includes('GRATUITY')) {
        tip = amount;
      } else if (upperLabel.includes('TOTAL') || upperLabel.includes('AMOUNT DUE')) {
        total = amount;
      } else if (label.length >= 2 && !upperLabel.includes('CASH') && !upperLabel.includes('CHANGE')) {
        items.push({ name: label, qty: 1, price: amount });
      }
    }
  });

  const computedSub = items.reduce((s, i) => s + i.price, 0);
  const finalSubtotal: number = subtotal === null ? computedSub : subtotal;
  const finalTotal: number = total === null ? finalSubtotal + tax + tip : total;

  return {
    merchant: merchant || 'Unidentified Merchant',
    date,
    paymentMethod,
    paidFromAccount: mapPaymentMethodToAccount(paymentMethod, ctx),
    items,
    subtotal: finalSubtotal,
    tax,
    tip,
    total: finalTotal,
    rawOcrText: rawText
  };
}
