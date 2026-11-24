import type { CrudFilters } from "@refinedev/core";
import type { CatalogSection } from "@/types/catalog";

export const CATALOG_PAGE_SIZE = 20;
export type CatalogQuery = {
  query: string;
  section: number | null;
  priceFrom: string;
  priceTo: string;
  inStock: boolean;
  page: number;
};

export const positiveId = (value: string): number | null =>
  /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;

// URL/form prices are major units; the API accepts integer minor units.
export const priceToMinorUnits = (value: string): number | null => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
};

export const readCatalogQuery = (params: URLSearchParams): { value: CatalogQuery; valid: boolean } => {
  const section = params.get("section");
  const page = params.get("page");
  const value: CatalogQuery = {
    query: (params.get("query") ?? "").trim(),
    section: section === null ? null : positiveId(section),
    priceFrom: params.get("priceFrom") ?? "",
    priceTo: params.get("priceTo") ?? "",
    inStock: params.get("inStock") === "true",
    page: page === null ? 1 : positiveId(page) ?? 1,
  };
  const from = value.priceFrom === "" ? undefined : priceToMinorUnits(value.priceFrom);
  const to = value.priceTo === "" ? undefined : priceToMinorUnits(value.priceTo);
  return { value, valid:
    ["query", "section", "priceFrom", "priceTo", "inStock", "page"].every((key) => params.getAll(key).length <= 1) &&
    (section === null || value.section !== null) && (page === null || positiveId(page) !== null) &&
    (!params.has("inStock") || ["true", "false"].includes(params.get("inStock")!)) &&
    from !== null && to !== null && (from === undefined || to === undefined || from <= to),
  };
};

export const catalogQueryString = (value: CatalogQuery): string => {
  const params = new URLSearchParams();
  if (value.query.trim()) params.set("query", value.query.trim());
  if (value.section !== null) params.set("section", String(value.section));
  if (value.priceFrom !== "") params.set("priceFrom", value.priceFrom);
  if (value.priceTo !== "") params.set("priceTo", value.priceTo);
  if (value.inStock) params.set("inStock", "true");
  if (value.page > 1) params.set("page", String(value.page));
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const descendantSectionIds = (sections: CatalogSection[], id: number): number[] => {
  const ids = new Set([id]);
  const pending = [id];
  while (pending.length) {
    const parent = pending.pop();
    sections.forEach((section) => {
      if (section.parentId === parent && !ids.has(section.id)) {
        ids.add(section.id);
        pending.push(section.id);
      }
    });
  }
  return Array.from(ids);
};

export const sectionAncestors = (sections: CatalogSection[], id: number): CatalogSection[] => {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const seen = new Set<number>();
  const ancestors: CatalogSection[] = [];
  let section = byId.get(id);
  while (section && !seen.has(section.id)) {
    seen.add(section.id);
    ancestors.unshift(section);
    section = section.parentId === null ? undefined : byId.get(section.parentId);
  }
  return ancestors;
};

export const catalogFilters = (
  value: Omit<CatalogQuery, "section" | "page">,
  sectionIds?: number[],
): CrudFilters => {
  const filters: CrudFilters = [{ field: "active", operator: "eq", value: true }];
  if (value.query) filters.push({ field: "query", operator: "contains", value: value.query });
  if (sectionIds !== undefined) filters.push({ field: "sectionIds", operator: "in", value: sectionIds });
  if (value.inStock) filters.push({ field: "inStock", operator: "eq", value: true });
  for (const field of ["priceFrom", "priceTo"] as const) {
    if (value[field] !== "") filters.push({ field, operator: "eq", value: priceToMinorUnits(value[field]) });
  }
  return filters;
};
