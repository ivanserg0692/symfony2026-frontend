import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClient, ApiError } from "../../../src/lib/api-client";

const createCsrfResponse = (tokenId: string, token: string) =>
  new Response(
    JSON.stringify({
      token,
      token_id: tokenId,
      header_name: "X-CSRF-TOKEN",
      cookie_name: "csrf-token",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

describe("ApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serializes Symfony arrays and preserves false and zero", () => {
    const client = new ApiClient("http://localhost/api/v1");
    const url = new URL(client.buildApiUrl("/catalog/elements", {
      sectionIds: [1, 2], priceTypeCodes: ["BASE", "SALE"],
      active: false, priceFrom: 0, query: "", omitted: undefined, absent: null,
      empty: [],
    }));
    expect(url.searchParams.getAll("sectionIds[]")).toEqual(["1", "2"]);
    expect(url.searchParams.getAll("priceTypeCodes[]")).toEqual(["BASE", "SALE"]);
    expect(url.searchParams.get("active")).toBe("false");
    expect(url.searchParams.get("priceFrom")).toBe("0");
    expect(Array.from(url.searchParams.keys())).toHaveLength(6);
  });

  it.each([204, 200])("handles an empty HTTP %s response", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
      status, headers: { "Content-Type": "application/json" },
    })));
    await expect(new ApiClient("http://localhost/api/v1").fetch("/cart")).resolves.toBeUndefined();
  });

  it.each([
    ["application/json", JSON.stringify({ message: "Stock unavailable", availableQuantity: 0 }), "Stock unavailable"],
    ["application/problem+json", JSON.stringify({ title: "Invalid request", detail: "Invalid quantity" }), "Invalid quantity"],
    ["text/plain", "Service unavailable", "Service unavailable"],
    ["application/json", "broken upstream response", "broken upstream response"],
  ])("preserves HTTP errors for %s responses", async (contentType, body, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      status: 409, headers: { "Content-Type": contentType },
    })));
    const error = await new ApiClient("http://localhost/api/v1").fetch("/cart").catch((error) => error);
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw error;
    expect(error).toMatchObject({ status: 409, statusCode: 409, message });
    expect(error.body).toEqual(contentType.includes("json") && body.startsWith("{") ? JSON.parse(body) : body);
  });

  it("does not retry a failed order creation", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Network error"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new ApiClient("http://localhost/api/v1").fetch("/orders", { method: "POST" }))
      .rejects.toThrow("Network error");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 404, 503])("preserves status %s and its body", async (status) => {
    const body = { message: `Failure ${status}` };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status, headers: { "Content-Type": "application/json" },
    })));
    await expect(new ApiClient("http://localhost/api/v1").fetch("/cart", { skipAuthRefresh: true }))
      .rejects.toMatchObject({ status, statusCode: status, body });
  });

  it("preserves the existing single refresh and replay after HTTP 401", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{"message":"Expired"}', { status: 401, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(createCsrfResponse("api_mutation", "refresh-csrf"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response('{"items":[]}', { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new ApiClient("http://localhost/api/v1").fetch("/cart")).resolves.toEqual({ items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(3, "http://localhost/api/v1/auth/refresh", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, "http://localhost/api/v1/cart", expect.anything());
  });

  it("reuses a cached CSRF token for the same token id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createCsrfResponse("authenticate", "auth-token"));

    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://localhost:8000/api/v1");

    await expect(client.getCsrfToken("authenticate")).resolves.toMatchObject({
      token: "auth-token",
      token_id: "authenticate",
    });
    await expect(client.getCsrfToken("authenticate")).resolves.toMatchObject({
      token: "auth-token",
      token_id: "authenticate",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/auth/csrf?id=authenticate",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("does not reuse a cached CSRF token for a different token id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createCsrfResponse("authenticate", "auth-token-1"))
      .mockResolvedValueOnce(createCsrfResponse("api_mutation", "mutation-token"))
      .mockResolvedValueOnce(createCsrfResponse("authenticate", "auth-token-2"));

    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://localhost:8000/api/v1");

    await expect(client.getCsrfToken("authenticate")).resolves.toMatchObject({
      token: "auth-token-1",
      token_id: "authenticate",
    });
    await expect(client.getCsrfToken("api_mutation")).resolves.toMatchObject({
      token: "mutation-token",
      token_id: "api_mutation",
    });
    await expect(client.getCsrfToken("authenticate")).resolves.toMatchObject({
      token: "auth-token-2",
      token_id: "authenticate",
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/auth/csrf?id=authenticate",
      expect.objectContaining({
        credentials: "include",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8000/api/v1/auth/csrf?id=api_mutation",
      expect.objectContaining({
        credentials: "include",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8000/api/v1/auth/csrf?id=authenticate",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });
});
