"use client";

import { apiFetch } from "@/lib/api-client";
import type { BaseRecord, DataProvider, GetListParams, GetListResponse } from "@refinedev/core";
import { sharedMethods } from "./shared";

export const cartDataProvider = {
  ...sharedMethods,
  getList: async <TData extends BaseRecord = BaseRecord>(
    _params: GetListParams,
  ): Promise<GetListResponse<TData>> => {
    const { items } = await apiFetch<{ items: TData[] }>("/cart");
    return { data: items, total: items.length };
  },
} satisfies DataProvider;
