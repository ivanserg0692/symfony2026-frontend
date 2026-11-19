"use client";

import type { BaseRecord, CrudFilters, DataProvider, GetListParams } from "@refinedev/core";
import { apiFetch } from "@/lib/api-client";
import { filtersToQuery, getPaginatedList, sharedMethods } from "./shared";

// These endpoints expose named query parameters, not a general filter language.
const catalogFilterOperators: Record<string, readonly string[]> = {
  query: ["eq", "contains"],
  sectionId: ["eq"],
  sectionIds: ["in"],
  active: ["eq"],
  priceFrom: ["eq"],
  priceTo: ["eq"],
  priceTypeCodes: ["in"],
  inStock: ["eq"],
};

const catalogFiltersToQuery = (filters?: CrudFilters) => {
  // Validate the common filter shape before applying catalog-specific rules.
  const query = filtersToQuery(filters);
  filters?.forEach((filter) => {
    if (!("field" in filter) || !Object.prototype.hasOwnProperty.call(query, filter.field)) {
      return;
    }
    if (!catalogFilterOperators[filter.field]?.includes(filter.operator)) {
      throw new Error(`Unsupported filter: ${filter.field} ${filter.operator}.`);
    }
    if (["sectionIds", "priceTypeCodes"].includes(filter.field) !== Array.isArray(filter.value)) {
      throw new Error(`Invalid filter shape: ${filter.field}.`);
    }
  });
  return query;
};

export const catalogDataProvider = {
  ...sharedMethods,
  getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams) => {
    const { resource, filters, sorters } = params;
    if (resource === "catalog/sections") {
      if (filters?.length || sorters?.length) {
        throw new Error("Filtering and custom sorting are not supported for catalog/sections.");
      }
      const data = await apiFetch<TData[]>(`/${resource}`);
      return { data, total: data.length };
    }
    if (sorters?.length) {
      throw new Error(`Custom sorting is not supported for ${resource}.`);
    }
    return getPaginatedList<TData>(params, catalogFiltersToQuery(filters), true);
  },
} satisfies DataProvider;
