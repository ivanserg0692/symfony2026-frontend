import type { CatalogPrice } from "@/types/catalog";

/** Checkout requires an active BASE and uses min(BASE, SALE), never WHOLESALE/VIP. */
export const effectiveCatalogPrice = (prices: CatalogPrice[], now = Date.now()): { amount: number; currency: string } | null => {
  const byType = new Map<string, CatalogPrice>();
  for (const price of prices) {
    if (price.active !== true || price.priceType?.active !== true || price.price === null ||
      !Number.isSafeInteger(price.price) || price.price < 0 ||
      (price.validFrom !== null && !(Date.parse(price.validFrom) <= now)) ||
      (price.validTo !== null && !(Date.parse(price.validTo) > now))) continue;
    if (price.priceType.code) byType.set(price.priceType.code, price);
  }
  const base = byType.get("BASE");
  if (!base || !base.currency || !/^[A-Z]{3}$/.test(base.currency)) return null;
  const sale = byType.get("SALE");
  // The API cannot resolve conflicting currencies. Do not invent an exchange rate.
  if (sale && sale.price! < base.price! && sale.currency !== base.currency) return null;
  return { amount: Math.min(base.price!, sale?.price ?? base.price!), currency: base.currency };
};

export function formatCatalogAmount(locale: string, amount: number, currency: string) {
  const value = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
  return `${value} ${currency}`;
}
