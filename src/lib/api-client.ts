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
  csrf?: boolean | CsrfTokenId;
  skipAuthRefresh?: boolean;
};

type ApiFetchState = {
  csrfRetried?: boolean;
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

export class ApiClient {
  private csrfTokenCache: CsrfToken | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(private readonly apiUrl: string) {}

  buildApiUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ) {
    const url = new URL(
      `${this.apiUrl}${path.startsWith("/") ? path : `/${path}`}`,
    );

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }

  fetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
    return this.fetchInternal<T>(path, init);
  }

  async getCsrfToken(
    id: CsrfTokenId,
    options: { forceRefresh?: boolean } = {},
  ) {
    if (!options.forceRefresh) {
      const cachedToken = this.csrfTokenCache;

      if (cachedToken?.token_id === id) {
        return cachedToken;
      }
    }

    const token = await this.fetch<CsrfToken>(`/auth/csrf?id=${id}`, {
      skipAuthRefresh: true,
    });
    this.csrfTokenCache = token;

    return token;
  }

  private async fetchInternal<T>(
    path: string,
    init: ApiFetchOptions = {},
    state: ApiFetchState = {},
  ): Promise<T> {
    const { csrf, skipAuthRefresh, ...requestInit } = init;
    const headers = new Headers(requestInit.headers);
    const csrfTokenId = csrf === true ? "api_mutation" : csrf || null;

    if (csrfTokenId) {
      const csrfToken = await this.getCsrfToken(csrfTokenId);

      headers.set(csrfToken.header_name, csrfToken.token);
    }

    if (!headers.has("Content-Type") && requestInit.body) {
      headers.set("Content-Type", "application/json");
    }

    const url = path.startsWith("http://") || path.startsWith("https://")
      ? path
      : this.buildApiUrl(path);

    const response = await fetch(url, {
      ...requestInit,
      headers,
      credentials: "include",
    });

    const body = await this.parseResponseBody(response);

    if (!response.ok) {
      const error = this.createApiError(response, body);

      if (csrfTokenId && !state.csrfRetried && this.isCsrfError(error)) {
        this.csrfTokenCache = null;

        return this.fetchInternal<T>(
          path,
          {
            ...requestInit,
            csrf,
            headers: requestInit.headers,
            skipAuthRefresh,
          },
          {
            ...state,
            csrfRetried: true,
          },
        );
      }

      if (
        response.status === 401 &&
        !skipAuthRefresh &&
        this.shouldTryAuthRefresh(url)
      ) {
        await this.refreshAccessToken();

        return this.fetchInternal<T>(
          path,
          {
            ...requestInit,
            csrf,
            headers,
            skipAuthRefresh: true,
          },
          state,
        );
      }

      throw error;
    }

    return body as T;
  }

  private async refreshAccessToken() {
    this.refreshPromise ??= (async () => {
      await this.fetch("/auth/refresh", {
        method: "POST",
        csrf: true,
        skipAuthRefresh: true,
      });
    })();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async parseResponseBody(response: Response) {
    if (response.status === 204) {
      return undefined;
    }

    const contentType = response.headers.get("Content-Type") ?? "";

    return contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  }

  private createApiError(response: Response, body: unknown) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : response.statusText;

    return new ApiError(message, response.status, body);
  }

  private shouldTryAuthRefresh(url: string) {
    const pathname = new URL(url).pathname;

    return ![
      "/api/v1/auth/csrf",
      "/api/v1/auth/login",
      "/api/v1/auth/logout",
      "/api/v1/auth/refresh",
    ].includes(pathname);
  }

  private isCsrfError(error: unknown) {
    if (!(error instanceof ApiError)) {
      return false;
    }

    if (error.status !== 400 && error.status !== 403) {
      return false;
    }

    return error.message.toLowerCase().includes("csrf");
  }
}

export const createApiClient = () => new ApiClient(API_URL);

export const buildApiUrl = (
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
) => createApiClient().buildApiUrl(path, query);

export const apiFetch = async <T>(
  path: string,
  init: ApiFetchOptions = {},
): Promise<T> => createApiClient().fetch<T>(path, init);

export const getCsrfToken = (
  id: CsrfTokenId,
  options: { forceRefresh?: boolean } = {},
) => createApiClient().getCsrfToken(id, options);
