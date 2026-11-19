import { afterEach, describe, expect, it, vi } from "vitest";
import { cartDataProvider } from "../../../src/providers/data-provider/cart";
import { API_URL, ApiError } from "../../../src/lib/api-client";
import type { AddCartItem, Cart, CartItem, UpdateCartItem } from "../../../src/types/cart";
import { json, mockApi } from "./api-mock";

describe("cartDataProvider API contracts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads and clears the cart through custom, preserving HTTP 204", async () => {
    const cart: Cart = { id: null, status: null, createdAt: null, updatedAt: null, items: [] };
    const fetchMock = mockApi(() => json(cart));
    await expect(cartDataProvider.custom!<Cart>({ url: "/cart", method: "get" }))
      .resolves.toEqual({ data: cart });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    mockApi(() => new Response(null, { status: 204 }));
    await expect(cartDataProvider.custom!<void>({ url: "/cart", method: "delete" })).resolves.toEqual({ data: undefined });
  });

  it("adds and updates cart positions using different ids and quantity semantics", async () => {
    const item: CartItem = { id: 99, catalogElementId: 10, quantity: 3, sort: 1, createdAt: "now", updatedAt: "now" };
    let fetchMock = mockApi(() => json(item, 201));
    await expect(cartDataProvider.create<CartItem, AddCartItem>({ resource: "cart/items", variables: { productId: 10, quantity: 2 } }))
      .resolves.toEqual({ data: item });
    expect(fetchMock).toHaveBeenLastCalledWith(`${API_URL}/cart/items`, expect.objectContaining({
      method: "POST", body: JSON.stringify({ productId: 10, quantity: 2 }), credentials: "include",
    }));
    fetchMock = mockApi(() => json({ ...item, quantity: 5 }));
    await cartDataProvider.update<CartItem, UpdateCartItem>({ resource: "cart/items", id: 99, variables: { quantity: 5 } });
    expect(fetchMock).toHaveBeenLastCalledWith(`${API_URL}/cart/items/99`, expect.objectContaining({ method: "PATCH", body: '{"quantity":5}' }));
    const headers = (fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].headers as Headers;
    expect(headers.get("X-CSRF-TOKEN")).toBe("csrf");
  });

  it("returns the deleted cart item id after HTTP 204", async () => {
    const fetchMock = mockApi(() => new Response(null, { status: 204 }));
    await expect(cartDataProvider.deleteOne({ resource: "cart/items", id: 99 })).resolves.toEqual({ data: { id: 99 } });
    expect(fetchMock).toHaveBeenLastCalledWith(`${API_URL}/cart/items/99`, expect.objectContaining({ method: "DELETE" }));
  });

  it("propagates stock conflicts with Refine's statusCode and the original body", async () => {
    const body = { message: "Not enough stock", productId: 10, requestedQuantity: 5, availableQuantity: 2 };
    mockApi(() => json(body, 409));
    const error = await cartDataProvider.create({ resource: "cart/items", variables: { productId: 10, quantity: 5 } }).catch((error) => error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, statusCode: 409, body });
  });
});
