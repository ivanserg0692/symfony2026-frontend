import { Suspense } from "react";
import { Skeleton } from "antd";
import { StorefrontCatalog } from "@/components/storefront/catalog/catalog";
import { StorefrontLayout } from "@/components/storefront/layout";
import { catalogElements, catalogSections } from "@/providers/storefront-resources";

export default function CatalogPage() {
  return (
    <Suspense fallback={<Skeleton active />}>
      <StorefrontLayout>
        <StorefrontCatalog resource={catalogElements.name} sectionsResource={catalogSections.name} />
      </StorefrontLayout>
    </Suspense>
  );
}
