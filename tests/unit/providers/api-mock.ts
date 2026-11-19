import { vi } from "vitest";

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

export const mockApi = (response: () => Response) => {
  const fetchMock = vi.fn(async (url: string) => url.includes("/auth/csrf?")
    ? json({ token: "csrf", token_id: "api_mutation", header_name: "X-CSRF-TOKEN", cookie_name: "csrf" })
    : response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

