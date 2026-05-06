export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type CsrfToken = {
  token: string;
  token_id: string;
  header_name: string;
  cookie_name: string;
};

type CsrfTokenId = "authenticate" | "api_mutation";

type ApiFetchOptions = RequestInit & {
  skipAuthRefresh?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const buildApiUrl = (
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
) => {
  const url = new URL(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const csrfTokenCache = new Map<CsrfTokenId, CsrfToken>();
let refreshPromise: Promise<void> | null = null;

const parseResponseBody = async (response: Response) => {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("Content-Type") ?? "";

  return contentType.includes("application/json")
    ? await response.json()
    : await response.text();
};

const createApiError = (response: Response, body: unknown) => {
  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
      ? body.message
      : response.statusText;

  return new ApiError(message, response.status, body);
};

const getPathname = (url: string) => {
  return new URL(url).pathname;
};

const shouldTryAuthRefresh = (url: string) => {
  const pathname = getPathname(url);

  return ![
    "/api/v1/auth/csrf",
    "/api/v1/auth/login",
    "/api/v1/auth/logout",
    "/api/v1/auth/refresh",
  ].includes(pathname);
};

const isCsrfError = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status !== 400 && error.status !== 403) {
    return false;
  }

  return error.message.toLowerCase().includes("csrf");
};

const refreshAccessToken = async () => {
  refreshPromise ??= (async () => {
    try {
      const csrf = await getCsrfToken("api_mutation");

      await apiFetch("/auth/refresh", {
        method: "POST",
        headers: {
          [csrf.header_name]: csrf.token,
        },
        skipAuthRefresh: true,
      });
    } catch (error) {
      if (!isCsrfError(error)) {
        throw error;
      }

      csrfTokenCache.delete("api_mutation");
      const csrf = await getCsrfToken("api_mutation");

      await apiFetch("/auth/refresh", {
        method: "POST",
        headers: {
          [csrf.header_name]: csrf.token,
        },
        skipAuthRefresh: true,
      });
    }
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const apiFetch = async <T>(
  path: string,
  init: ApiFetchOptions = {},
): Promise<T> => {
  const { skipAuthRefresh, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);

  if (!headers.has("Content-Type") && requestInit.body) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : buildApiUrl(path);

  const response = await fetch(url, {
    ...requestInit,
    headers,
    credentials: "include",
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    if (
      response.status === 401 &&
      !skipAuthRefresh &&
      shouldTryAuthRefresh(url)
    ) {
      await refreshAccessToken();

      return apiFetch<T>(path, {
        ...requestInit,
        headers,
        skipAuthRefresh: true,
      });
    }

    throw createApiError(response, body);
  }

  return body as T;
};

export const getCsrfToken = async (
  id: CsrfTokenId,
  options: { forceRefresh?: boolean } = {},
) => {
  if (!options.forceRefresh) {
    const cachedToken = csrfTokenCache.get(id);

    if (cachedToken) {
      return cachedToken;
    }
  }

  const token = await apiFetch<CsrfToken>(`/auth/csrf?id=${id}`, {
    skipAuthRefresh: true,
  });
  csrfTokenCache.set(id, token);

  return token;
};
