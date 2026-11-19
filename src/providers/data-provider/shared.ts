import type {
  BaseRecord,
  CreateParams,
  CustomParams,
  CrudFilters,
  DataProvider,
  DeleteOneParams,
  GetListParams,
  GetOneParams,
  UpdateParams,
} from "@refinedev/core";
import { API_URL, apiFetch, buildApiUrl, type ApiQuery } from "@/lib/api-client";

type ListResponse<TData> = {
  items: TData[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages?: number;
  };
};

export const sortToQuery = (
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

export const filtersToQuery = (filters?: CrudFilters) => {
  const query: ApiQuery = {};

  filters?.forEach((filter) => {
    if (!("field" in filter)) {
      throw new Error("Grouped filters are not supported by this API.");
    }
    if (filter.value === undefined || filter.value === null || filter.value === "") {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(query, filter.field)) {
      throw new Error(`Duplicate filter: ${filter.field}.`);
    }
    const values: unknown[] = Array.isArray(filter.value)
      ? filter.value
      : [filter.value];
    if (!values.every((value) => ["string", "number", "boolean"].includes(typeof value))) {
      throw new Error(`Invalid filter value: ${filter.field}.`);
    }
    query[filter.field] = filter.value;
  });

  return query;
};

export const getPaginatedList = async <TData extends BaseRecord = BaseRecord>(
  { resource, pagination }: GetListParams,
  query: ApiQuery = {},
  requireTotal = false,
) => {
  const response = await apiFetch<ListResponse<TData>>(buildApiUrl(`/${resource}`, {
    ...query,
    page: pagination?.currentPage ?? 1,
    limit: pagination?.pageSize ?? 10,
  }));
  const total = response.pagination?.total;
  if (
    requireTotal &&
    (typeof total !== "number" || !Number.isInteger(total) || total < 0)
  ) {
    throw new Error(`Missing or invalid pagination.total for ${resource}.`);
  }
  return { data: response.items, total: total ?? response.items.length };
};

export const sharedMethods = {
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
      csrf: true,
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
      csrf: true,
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
      csrf: true,
    });

    // Refine needs the deleted record id even when the API returns no body.
    return { data: data ?? ({ id } as TData) };
  },
  // A custom response may be a singleton with id:null (empty cart), or void.
  custom: async <
    TData = BaseRecord,
    TQuery = unknown,
    TPayload = unknown,
  >({ url, method, query, payload, headers }: CustomParams<TQuery, TPayload>) => {
    const data = await apiFetch<TData>(buildApiUrl(url, query as ApiQuery), {
      method: method.toUpperCase(),
      headers,
      csrf: !["get", "head", "options"].includes(method),
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });

    // custom DELETE /cart deliberately preserves an empty response as undefined.
    return { data };
  },
  getApiUrl: () => API_URL,
} satisfies Omit<DataProvider, "getList">;
