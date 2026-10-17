import { CAPEX_LINE_THRESHOLD, DEFAULT_LINE_CATEGORY, FIXED_ASSET_ACCOUNT_ID, FIXED_ASSET_FALLBACK_NAME } from './defaults';
import type { CoaAccount, CoreContext, LineItem } from './types';

/** Accounts a user can currently pick: not archived, and Tier 2 hidden when CapEx mode is off. */
export function getActiveCategories(ctx: Pick<CoreContext, 'coaAccounts' | 'startupPhaseMode'>): CoaAccount[] {
  return ctx.coaAccounts.filter((c) => {
    if (c.archived) return false;
    if (!ctx.startupPhaseMode && c.tier === 'startup') return false;
    return true;
  });
}

/**
 * Chooses the account for one line item.
 *  1. A hand-picked account is locked and always wins.
 *  2. price x quantity >= $2,500 -> the fixed-asset account.
 *  3. First active account (list order) with a keyword that is a case-insensitive substring of the description.
 *  4. Otherwise keep the line's current account, else the default operating-supplies account.
 */
export function inferLineItemCategory(item: LineItem, ctx: CoreContext): string {
  if (item.manualCategory) return item.category as string;
  const lowerName = (item.name || '').toLowerCase();
  const price = Number(item.price || 0) * Number(item.qty || 1);

  if (price >= CAPEX_LINE_THRESHOLD) {
    return (ctx.coaAccounts.find((c) => c.id === FIXED_ASSET_ACCOUNT_ID) || { name: FIXED_ASSET_FALLBACK_NAME }).name;
  }

  for (const acc of getActiveCategories(ctx)) {
    if ((acc.keywords || []).some((kw) => lowerName.includes(kw.toLowerCase()))) {
      return acc.name;
    }
  }

  return item.category || DEFAULT_LINE_CATEGORY;
}

/** Maps the printed payment text to a "paid from" account using each account's match words. */
export function mapPaymentMethodToAccount(paymentStr: string | undefined, ctx: CoreContext): string {
  const upper = String(paymentStr ?? '').toUpperCase();
  const active = ctx.paymentAccounts.filter((a) => !a.archived);
  for (const a of active) {
    if ((a.match || []).some((m) => m && upper.includes(String(m).toUpperCase()))) return a.name;
  }
  return (active[0] || ctx.paymentAccounts[0] || { name: 'Chase Ink Business Visa (*4921)' }).name;
}

export function defaultFleetClass(ctx: CoreContext): string {
  return (ctx.fleetClasses.find((c) => !c.archived) || ctx.fleetClasses[0] || { name: 'Van #1 - Ford Transit 250' }).name;
}
