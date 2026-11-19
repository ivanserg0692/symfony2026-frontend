"use client";

import { useCustom, useDataProvider, useGetIdentity, useInvalidate, useOnError } from "@refinedev/core";
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import type { AddCartItem, Cart, CartItem, UpdateCartItem } from "@/types/cart";
import type { CatalogElementDetail } from "@/types/catalog";

export function useCartIdentity() {
  return useGetIdentity<{ id?: number } | null>({
    queryOptions: { refetchOnMount: "always" },
  });
}

export function useCart(ownerId: number) {
  return useCustom<Pick<Cart, "items">>({
    dataProviderName: "cart",
    url: "/cart",
    method: "get",
    meta: { ownerId },
    queryOptions: { gcTime: 0, retry: false, refetchOnWindowFocus: false },
    errorNotification: false,
  }).query;
}

export function useCartProducts(items: CartItem[]) {
  const catalog = useDataProvider()("catalog");
  const ids = Array.from(new Set(items.map((item) => item.catalogElementId))).sort((left, right) => left - right);

  return useCustom<{ products: Record<number, CatalogElementDetail>; hasLookupError: boolean }>({
    dataProviderName: "catalog",
    url: "/catalog/elements",
    method: "get",
    meta: { ids },
    queryOptions: {
      gcTime: 0,
      enabled: ids.length > 0,
      queryFn: async () => {
        const results = await Promise.allSettled(ids.map((id) =>
          catalog.getOne<CatalogElementDetail>({ resource: "catalog/elements", id }),
        ));
        const products: Record<number, CatalogElementDetail> = {};
        let hasLookupError = false;
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            products[ids[index]] = result.value.data;
          } else if (result.reason?.statusCode !== 404) {
            hasLookupError = true;
          }
        });
        return { data: { products, hasLookupError } };
      },
    },
    errorNotification: false,
  }).query;
}

export function useCartActions() {
  const cart = useDataProvider()("cart");
  const invalidate = useInvalidate();
  const { mutate: handleAuthError } = useOnError();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<unknown>) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(undefined);

    try {
      await action();
      await invalidate({
        dataProviderName: "cart",
        invalidates: ["all"],
        invalidationOptions: { cancelRefetch: true },
      });
      return true;
    } catch (failure) {
      if (failure instanceof ApiError && failure.statusCode === 401) handleAuthError(failure);
      setError(cartError(failure));
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const resource = "cart/items";
  return {
    busy,
    error,
    add: (productId: number) => run(() => cart.create<CartItem, AddCartItem>({
      resource, variables: { productId, quantity: 1 },
    })),
    update: (id: number, quantity: number) => run(() => cart.update<CartItem, UpdateCartItem>({
      resource, id, variables: { quantity },
    })),
    remove: (id: number) => run(() => cart.deleteOne({ resource, id })),
    clear: () => run(() => cart.custom!({ url: "/cart", method: "delete" })),
  };
}

function cartError(error: unknown) {
  const status = error instanceof ApiError ? error.statusCode : undefined;
  switch (status) {
    case 400: return "cart.invalidQuantity";
    case 401: return "cart.signInRequired";
    case 404: return "cart.unavailable";
    case 409: return "cart.stockConflict";
    default: return "cart.mutationError";
  }
}
