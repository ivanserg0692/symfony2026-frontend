"use client";

import { useGetIdentity, useList } from "@refinedev/core";
import { createContext, useContext, useRef, useState, type PropsWithChildren } from "react";
import { cartItems } from "@/providers/storefront-resources";
import type { CartItem } from "@/types/cart";

function useCartState() {
  const identity = useGetIdentity<{ id?: number } | null>({
    queryOptions: { refetchOnMount: "always" },
  });
  const ownerId = identity.data?.id;
  const { query: cart } = useList<CartItem>({
    resource: cartItems.name,
    pagination: { mode: "off" },
    meta: { ownerId },
    queryOptions: {
      enabled: !!ownerId && !identity.isFetching,
      // Refine otherwise displays the previous query's data while the new owner loads.
      placeholderData: undefined,
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
    errorNotification: false,
  });
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);

  function startMutation() {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    return true;
  }

  function finishMutation() {
    pending.current = false;
    setBusy(false);
  }

  return { ownerId, checkingIdentity: identity.isFetching, cart, busy, startMutation, finishMutation };
}

const CartContext = createContext<ReturnType<typeof useCartState> | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const state = useCartState();
  return <CartContext.Provider value={state}>{children}</CartContext.Provider>;
}

export function useCartSession() {
  const state = useContext(CartContext);
  if (!state) throw new Error("CartProvider is required");
  return state;
}
