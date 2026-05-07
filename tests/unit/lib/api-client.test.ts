import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClient } from "../../../src/lib/api-client";

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
