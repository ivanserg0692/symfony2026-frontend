import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogDataProvider } from "../../../src/providers/data-provider/catalog";
import { API_URL } from "../../../src/lib/api-client";
import type { CatalogElementDetail, CatalogSection } from "../../../src/types/catalog";
import { json, mockApi } from "./api-mock";

describe("catalogDataProvider API contracts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps catalog filters and server pagination without requiring pages", async () => {
    const items = [{ id: 10 }];
    const fetchMock = mockApi(() => json({ items, pagination: { page: 3, limit: 20, total: 123 } }));
    await expect(catalogDataProvider.getList({ resource: "catalog/elements",
      pagination: { currentPage: 3, pageSize: 20 },
      filters: [
        { field: "query", operator: "contains", value: "red & blue" },
        { field: "sectionIds", operator: "in", value: [2, 3] },
        { field: "priceTypeCodes", operator: "in", value: ["BASE", "SALE"] },
        { field: "active", operator: "eq", value: true },
        { field: "inStock", operator: "eq", value: false },
        { field: "priceFrom", operator: "eq", value: 0 },
        { field: "priceTo", operator: "eq", value: 10000 },
      ],
    })).resolves.toEqual({ data: items, total: 123 });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/catalog/elements");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      page: "3", limit: "20", query: "red & blue", active: "true", inStock: "false", priceFrom: "0", priceTo: "10000",
    });
    expect(url.searchParams.getAll("sectionIds[]")).toEqual(["2", "3"]);
    expect(url.searchParams.getAll("priceTypeCodes[]")).toEqual(["BASE", "SALE"]);
    expect(url.searchParams.has("sort")).toBe(false);
  });

  it("adapts the complete catalog sections array without server pagination", async () => {
    const sections = [{ id: 1, parentId: null }, { id: 2, parentId: 1 }];
    const fetchMock = mockApi(() => json(sections));
    await expect(catalogDataProvider.getList<CatalogSection>({ resource: "catalog/sections", pagination: { mode: "off" } }))
      .resolves.toEqual({ data: sections, total: 2 });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/catalog/sections`, expect.anything());
  });

  it("requires total and rejects unsupported sorting", async () => {
    const resource = "catalog/elements";
    mockApi(() => json({ items: [], pagination: { page: 1, limit: 10 } }));
    await expect(catalogDataProvider.getList({ resource })).rejects.toThrow("pagination.total");
    await expect(catalogDataProvider.getList({ resource, sorters: [{ field: "name", order: "asc" }] }))
      .rejects.toThrow("sorting is not supported");
  });

  it("rejects unsupported filters before sending a catalog request", async () => {
    const fetchMock = mockApi(() => json({}));
    for (const filters of [
      [{ field: "name", operator: "contains" as const, value: "a" }],
      [{ field: "active", operator: "ne" as const, value: true }],
      [{ operator: "or" as const, value: [{ field: "active", operator: "eq" as const, value: true }] }],
      [{ field: "sectionIds", operator: "in" as const, value: "1,2" }],
    ]) {
      await expect(catalogDataProvider.getList({ resource: "catalog/elements", filters })).rejects.toThrow();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gets a catalog product by id", async () => {
    const fetchMock = mockApi(() => json({ id: 10, sections: [] }));
    await expect(catalogDataProvider.getOne<CatalogElementDetail>({ resource: "catalog/elements", id: 10 })).resolves.toEqual({ data: { id: 10, sections: [] } });
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/catalog/elements/10`, expect.anything());
  });
});
