"use client";

import { useCreate, useCustom, useCustomMutation, useDataProvider, useDelete, useInvalidate, useUpdate } from "@refinedev/core";
import { useState } from "react";
import { ApiError } from "@/lib/api-client";
import { cartItems, catalogElements } from "@/providers/storefront-resources";
import type { AddCartItem, CartItem, UpdateCartItem } from "@/types/cart";
import type { CatalogElementDetail } from "@/types/catalog";

import { useCartSession } from "./cart-provider";

export function useCartProducts(items: CartItem[]) {
  const catalog = useDataProvider()(catalogElements.meta.dataProviderName);
  const ids = Array.from(new Set(items.map((item) => item.catalogElementId))).sort((left, right) => left - right);

  return useCustom<{ products: Record<number, CatalogElementDetail>; hasLookupError: boolean }>({
    dataProviderName: catalogElements.meta.dataProviderName,
    url: `/${catalogElements.name}`,
    method: "get",
    meta: { ids },
    queryOptions: {
      gcTime: 0,
      refetchOnMount: false,
      enabled: ids.length > 0,
      queryFn: async () => {
        const results = await Promise.allSettled(ids.map((id) =>
          catalog.getOne<CatalogElementDetail>({ resource: catalogElements.name, id }),
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
  const { mutateAsync: createItem } = useCreate<CartItem, ApiError, AddCartItem>();
  const { mutateAsync: updateItem } = useUpdate<CartItem, ApiError, UpdateCartItem>();
  const { mutateAsync: deleteItem } = useDelete<CartItem, ApiError>();
  const { mutateAsync: clearCart } = useCustomMutation<CartItem, ApiError, undefined>();
  const invalidate = useInvalidate();
  const { busy, startMutation, finishMutation } = useCartSession();
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<unknown>) {
    if (!startMutation()) return false;
    setError(undefined);

    try {
      await action();
      await invalidate({
        resource: cartItems.name,
        invalidates: ["list"],
        invalidationOptions: { cancelRefetch: true },
      });
      return true;
    } catch (failure) {
      setError(cartError(failure));
      return false;
    } finally {
      finishMutation();
    }
  }

  // Refresh the list once, after either a CRUD operation or clearing the cart.
  const notifications = { successNotification: false, errorNotification: false } as const;
  const itemMutation = { resource: cartItems.name, invalidates: [], ...notifications };
  return {
    busy,
    error,
    add: (productId: number) => run(() => createItem({
      ...itemMutation, values: { productId, quantity: 1 },
    })),
    update: (id: number, quantity: number) => run(() => updateItem({
      ...itemMutation, id, values: { quantity },
    })),
    remove: (id: number) => run(() => deleteItem({ ...itemMutation, id })),
    clear: () => run(() => clearCart({
      ...notifications,
      dataProviderName: cartItems.meta.dataProviderName,
      url: "/cart",
      method: "delete",
      values: undefined,
    })),
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
