import { defaultFleetClass, inferLineItemCategory, mapPaymentMethodToAccount } from './categorize';
import { DEFAULT_LINE_CATEGORY } from './defaults';
import { computeProRataSplits } from './splits';
import type { Anomaly, CoreContext, Receipt } from './types';

export const CAPEX_THRESHOLD = 2500;
export const MATH_TOLERANCE = 0.05;
export const EXCESSIVE_TIP_PCT = 20.5;

/** "21.500 GAL @ $3.809/GAL" style text -> a short fuel note, or null. */
export function extractFuelMetadata(receipt: Pick<Receipt, 'rawOcrText' | 'extraNote' | 'items'>): string | null {
  const combinedText = [
    receipt.rawOcrText || '',
    receipt.extraNote || '',
    ...(receipt.items || []).map((i) => i.name)
  ].join(' ');

  const galMatch = combinedText.match(/(\d+\.\d{1,3})\s*GAL(?:LONS?)?(?:\s*@\s*\$?(\d+\.\d{2,3}))?/i);
  if (galMatch) {
    const gallons = parseFloat(galMatch[1]).toFixed(2);
    const pricePerGal = galMatch[2] ? `$${parseFloat(galMatch[2]).toFixed(2)}/gal` : '';
    return pricePerGal ? `${gallons} gal @ ${pricePerGal}` : `${gallons} gal pumped`;
  }
  return null;
}

/**
 * Categorizes every line, computes the tax-inclusive splits and runs the audit checks.
 * Pure: returns a new receipt, the input is not modified.
 */
export function auditAndCategorizeReceipt(input: Receipt, ctx: CoreContext): Receipt {
  const receipt: Receipt = { ...input };
  const anomalies: Anomaly[] = [];

  if (!receipt.paidFromAccount) {
    receipt.paidFromAccount = mapPaymentMethodToAccount(receipt.paymentMethod || '', ctx);
  }
  if (!receipt.vanClass) {
    receipt.vanClass = defaultFleetClass(ctx);
  }

  const items = receipt.items || [];
  const computedSubtotal = items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
  const taxAndTip = Number(receipt.tax || 0) + Number(receipt.tip || 0);

  receipt.items = items.map((item) => {
    const lineBase = (Number(item.price) || 0) * (Number(item.qty) || 1);
    const matchedCat = inferLineItemCategory(item, ctx);
    const ratio = computedSubtotal > 0 ? lineBase / computedSubtotal : 0;
    const taxInclusiveAmount = lineBase + taxAndTip * ratio;

    // Rule A: personal / non-reimbursable or alcohol
    const lowerName = (item.name || '').toLowerCase();
    if (
      matchedCat.includes("Owner's Draw") || (ctx.coaAccounts.find((c) => c.name === matchedCat) || { id: undefined }).id === 'owners_draw' ||
      lowerName.includes('wine') ||
      lowerName.includes('cabernet') ||
      lowerName.includes('gift card')
    ) {
      anomalies.push({
        severity: 'high',
        code: 'OWNER_DRAW_SPLIT',
        title: `Personal / Non-Deductible Item: "${item.name}"`,
        detail: `"${item.name}" ($${lineBase.toFixed(2)}) is routed to "Owner's Draw / Personal" so it doesn't pollute business operating deductions.`
      });
    }

    // Rule B: capitalization threshold
    if (lineBase >= CAPEX_THRESHOLD) {
      anomalies.push({
        severity: 'high',
        code: 'CAPEX_THRESHOLD',
        title: `Fixed Asset / CapEx Threshold Alert ($${lineBase.toFixed(2)})`,
        detail: `"${item.name}" exceeds the $2,500 IRS De Minimis Safe Harbor threshold. Flagged under "Fixed Assets: Equipment & Tools" for Section 179 / Depreciation.`
      });
    }

    return { ...item, category: matchedCat, taxInclusiveAmount: Number(taxInclusiveAmount.toFixed(2)) };
  });

  const qboSplits = computeProRataSplits(receipt);
  receipt.qboSplits = qboSplits;

  let dominantCategory = DEFAULT_LINE_CATEGORY;
  let maxSplitVal = -1;
  let hasStartupCategory = false;

  qboSplits.forEach((sp) => {
    if (sp.qboSplitAmount > maxSplitVal) {
      maxSplitVal = sp.qboSplitAmount;
      dominantCategory = sp.category;
    }
    const coaObj = ctx.coaAccounts.find((c) => c.name === sp.category);
    if ((coaObj && coaObj.tier === 'startup') || sp.category.startsWith('CapEx') || sp.category.startsWith('Startup') || sp.category.startsWith('Fixed Assets')) {
      hasStartupCategory = true;
    }
  });

  receipt.category = dominantCategory;
  if (!receipt.expensePhase) {
    receipt.expensePhase = hasStartupCategory ? 'CapEx (One-Off)' : 'Operating (Recurring)';
  }

  // Rule C: split across several accounts
  if (qboSplits.length > 1) {
    const splitSummary = qboSplits.map((s) => `${s.category.split(':')[0]} ($${s.qboSplitAmount.toFixed(2)})`).join(' + ');
    anomalies.push({
      severity: 'medium',
      code: 'MIXED_RECEIPT_SPLIT',
      title: `Split Transaction Required (${qboSplits.length} QBO Accounts)`,
      detail: `Receipt spans multiple categories: ${splitSummary}. Tax & tip have been pro-rated across each split automatically.`
    });
  }

  // Rule D: fuel gallons
  const isFuelReceipt = qboSplits.some((s) => s.category.includes('Fuel') || (ctx.coaAccounts.find((c) => c.name === s.category) || { id: undefined }).id === 'veh_fuel');
  const fuelMeta = extractFuelMetadata(receipt);
  receipt.fuelMeta = fuelMeta;
  if (isFuelReceipt && !fuelMeta) {
    anomalies.push({
      severity: 'low',
      code: 'FUEL_GALLONS_CHECK',
      title: 'Fuel Receipt Missing Gallons Metadata',
      detail: 'Categorized under Vehicle: Fuel & DEF, but gallons pumped were not detected in OCR text for IFTA/fleet mileage tracking.'
    });
  }

  // line item sum vs subtotal
  const declaredSubtotal = Number(receipt.subtotal ?? computedSubtotal);
  if (receipt.items.length > 0 && Math.abs(computedSubtotal - declaredSubtotal) > MATH_TOLERANCE) {
    anomalies.push({
      severity: 'high',
      code: 'SUBTOTAL_MISMATCH',
      title: 'Line Item Sum ≠ Subtotal',
      detail: `Sum of line items is $${computedSubtotal.toFixed(2)}, but receipt subtotal states $${declaredSubtotal.toFixed(2)} (Diff: $${Math.abs(computedSubtotal - declaredSubtotal).toFixed(2)}).`
    });
  }

  // subtotal + tax + tip vs printed total
  const tax = Number(receipt.tax || 0);
  const tip = Number(receipt.tip || 0);
  const declaredTotal = Number(receipt.total || 0);
  const expectedTotal = declaredSubtotal + tax + tip;

  if (Math.abs(expectedTotal - declaredTotal) > MATH_TOLERANCE) {
    anomalies.push({
      severity: 'high',
      code: 'TOTAL_MATH_ERROR',
      title: `Receipt Total Math Discrepancy ($${Math.abs(expectedTotal - declaredTotal).toFixed(2)})`,
      detail: `Subtotal ($${declaredSubtotal.toFixed(2)}) + Tax ($${tax.toFixed(2)}) + Tip ($${tip.toFixed(2)}) = $${expectedTotal.toFixed(2)}, but printed Total is $${declaredTotal.toFixed(2)}.`
    });
  }

  // tip percentage
  if (declaredSubtotal > 0 && tip > 0) {
    const tipPct = (tip / declaredSubtotal) * 100;
    if (tipPct > EXCESSIVE_TIP_PCT) {
      anomalies.push({
        severity: 'medium',
        code: 'EXCESSIVE_TIP',
        title: `High Gratuity Flag (${tipPct.toFixed(1)}%)`,
        detail: `Tip of $${tip.toFixed(2)} on $${declaredSubtotal.toFixed(2)} subtotal is ${tipPct.toFixed(1)}%, exceeding 20% fleet meal policy.`
      });
    }
  }

  // duplicate lines (same description and price)
  const seenItems = new Map<string, number>();
  receipt.items.forEach((item) => {
    const key = `${(item.name || '').toLowerCase().trim()}_${Number(item.price).toFixed(2)}`;
    seenItems.set(key, (seenItems.get(key) || 0) + 1);
  });
  for (const [key, count] of seenItems) {
    if (count > 1) {
      const [dupName, dupPrice] = key.split('_');
      anomalies.push({
        severity: 'medium',
        code: 'DUPLICATE_ITEM',
        title: `Double-Scanned Item (${count}x)`,
        detail: `"${dupName.toUpperCase()}" at $${dupPrice} appears ${count} times on this receipt.`
      });
    }
  }

  receipt.anomalies = anomalies;
  receipt.computedSubtotal = computedSubtotal;
  receipt.expectedTotal = expectedTotal;
  return receipt;
}
