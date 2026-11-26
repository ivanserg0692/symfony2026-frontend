import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Refine, useInvalidateAuthStore } from "@refinedev/core";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddToCart } from "@/components/storefront/cart/add-to-cart";
import { StorefrontCart } from "@/components/storefront/cart/cart";
import { CartMenu } from "@/components/storefront/cart/cart-menu";
import { CartProvider } from "@/components/storefront/cart/cart-provider";
import { ProductCard } from "@/components/storefront/catalog/product-card";
import { safeLoginReturn } from "@/lib/login-return";
import { authProviderClient } from "@/providers/auth-provider/auth-provider.client";
import { dataProviders } from "@/providers/data-provider";
import { storefrontResources } from "@/providers/storefront-resources";
import { createI18nProvider } from "@/providers/i18n-provider";
import { AppThemeProvider } from "@/providers/theme-provider";
import type { CartItem } from "@/types/cart";
import type { CatalogElement } from "@/types/catalog";
import { json } from "./api-mock";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "ru" }),
}));

const position = (id: number, catalogElementId: number, quantity: number): CartItem =>
  ({ id, catalogElementId, quantity, sort: id, createdAt: "", updatedAt: "" });

const catalogProduct: CatalogElement = {
  id: 7,
  name: "Клавиатура",
  active: true,
  totalStock: 5,
  picture: null,
  description: null,
  slug: null,
  sort: null,
  productPrices: [],
};

function TestApp({ children }: PropsWithChildren) {
  return (
    <AppThemeProvider>
      <Refine authProvider={authProviderClient} dataProvider={dataProviders} resources={storefrontResources} i18nProvider={createI18nProvider("ru")}
        options={{ disableTelemetry: true }}>
        <CartProvider>{children}</CartProvider>
        <RefreshIdentity />
      </Refine>
    </AppThemeProvider>
  );
}

function RefreshIdentity() {
  const invalidate = useInvalidateAuthStore();
  return <button type="button" onClick={() => void invalidate()}>Refresh identity</button>;
}

describe("storefront cart", () => {
  let container: HTMLDivElement;
  let root: Root;
  let ownerId: number | null;
  let items: CartItem[];
  let itemUpdateStatus: number;
  let addStatus: number;
  let cartStatus: number;
  let waitForCartResponse: Promise<void> | undefined;
  let requests: { path: string; method: string; body: unknown }[];

  beforeEach(() => {
    window.history.replaceState({}, "", "/ru/cart");
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    ownerId = 4;
    items = [position(21, 7, 2), position(22, 404, 1)];
    itemUpdateStatus = addStatus = cartStatus = 200;
    requests = [];
    waitForCartResponse = undefined;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname.replace("/api/v1", "");
      const method = init.method ?? "GET";
      const body = typeof init.body === "string" ? JSON.parse(init.body) : null;
      requests.push({ path, method, body });

      if (path === "/auth/me") return ownerId ? json({ id: ownerId }) : json({}, 401);
      if (path === "/auth/csrf") return json({ token: "csrf", token_id: "api_mutation", header_name: "X-CSRF-TOKEN" });
      if (path === "/auth/refresh") return json({}, 401);
      if (path === "/auth/logout") return new Response(null, { status: 204 });
      if (path === "/catalog/elements/7") return json({
        id: 7, name: "Клавиатура", active: true, totalStock: 5, picture: null,
        productPrices: [{ price: 12345, currency: "RUB", active: true, validFrom: null,
          validTo: null, priceType: { active: true, code: "BASE" } }],
      });
      if (path === "/catalog/elements/404") return json({}, 404);
      if (path === "/cart" && method === "GET") {
        if (waitForCartResponse) await waitForCartResponse;
        return cartStatus === 200 ? json({ id: ownerId, items }) : json({}, cartStatus);
      }
      if (path === "/cart/items" && method === "POST") {
        if (addStatus !== 200) return json({}, addStatus);
        const existing = items.find(({ catalogElementId }) => catalogElementId === body.productId);
        const item = existing
          ? { ...existing, quantity: existing.quantity + body.quantity }
          : position(21, body.productId, body.quantity);
        items = [item, ...items.filter(({ id }) => id !== item.id)];
        return json(item, 201);
      }
      if (path === "/cart/items/21" && method === "PATCH") {
        if (itemUpdateStatus !== 200) return json({}, itemUpdateStatus);
        items = [{ ...items[0], quantity: body.quantity }, ...items.slice(1)];
        return json(items[0]);
      }
      if (path === "/cart" && method === "DELETE") {
        items = [];
        return new Response(null, { status: 204 });
      }
      if (/^\/cart\/items\/\d+$/.test(path) && method === "DELETE") {
        items = items.filter((item) => !path.endsWith(`/${item.id}`));
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected ${method} ${path}`);
    }));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const mount = async (children: ReactNode) => {
    await act(async () => root.render(<TestApp>{children}</TestApp>));
  };
  const buttons = (label: string) => Array.from(document.querySelectorAll("button"))
    .filter((button) => button.textContent?.trim() === label);
  const cartTrigger = () => container.querySelector<HTMLButtonElement>(".storefront-cart-menu button")!;
  const stepper = (within: ParentNode, name = "Клавиатура") =>
    within.querySelector<HTMLElement>(`[aria-label="Количество: ${name}"]`)!;
  const quantityInput = (within: ParentNode) => stepper(within).querySelector<HTMLInputElement>("input")!;
  const increase = (within: ParentNode) => within.querySelector<HTMLButtonElement>('[aria-label="Увеличить количество: Клавиатура"]')!;
  const decrease = (within: ParentNode) => within.querySelector<HTMLButtonElement>('[aria-label="Уменьшить количество: Клавиатура"]')!;
  const links = () => Array.from(container.querySelectorAll("a"), (anchor) => anchor.getAttribute("href"));
  const text = () => container.textContent ?? "";
  const cartReads = () => requests.filter(({ path, method }) => path === "/cart" && method === "GET");
  const productReads = () => requests.filter(({ path }) => path.startsWith("/catalog/elements/"));
  const waitFor = async (assertion: () => void) => {
    const deadline = Date.now() + 3000;
    while (true) {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      try {
        assertion();
        return;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
      }
    }
  };
  const click = (button: HTMLButtonElement) => act(async () => button.click());
  const change = (input: HTMLInputElement, value: string) => act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  it("offers a localized sign-in from the cart and item without requesting cart data for a guest", async () => {
    ownerId = null;
    await mount(<><CartMenu /><StorefrontCart /><ProductCard product={catalogProduct} /></>);
    await waitFor(() => expect(links()).toContain("/ru/login?to=%2Fru%2Fcart"));
    expect(container.querySelector(".storefront-product .storefront-add a"))
      .toHaveAttribute("href", "/ru/login?to=%2Fru%2Fproduct%2F7");
    await click(cartTrigger());
    await waitFor(() => expect(cartTrigger()).toHaveAttribute("aria-expanded", "true"));
    expect(links()).toContain("/ru/cart");
    expect(container.querySelector(".storefront-cart-menu__panel a")?.getAttribute("href")).toBe("/ru/login?to=%2Fru%2Fcart");
    expect(requests.filter(({ path }) => path.startsWith("/cart"))).toEqual([]);
  });

  it("shows the saved quantity and synchronizes edits from the product, panel and full cart", async () => {
    await mount(<><CartMenu /><StorefrontCart /><AddToCart id={7} name="Клавиатура" stock={5} /></>);
    const product = () => container.querySelector<HTMLElement>(".storefront-add")!;
    await waitFor(() => expect(quantityInput(product())).toHaveValue("2"));
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 3");
    expect(buttons("В корзину")).toHaveLength(0);

    await act(async () => cartTrigger().dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
    await waitFor(() => expect(cartTrigger()).toHaveAttribute("aria-expanded", "true"));
    const panel = container.querySelector<HTMLElement>(".storefront-cart-menu__panel")!;
    await waitFor(() => expect(quantityInput(panel)).toHaveValue("2"));
    expect(panel.querySelector('a[href="/ru/cart"]')).toHaveTextContent("Перейти в корзину");
    expect(panel).toHaveTextContent("Товар №404");
    expect(cartReads()).toHaveLength(1);
    expect(productReads()).toHaveLength(2);

    await click(increase(product()));
    await waitFor(() => expect(quantityInput(panel)).toHaveValue("3"));
    expect(text()).toContain("370,35");
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 4");
    expect(cartReads()).toHaveLength(2);
    expect(productReads()).toHaveLength(2);

    itemUpdateStatus = 400;
    await click(decrease(panel));
    await waitFor(() => expect(panel).toHaveTextContent("Не удалось сохранить количество"));
    expect(quantityInput(product())).toHaveValue("3");
    expect(quantityInput(panel)).toHaveValue("3");
    expect(cartReads()).toHaveLength(2);

    itemUpdateStatus = 200;
    await click(decrease(panel));
    await waitFor(() => expect(quantityInput(product())).toHaveValue("2"));
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 3");

    const input = container.querySelector<HTMLInputElement>("#cart-quantity-21")!;
    await change(input, "4");
    await click(buttons("Сохранить")[0]);
    await waitFor(() => expect(quantityInput(panel)).toHaveValue("4"));
    expect(quantityInput(product())).toHaveValue("4");
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 5");

    await click(panel.querySelector<HTMLButtonElement>('button[aria-label="Удалить: Клавиатура"]')!);
    await waitFor(() => expect(buttons("В корзину")[0]).toBeEnabled());
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 1");
    expect(cartReads()).toHaveLength(5);

    await act(async () => panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(cartTrigger()).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(cartTrigger());
  });

  it("saves a manually entered quantity once and restores the saved value after invalid input or failure", async () => {
    await mount(<CartMenu />);
    await click(cartTrigger());
    const panel = container.querySelector<HTMLElement>(".storefront-cart-menu__panel")!;
    await waitFor(() => expect(quantityInput(panel)).toBeEnabled());
    const input = quantityInput(panel);
    const updates = () => requests.filter(({ method }) => method === "PATCH");

    await act(async () => input.focus());
    await change(input, "5");
    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    await waitFor(() => expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 6"));
    expect(updates()).toEqual([{ path: "/cart/items/21", method: "PATCH", body: { quantity: 5 } }]);
    expect(input).toHaveValue("5");

    for (const invalid of ["", "0", "6", "2.5"]) {
      await act(async () => input.focus());
      await change(input, invalid);
      await act(async () => input.blur());
      expect(input).toHaveValue("5");
    }
    expect(updates()).toHaveLength(1);

    itemUpdateStatus = 409;
    await act(async () => input.focus());
    await change(input, "3");
    await act(async () => input.blur());
    await waitFor(() => expect(panel).toHaveTextContent("Недостаточно товара"));
    expect(updates()).toHaveLength(2);
    expect(input).toHaveValue("5");

    itemUpdateStatus = 200;
    await act(async () => input.focus());
    await change(input, "4");
    await act(async () => input.blur());
    await waitFor(() => expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 5"));
    expect(updates()).toHaveLength(3);
    expect(input).toHaveValue("4");
  });

  it("adds a new product and replaces the add button with its quantity", async () => {
    window.history.replaceState({}, "", "/ru/product/7");
    items = [];
    await mount(<><CartMenu /><AddToCart id={7} name="Клавиатура" stock={5} /></>);
    const product = () => container.querySelector<HTMLElement>(".storefront-add")!;
    await waitFor(() => expect(buttons("В корзину")[0]).toBeEnabled());
    await click(buttons("В корзину")[0]);
    await waitFor(() => expect(quantityInput(product())).toHaveValue("1"));
    expect(decrease(product())).toBeDisabled();
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 1");
    expect(requests).toContainEqual({ path: "/cart/items", method: "POST", body: { productId: 7, quantity: 1 } });
    expect(cartReads()).toHaveLength(2);
  });

  it("adds a product from a catalog card and keeps its quantity in sync with the header", async () => {
    window.history.replaceState({}, "", "/ru/catalog");
    items = [];
    await mount(<><CartMenu /><ProductCard product={catalogProduct} /></>);
    const card = container.querySelector<HTMLElement>(".storefront-product")!;

    await waitFor(() => expect(buttons("В корзину")[0]).toBeEnabled());
    expect(cartReads()).toHaveLength(1);
    await click(buttons("В корзину")[0]);
    await waitFor(() => expect(quantityInput(card)).toHaveValue("1"));
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 1");

    await click(increase(card));
    await waitFor(() => expect(quantityInput(card)).toHaveValue("2"));
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 2");
    expect(cartReads()).toHaveLength(3);

    const input = quantityInput(card);
    await act(async () => input.focus());
    await change(input, "5");
    await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    await waitFor(() => expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 5"));
    expect(input).toHaveValue("5");
    expect(increase(card)).toBeDisabled();
    expect(requests).toContainEqual({ path: "/cart/items/21", method: "PATCH", body: { quantity: 5 } });
  });

  it("restores saved quantity on failure, saves an absolute value, removes and clears with 204", async () => {
    await mount(<StorefrontCart />);
    await waitFor(() => expect(text()).toContain("246,90"));
    const input = container.querySelector<HTMLInputElement>("#cart-quantity-21")!;
    itemUpdateStatus = 400;
    await change(input, "3");
    await click(buttons("Сохранить")[0]);
    await waitFor(() => expect(text()).toContain("Не удалось сохранить количество"));
    expect(input.value).toBe("2");

    itemUpdateStatus = 200;
    await change(input, "4");
    await click(buttons("Сохранить")[0]);
    await waitFor(() => expect(text()).toContain("493,80"));
    expect(input.value).toBe("4");
    expect(requests).toContainEqual({ path: "/cart/items/21", method: "PATCH", body: { quantity: 4 } });

    await click(buttons("Удалить")[1]);
    await waitFor(() => expect(text()).not.toContain("Товар №404"));
    expect(text()).not.toContain("вошли только доступные");
    await click(buttons("Очистить корзину")[0]);
    await waitFor(() => expect(buttons("Очистить корзину")).toHaveLength(2));
    await click(buttons("Очистить корзину").at(-1)!);
    await waitFor(() => expect(text()).toContain("Корзина пуста"));
    expect(requests).toContainEqual({ path: "/cart", method: "DELETE", body: null });
    expect(cartReads()).toHaveLength(4);
  });

  it.each([404, 409, 503])("reports an unsuccessful add (%s) without changing the cart", async (status) => {
    items = [];
    addStatus = status;
    await mount(<AddToCart id={7} name="Клавиатура" stock={5} />);
    await waitFor(() => expect(buttons("В корзину")[0]).toBeEnabled());
    await click(buttons("В корзину")[0]);
    await waitFor(() => expect(container.querySelector('[role="alert"]')).toHaveTextContent(
      status === 404 ? "Товар недоступен" : status === 409 ? "Недостаточно товара" : "Не удалось обновить корзину",
    ));
    expect(buttons("В корзину")[0]).toBeEnabled();
  });

  it("drops previous owner data on identity change and shows login on an expired session", async () => {
    await mount(<><CartMenu /><StorefrontCart /></>);
    await waitFor(() => expect(text()).toContain("Клавиатура"));
    expect(cartTrigger()).toHaveAccessibleName("Корзина, количество товаров: 3");

    ownerId = 8;
    items = [];
    let finishCartRequest!: () => void;
    waitForCartResponse = new Promise((resolve) => { finishCartRequest = resolve; });
    await click(buttons("Refresh identity")[0]);
    await waitFor(() => expect(cartReads()).toHaveLength(2));
    expect(cartTrigger()).toHaveAccessibleName("Корзина");
    expect(text()).not.toContain("Клавиатура");
    await act(async () => { finishCartRequest(); });
    await waitFor(() => expect(text()).toContain("Корзина пуста"));

    // Expire the cart request between the identity check and data loading.
    ownerId = 9;
    cartStatus = 401;
    await click(buttons("Refresh identity")[0]);
    await waitFor(() => expect(links()).toContain("/ru/login?to=%2Fru%2Fcart"));
    await waitFor(() => expect(requests.some(({ path }) => path === "/auth/logout")).toBe(true));
  });

  it("allows only known return routes in the active locale", () => {
    expect(safeLoginReturn("ru", "/ru/cart")).toBe("/ru/cart");
    expect(safeLoginReturn("en", "/en/product/7")).toBe("/en/product/7");
    expect(safeLoginReturn("en", "/en/news/show/article")).toBe("/en/news/show/article");
    for (const path of ["/en/cart", "//example.com", "https://example.com/ru/cart", "/ru/cart\n",
      "/ru/%2F%2Fevil.example", "/ru/product/../cart", "/ru/cart?to=//evil.example", ["/ru/cart", "/ru/product/7"]]) {
      expect(safeLoginReturn("ru", path)).toBeUndefined();
    }
  });
});
