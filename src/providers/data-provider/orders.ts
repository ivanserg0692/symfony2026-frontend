"use client";

import type { BaseRecord, DataProvider, GetListParams } from "@refinedev/core";
import { filtersToQuery, getPaginatedList, sharedMethods } from "./shared";

export const ordersDataProvider = {
  ...sharedMethods,
  getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams) => {
    if (params.sorters?.length) {
      throw new Error(`Custom sorting is not supported for ${params.resource}.`);
    }
    const query = filtersToQuery(params.filters);
    const field = Object.keys(query)[0];
    if (field !== undefined) {
      const filter = params.filters?.find((item) => "field" in item && item.field === field);
      throw new Error(`Unsupported filter: ${field} ${filter?.operator}.`);
    }
    return getPaginatedList<TData>(params, {}, true);
  },
} satisfies DataProvider;
