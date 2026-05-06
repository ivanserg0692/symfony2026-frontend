"use client";

import type {
  BaseRecord,
  CreateParams,
  CrudFilters,
  DataProvider,
  DeleteOneParams,
  GetListParams,
  GetOneParams,
  UpdateParams,
} from "@refinedev/core";
import {
  apiFetch,
  buildApiUrl,
  getCsrfToken,
} from "@/lib/api-client";

type ListResponse<TData> = {
  items: TData[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

const sortToQuery = (
  sorters?: Parameters<DataProvider["getList"]>[0]["sorters"],
) => {
  const sorter = sorters?.[0];

  if (!sorter) {
    return {};
  }

  return {
    sort: sorter.field,
    direction: sorter.order,
  };
};

const filtersToQuery = (filters?: CrudFilters) => {
  const query: Record<string, string> = {};

  filters?.forEach((filter) => {
    if ("field" in filter && filter.value !== undefined && filter.value !== "") {
      query[String(filter.field)] = String(filter.value);
    }
  });

  return query;
};

const mutationHeaders = async () => {
  const csrf = await getCsrfToken("api_mutation");

  return {
    [csrf.header_name]: csrf.token,
  };
};

export const dataProvider: DataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
    pagination,
    sorters,
    filters,
  }: GetListParams) => {
    const current = pagination?.currentPage ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const url = buildApiUrl(`/${resource}`, {
      page: current,
      limit: pageSize,
      ...sortToQuery(sorters),
      ...filtersToQuery(filters),
    });

    const response = await apiFetch<ListResponse<TData>>(url);

    return {
      data: response.items,
      total: response.pagination?.total ?? response.items.length,
    };
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: GetOneParams) => {
    const data = await apiFetch<TData>(`/${resource}/${id}`);

    return { data };
  },
  create: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >({
    resource,
    variables,
  }: CreateParams<TVariables>) => {
    const data = await apiFetch<TData>(`/${resource}`, {
      method: "POST",
      headers: await mutationHeaders(),
      body: JSON.stringify(variables),
    });

    return { data };
  },
  update: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>) => {
    const data = await apiFetch<TData>(`/${resource}/${id}`, {
      method: "PATCH",
      headers: await mutationHeaders(),
      body: JSON.stringify(variables),
    });

    return { data };
  },
  deleteOne: async <
    TData extends BaseRecord = BaseRecord,
    TVariables = Record<string, unknown>,
  >({
    resource,
    id,
  }: DeleteOneParams<TVariables>) => {
    const data = await apiFetch<TData>(`/${resource}/${id}`, {
      method: "DELETE",
      headers: await mutationHeaders(),
    });

    return { data };
  },
  getApiUrl: () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
};
