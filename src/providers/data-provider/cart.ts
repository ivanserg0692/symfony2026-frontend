"use client";

import type { BaseRecord, DataProvider, GetListParams } from "@refinedev/core";
import { filtersToQuery, getPaginatedList, sharedMethods, sortToQuery } from "./shared";

export const cartDataProvider = {
  ...sharedMethods,
  // The cart itself is a singleton: use custom GET/DELETE /cart.
  // Its positions use the shared create/update/deleteOne methods for cart/items.
  getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams) =>
    getPaginatedList<TData>(params, {
      ...sortToQuery(params.sorters),
      ...filtersToQuery(params.filters),
    }),
} satisfies DataProvider;
