import { Suspense } from "react";
import { Skeleton } from "antd";
import { StorefrontCatalog } from "@/components/storefront/catalog/catalog";
import { StorefrontLayout } from "@/components/storefront/layout";

export default function CatalogPage() {
  return <Suspense fallback={<Skeleton active />}><StorefrontLayout><StorefrontCatalog /></StorefrontLayout></Suspense>;
}
