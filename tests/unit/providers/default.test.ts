import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultDataProvider } from "../../../src/providers/data-provider/default";
import { API_URL } from "../../../src/lib/api-client";
import { json, mockApi } from "./api-mock";

describe("defaultDataProvider API contracts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the same API URL as ApiClient", () => {
    expect(defaultDataProvider.getApiUrl()).toBe(API_URL);
  });

  it("keeps the existing news search and sorting contract", async () => {
    const fetchMock = mockApi(() => json({ items: [{ id: 1 }] }));
    await expect(defaultDataProvider.getList({ resource: "news",
      filters: [{ field: "query", operator: "contains", value: "hello" }],
      sorters: [{ field: "createdAt", order: "desc" }],
    })).resolves.toMatchObject({ total: 1 });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("direction")).toBe("desc");
  });
});
