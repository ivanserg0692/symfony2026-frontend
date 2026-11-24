import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Refine } from "@refinedev/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorefrontCatalog } from "../../../src/components/storefront/catalog/catalog";
import { CartProvider } from "../../../src/components/storefront/cart/cart-provider";
import { StorefrontProduct } from "../../../src/components/storefront/catalog/product";
import { StorefrontLayout } from "../../../src/components/storefront/layout";
import { dataProviders } from "../../../src/providers/data-provider";
import { catalogElements, catalogSections, storefrontResources } from "@/providers/storefront-resources";
import { i18nProvider } from "../../../src/providers/i18n-provider";
import { AppThemeProvider } from "../../../src/providers/theme-provider";
import { json } from "./api-mock";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: window.location.pathname.split("/")[1] }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push }),
}));

const catalogResources = {
  resource: catalogElements.name,
  sectionsResource: catalogSections.name,
};

const sections = [
  { id: 1, name: "Техника", parentId: null, active: true },
  { id: 2, name: "Клавиатуры", parentId: 1, active: true },
];
const product = { id: 7, name: "Клавиатура", active: true, description: "Описание товара", picture: null, totalStock: 5,
  sections: [sections[1]], productPrices: [{ id: 1, price: 12345, currency: "RUB", active: true, validFrom: null, validTo: null, priceType: { code: "BASE", active: true } }],
};

describe("catalog pages with real providers", () => {
  let root: Root;
  let container: HTMLDivElement;
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    window.history.replaceState({}, "", "/ru/catalog");
    push.mockReset();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    fetchMock = vi.fn(async (url: string) => {
      const path = new URL(url).pathname;
      if (path.endsWith("/catalog/sections")) return json(sections);
      if (path.endsWith("/catalog/sections/1")) return json(sections[0]);
      if (path.endsWith("/catalog/elements/7")) return json(product);
      if (path.endsWith("/catalog/elements")) return json({ items: [product], pagination: { total: 45 } });
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const mount = async (children: ReactNode) => {
    await act(async () => root.render(<AppThemeProvider><Refine dataProvider={dataProviders} resources={storefrontResources} i18nProvider={i18nProvider}
      options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } } }}><CartProvider>{children}</CartProvider></Refine></AppThemeProvider>));
    await act(async () => { await vi.waitFor(() => expect(container.querySelector(".ant-skeleton")).toBeNull()); });
  };
  const elementsRequests = () => fetchMock.mock.calls.map(([url]) => new URL(String(url))).filter((url) => url.pathname.endsWith("/catalog/elements"));

  it("restores URL filters, descendants and total pagination; back/reload uses the URL", async () => {
    window.history.replaceState({}, "", "/ru/catalog?query=keys&section=1&priceFrom=0&priceTo=123.45&inStock=true&page=2");
    await mount(<StorefrontCatalog {...catalogResources} />);
    const params = elementsRequests()[0].searchParams;
    expect(params.getAll("sectionIds[]")).toEqual(["1", "2"]);
    expect(params.get("priceTo")).toBe("12345");
    expect(params.get("priceFrom")).toBe("0");
    expect(params.get("query")).toBe("keys"); expect(params.get("inStock")).toBe("true");
    expect(params.get("page")).toBe("2"); expect(params.get("limit")).toBe("20");
    expect(container.textContent).toContain("Найдено: 45");
    expect(container.querySelector('a[href="/ru/product/7"]')).not.toBeNull();
    await act(async () => (container.querySelector('.ant-pagination-item-3') as HTMLElement).click());
    expect(push).toHaveBeenLastCalledWith("/ru/catalog?query=keys&section=1&priceFrom=0&priceTo=123.45&inStock=true&page=3");
    window.history.replaceState({}, "", "/ru/catalog?query=previous");
    await mount(<StorefrontCatalog {...catalogResources} />);
    expect(elementsRequests().at(-1)!.searchParams.get("query")).toBe("previous");
    expect(elementsRequests().at(-1)!.searchParams.get("page")).toBe("1");
    expect(elementsRequests().at(-1)!.searchParams.has("sectionIds[]")).toBe(false);
  });

  it("blocks invalid filters and unknown sections instead of querying a different catalog", async () => {
    window.history.replaceState({}, "", "/ru/catalog?priceFrom=20&priceTo=10");
    await mount(<StorefrontCatalog {...catalogResources} />);
    expect(container.textContent).toContain("Некорректные параметры"); expect(elementsRequests()).toHaveLength(0);
    window.history.replaceState({}, "", "/ru/catalog?section=999");
    await mount(<StorefrontCatalog {...catalogResources} />);
    expect(container.textContent).toContain("Раздел не найден"); expect(elementsRequests()).toHaveLength(0);
  });

  it("loads category detail and its children through catalog endpoints", async () => {
    window.history.replaceState({}, "", "/en/category/1");
    await mount(<StorefrontCatalog {...catalogResources} categoryId={1} />);
    expect(container.querySelector("h1")?.textContent).toBe("Техника");
    expect(container.querySelector('a[href="/en/category/2"]')).not.toBeNull();
    expect(elementsRequests()[0].searchParams.getAll("sectionIds[]")).toEqual(["1", "2"]);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/catalog/sections/1"))).toBe(true);
  });

  it("shows API errors, retries, then renders an empty result", async () => {
    const handler = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) => new URL(url).pathname.endsWith("/catalog/elements") ? json({ detail: "Unavailable" }, 503) : handler(url));
    await mount(<StorefrontCatalog {...catalogResources} />);
    expect(container.textContent).toContain("Не удалось загрузить товары.");
    fetchMock.mockImplementation(async (url: string) => new URL(url).pathname.endsWith("/catalog/elements") ? json({ items: [], pagination: { total: 0 } }) : handler(url));
    await act(async () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Повторить")!.click());
    await act(async () => { await vi.waitFor(() => expect(container.textContent).toContain("По вашему запросу ничего не найдено")); });
  });

  it("renders product price, single image fallback and categories without purchase requests", async () => {
    await mount(<StorefrontProduct id={7} />);
    expect(container.querySelector("h1")?.textContent).toBe("Клавиатура");
    expect(container.textContent?.replace(/\s/g, " ")).toContain("123,45 RUB");
    expect(container.textContent).toContain("Описание товара");
    expect(container.querySelector('a[href="/ru/category/2"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Нет изображения"]')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/catalog\/elements\/7$/);
  });

  it.each([404, 503])("distinguishes missing products from service errors (%s)", async (status) => {
    fetchMock.mockImplementation(async () => json({ detail: "Error" }, status));
    await mount(<StorefrontProduct id={7} />);
    expect(container.textContent).toContain(status === 404 ? "Товар не найден" : "Не удалось загрузить товар");
  });

  it("does not display inactive product details", async () => {
    fetchMock.mockImplementation(async () => json({ ...product, active: false }));
    await mount(<StorefrontProduct id={7} />);
    expect(container.textContent).toContain("Товар не найден");
    expect(container.textContent).not.toContain("Описание товара");
  });

  it("search resets pagination while preserving active catalog filters", async () => {
    window.history.replaceState({}, "", "/ru/catalog?query=old&inStock=true&page=3");
    await mount(<StorefrontLayout><p>Content</p></StorefrontLayout>);
    expect((container.querySelector('input[aria-label="Найти в каталоге"]') as HTMLInputElement).value).toBe("old");
    await act(async () => (container.querySelector('.ant-input-search-button') as HTMLButtonElement).click());
    expect(push).toHaveBeenLastCalledWith("/ru/catalog?inStock=true&query=old");
  });
  it("validates price drafts before navigation and resets page on applying filters", async () => {
    window.history.replaceState({}, "", "/ru/catalog?page=3");
    await mount(<StorefrontCatalog {...catalogResources} />);
    const change = async (id: string, value: string) => {
      const input = container.querySelector(`#${id}`) as HTMLInputElement;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };
    const submit = async () => {
      await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    };
    await change("catalog-desktop_priceFrom", "20");
    await change("catalog-desktop_priceTo", "10");
    await submit();
    await act(async () => { await vi.waitFor(() => expect(container.textContent).toContain("Максимальная цена должна быть не меньше минимальной")); });
    expect(push).not.toHaveBeenCalled();
    await change("catalog-desktop_priceTo", "25.50");
    await submit();
    await act(async () => { await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/ru/catalog?priceFrom=20&priceTo=25.50")); });
  });

  it("opens the mobile filter drawer with the same URL values", async () => {
    // jsdom cannot measure pseudo-element scrollbars used by the Ant Design portal.
    const getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => getComputedStyle(element));
    window.history.replaceState({}, "", "/ru/catalog?priceFrom=12.34");
    await mount(<StorefrontCatalog {...catalogResources} />);
    await act(async () => (container.querySelector(".storefront-catalog__filter-button") as HTMLButtonElement).click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect((document.querySelector("#catalog-mobile_priceFrom") as HTMLInputElement).value).toBe("12.34");
  });

  it("does not drop category constraints when the sections service fails", async () => {
    window.history.replaceState({}, "", "/ru/catalog?section=1");
    fetchMock.mockImplementation(async () => json({ detail: "Unavailable" }, 503));
    await mount(<StorefrontCatalog {...catalogResources} />);
    expect(container.textContent).toContain("Не удалось загрузить разделы каталога");
    expect(elementsRequests()).toHaveLength(0);
  });

  it("shows a missing category without fetching its products", async () => {
    window.history.replaceState({}, "", "/ru/category/999");
    const handler = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) => String(url).endsWith("/catalog/sections/999") ? json({ message: "Missing" }, 404) : handler(url));
    await mount(<StorefrontCatalog {...catalogResources} categoryId={999} />);
    expect(container.textContent).toContain("Раздел не найден");
    expect(elementsRequests()).toHaveLength(0);
  });

  it("uses the full API image and falls back when loading fails", async () => {
    fetchMock.mockImplementation(async () => json({ ...product, picture: { fullUrl: "/full.webp", cardUrl: "/card.webp", alt: "Keyboard photo" } }));
    await mount(<StorefrontProduct id={7} />);
    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toBe("/full.webp");
    await act(async () => image.dispatchEvent(new Event("error")));
    expect(container.querySelector('[aria-label="Нет изображения"]')).not.toBeNull();
  });

});
