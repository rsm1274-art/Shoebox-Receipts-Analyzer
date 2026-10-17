import { DEFAULT_LINE_CATEGORY } from './defaults';
import type { Split } from './types';

interface SplitInput {
  items?: { name: string; qty?: number; price?: number; category?: string }[];
  tax?: number;
  tip?: number;
  total?: number | null;
}

/**
 * Pro-rata tax and tip allocation.
 *   split(account) = items(account) + (tax + tip) x items(account) / items(all)
 * The last split absorbs rounding pennies so the splits add up to the printed total, but only when the
 * receipt's own math is within 5 cents (otherwise the receipt carries a TOTAL_MATH_ERROR flag instead).
 */
export function computeProRataSplits(receipt: SplitInput): Split[] {
  const items = receipt.items || [];
  const computedSub = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
  const taxAndTip = Number(receipt.tax || 0) + Number(receipt.tip || 0);
  const targetGrandTotal = Number(receipt.total || (computedSub + taxAndTip));

  // Group by account, keeping first-seen order
  const groups = new Map<string, Split>();
  items.forEach((item) => {
    const cat = item.category || DEFAULT_LINE_CATEGORY;
    const itemTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
    let g = groups.get(cat);
    if (!g) {
      g = { category: cat, rawSubtotal: 0, allocatedTaxTip: 0, qboSplitAmount: 0, itemNames: [] };
      groups.set(cat, g);
    }
    g.rawSubtotal += itemTotal;
    g.itemNames.push(item.name);
  });

  const splits = [...groups.values()];
  let runningSum = 0;

  splits.forEach((sp, idx) => {
    const ratio = computedSub > 0 ? sp.rawSubtotal / computedSub : 1 / Math.max(splits.length, 1);
    sp.allocatedTaxTip = taxAndTip * ratio;
    if (idx === splits.length - 1 && Math.abs(computedSub + taxAndTip - targetGrandTotal) < 0.05) {
      sp.qboSplitAmount = Number((targetGrandTotal - runningSum).toFixed(2));
    } else {
      sp.qboSplitAmount = Number((sp.rawSubtotal + sp.allocatedTaxTip).toFixed(2));
      runningSum += sp.qboSplitAmount;
    }
  });

  return splits;
}
