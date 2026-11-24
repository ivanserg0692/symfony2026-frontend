import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Refine } from "@refinedev/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorefrontHome } from "../../../src/components/storefront/home";
import { StorefrontLayout } from "../../../src/components/storefront/layout";
import { dataProviders } from "../../../src/providers/data-provider";
import { storefrontResources } from "@/providers/storefront-resources";
import { i18nProvider } from "../../../src/providers/i18n-provider";
import { AppThemeProvider } from "../../../src/providers/theme-provider";
import { json } from "./api-mock";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: window.location.pathname.split("/")[1] }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: vi.fn() }),
}));

describe("storefront home", () => {
  let root: Root;
  let container: HTMLDivElement;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.replaceState({}, "", "/ru");
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    fetchMock = vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/catalog/sections")) return json([{ id: 1, name: "Техника", parentId: null }]);
      if (path.endsWith("/catalog/elements")) return json({ items: [{ id: 2, name: "Клавиатура", description: "Описание", picture: null, productPrices: [], totalStock: 1 }], pagination: { total: 1 } });
      if (path.endsWith("/news")) return json({ items: [{ id: 3, name: "Новость", slug: "article", brief: "Анонс", createdAt: "2026-11-20T10:00:00Z" }] });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  const mount = async () => {
    await act(async () => root.render(
      <AppThemeProvider>
        <Refine
          dataProvider={dataProviders} resources={storefrontResources}
          i18nProvider={i18nProvider}
          authProvider={{ check: async () => ({ authenticated: false }), login: async () => ({ success: false }), logout: async () => ({ success: true }), onError: async (error) => ({ error }) }}
          options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } } }}
        >
          <StorefrontLayout><StorefrontHome /></StorefrontLayout>
        </Refine>
      </AppThemeProvider>,
    ));
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector(".ant-skeleton")).toBeNull());
    });
  };

  it("loads real previews through named providers and links to the catalog and offers the cart panel without querying guest cart data", async () => {
    await mount();
    expect(container.textContent).toContain("Клавиатура");
    expect(container.textContent).toContain("Техника");
    expect(container.textContent).toContain("Анонс");
    expect(container.querySelector('a[href="/ru/news/show/article"]')).not.toBeNull();
    expect(container.querySelector('a[href="/ru/catalog"]')).not.toBeNull();
    expect(container.querySelector('a[href="/ru/login"]')).not.toBeNull();
    expect(container.querySelector('input[aria-label="Найти в каталоге"]')).not.toBeDisabled();
    expect(container.querySelector('a[href="/ru/product/2"]')).not.toBeNull();
    expect(container.querySelector('a[href="/ru/category/1"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Корзина"][aria-expanded="false"]')).not.toBeNull();
    const productUrl = new URL(fetchMock.mock.calls.find(([url]) => String(url).includes("/catalog/elements"))![0]);
    expect(productUrl.searchParams.get("limit")).toBe("5");
    expect(productUrl.searchParams.get("active")).toBe("true");
    expect(fetchMock.mock.calls.some(([url]) => /\/(cart|orders|notification)/.test(String(url)))).toBe(false);
  });

  it("isolates a failed catalog request and retries only that block", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/catalog/elements")) return json({ message: "Service unavailable" }, 503);
      if (url.includes("/catalog/sections")) return json([]);
      return json({ items: [{ id: 3, name: "Новость", slug: "article" }] });
    });
    await mount();
    expect(container.textContent).toContain("Не удалось загрузить товары.");
    expect(container.textContent).toContain("Разделов пока нет");
    expect(container.querySelector('a[href="/ru/news/show/article"]')).not.toBeNull();
    const sectionCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/catalog/sections")).length;
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Повторить")!.click());
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/catalog/sections"))).toHaveLength(sectionCalls);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/catalog/elements"))).toHaveLength(2);
  });

  it("renders English empty states and keeps links in the current locale", async () => {
    window.history.replaceState({}, "", "/en");
    fetchMock.mockImplementation(async (url: string) => url.includes("/catalog/sections") ? json([]) : json({ items: [], pagination: { total: 0 } }));
    await mount();
    expect(container.textContent).toContain("No sections yet");
    expect(container.textContent).toContain("No products yet");
    expect(container.textContent).toContain("No news yet");
    expect(container.querySelector('a[href="/en/login"]')).not.toBeNull();
    expect(document.documentElement.lang).toBe("en");
  });
});
