import type { ResourceProps } from "@refinedev/core";

export const catalogElements = {
  name: "catalog/elements",
  list: "/:locale/catalog",
  show: "/:locale/product/:id",
  meta: { dataProviderName: "catalog" },
} satisfies ResourceProps;

export const catalogSections = {
  name: "catalog/sections",
  show: "/:locale/category/:id",
  meta: { dataProviderName: "catalog" },
} satisfies ResourceProps;

export const cartItems = {
  name: "cart/items",
  list: "/:locale/cart",
  meta: { dataProviderName: "cart" },
} satisfies ResourceProps;

export const storefrontResources = [catalogElements, catalogSections, cartItems];
