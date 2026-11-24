import { describe, expect, it } from "vitest";
import { catalogFilters, catalogQueryString, descendantSectionIds, positiveId, priceToMinorUnits, readCatalogQuery, sectionAncestors } from "../../../src/components/storefront/catalog/query";
import { effectiveCatalogPrice } from "../../../src/components/storefront/catalog/price";
import type { CatalogPrice, CatalogSection } from "../../../src/types/catalog";

const sections = [{ id: 1, parentId: null }, { id: 2, parentId: 1 }, { id: 3, parentId: 2 }, { id: 4, parentId: null }] as CatalogSection[];
const price = (code: string, amount: number, extra: Partial<CatalogPrice> = {}): CatalogPrice => ({ id: 1, priceType: { id: 1, code, name: code, active: true, sort: 1 }, price: amount, currency: "RUB", active: true, validFrom: null, validTo: null, ...extra });

describe("catalog browse contracts", () => {
  it("round-trips shared URL filters and converts prices to minor units including zero", () => {
    const parsed = readCatalogQuery(new URLSearchParams("query=+Keyboard+&section=1&priceFrom=0&priceTo=123.45&inStock=true&page=3"));
    expect(parsed.valid).toBe(true);
    expect(readCatalogQuery(new URLSearchParams(catalogQueryString(parsed.value).slice(1)))).toEqual(parsed);
    expect(catalogFilters(parsed.value, [1, 2, 3])).toEqual([
      { field: "active", operator: "eq", value: true },
      { field: "query", operator: "contains", value: "Keyboard" },
      { field: "sectionIds", operator: "in", value: [1, 2, 3] },
      { field: "inStock", operator: "eq", value: true },
      { field: "priceFrom", operator: "eq", value: 0 },
      { field: "priceTo", operator: "eq", value: 12345 },
    ]);
    expect(priceToMinorUnits("0.29")).toBe(29);
    expect(priceToMinorUnits("1.1")).toBe(110);
  });

  it("assembles filters without section IDs when no section is selected", () => {
    const { value } = readCatalogQuery(new URLSearchParams("query=Keyboard&inStock=true"));

    expect(catalogFilters(value)).toEqual([
      { field: "active", operator: "eq", value: true },
      { field: "query", operator: "contains", value: "Keyboard" },
      { field: "inStock", operator: "eq", value: true },
    ]);
  });

  it.each(["page=0", "page=1.2", "page=9007199254740992", "section=x", "inStock=yes", "priceFrom=-1", "priceTo=1.234", "priceFrom=2&priceTo=1", "priceFrom=1e3", "priceTo=90071992547409.92", "query=x&query=y"])("rejects invalid URL %s", (query) => {
    expect(readCatalogQuery(new URLSearchParams(query)).valid).toBe(false);
  });

  it("assembles descendant ids and ancestor breadcrumbs without looping on a cycle", () => {
    expect(descendantSectionIds(sections, 1)).toEqual([1, 2, 3]);
    expect(sectionAncestors(sections, 3).map((section) => section.id)).toEqual([1, 2, 3]);
    const cycle = [{ id: 1, parentId: 2 }, { id: 2, parentId: 1 }] as CatalogSection[];
    expect(descendantSectionIds(cycle, 1)).toEqual([1, 2]);
    expect(sectionAncestors(cycle, 1)).toHaveLength(2);
    expect(positiveId("slug")).toBeNull();
  });

  it("uses eligible BASE/SALE prices and ignores WHOLESALE and VIP", () => {
    expect(effectiveCatalogPrice([price("BASE", 10000), price("SALE", 8000), price("WHOLESALE", 10), price("VIP", 1)])).toEqual({ amount: 8000, currency: "RUB" });
    expect(effectiveCatalogPrice([price("BASE", 100), price("SALE", 200)])?.amount).toBe(100);
    expect(effectiveCatalogPrice([price("BASE", 0)])?.amount).toBe(0);
    expect(effectiveCatalogPrice([price("SALE", 50)])).toBeNull();
  });

  it("observes inclusive start and exclusive expiry, activity and currency availability", () => {
    const now = Date.parse("2026-11-20T10:00:00Z");
    const base = price("BASE", 100);
    expect(effectiveCatalogPrice([base, price("SALE", 50, { validFrom: "2026-11-20T10:00:00Z" })], now)?.amount).toBe(50);
    for (const extra of [{ active: false }, { validTo: "2026-11-20T10:00:00Z" }, { validFrom: "2026-11-21T10:00:00Z" }, { validFrom: "bad-date" }, { priceType: { ...base.priceType!, active: false } }]) {
      expect(effectiveCatalogPrice([base, price("SALE", 50, extra)], now)?.amount).toBe(100);
    }
    expect(effectiveCatalogPrice([price("BASE", 100, { currency: null })])).toBeNull();
    expect(effectiveCatalogPrice([base, price("SALE", 50, { currency: "USD" })])).toBeNull();
  });
});
