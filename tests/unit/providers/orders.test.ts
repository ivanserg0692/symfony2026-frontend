import { afterEach, describe, expect, it, vi } from "vitest";
import { ordersDataProvider } from "../../../src/providers/data-provider/orders";
import { API_URL } from "../../../src/lib/api-client";
import type { CreatedOrder, OrderDetail } from "../../../src/types/order";
import { json, mockApi } from "./api-mock";

describe("ordersDataProvider API contracts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requires total and rejects unsupported sorting", async () => {
    const resource = "orders";
    mockApi(() => json({ items: [], pagination: { page: 1, limit: 10 } }));
    await expect(ordersDataProvider.getList({ resource })).rejects.toThrow("pagination.total");
    await expect(ordersDataProvider.getList({ resource, sorters: [{ field: "name", order: "asc" }] }))
      .rejects.toThrow("sorting is not supported");
  });

  it("rejects catalog filters on order history before making a request", async () => {
    const fetchMock = mockApi(() => json({ items: [] }));
    await expect(ordersDataProvider.getList({
      resource: "orders",
      filters: [{ field: "priceFrom", operator: "eq", value: 0 }],
    })).rejects.toThrow("Unsupported filter: priceFrom eq");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports order creation without payload, history and detail without reshaping money or snapshots", async () => {
    let fetchMock = mockApi(() => json({ id: 5, finalPrice: "123.45", items: [] }, 201));
    await expect(ordersDataProvider.create<CreatedOrder, undefined>({ resource: "orders", variables: undefined }))
      .resolves.toMatchObject({ data: { id: 5, finalPrice: "123.45" } });
    expect(fetchMock).toHaveBeenLastCalledWith(`${API_URL}/orders`, expect.objectContaining({ method: "POST", body: undefined }));
    fetchMock = mockApi(() => json({ items: [{ id: 5 }], pagination: { page: 2, limit: 10, total: 11, pages: 2 } }));
    await expect(ordersDataProvider.getList({ resource: "orders", pagination: { currentPage: 2, pageSize: 10 } }))
      .resolves.toEqual({ data: [{ id: 5 }], total: 11 });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("page")).toBe("2");
    const detail = { id: 5, finalPrice: "123.45", items: [{ productSnapshot: { id: 8 } }] };
    fetchMock = mockApi(() => json(detail));
    await expect(ordersDataProvider.getOne<OrderDetail>({ resource: "orders", id: 5 })).resolves.toEqual({ data: detail });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/orders/5`, expect.objectContaining({ credentials: "include" }));
  });
});
