"use client";

import type { BaseRecord, DataProvider, GetListParams } from "@refinedev/core";
import { filtersToQuery, getPaginatedList, sharedMethods, sortToQuery } from "./shared";

export const defaultDataProvider = {
  ...sharedMethods,
  getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams) =>
    getPaginatedList<TData>(params, {
      ...sortToQuery(params.sorters),
      ...filtersToQuery(params.filters),
    }),
} satisfies DataProvider;
