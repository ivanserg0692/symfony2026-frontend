"use client";

import type { DataProviders } from "@refinedev/core";
import { defaultDataProvider } from "./default";
import { catalogDataProvider } from "./catalog";
import { cartDataProvider } from "./cart";
import { ordersDataProvider } from "./orders";

export { defaultDataProvider, catalogDataProvider, cartDataProvider, ordersDataProvider };

export const dataProviders = {
  default: defaultDataProvider,
  catalog: catalogDataProvider,
  cart: cartDataProvider,
  orders: ordersDataProvider,
} satisfies DataProviders;
