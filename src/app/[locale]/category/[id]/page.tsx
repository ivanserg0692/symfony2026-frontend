import { Suspense } from "react";
import { Skeleton } from "antd";
import { notFound } from "next/navigation";
import { StorefrontCatalog } from "@/components/storefront/catalog/catalog";
import { positiveId } from "@/components/storefront/catalog/query";
import { StorefrontLayout } from "@/components/storefront/layout";
import { catalogElements, catalogSections } from "@/providers/storefront-resources";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveId((await params).id);
  if (id === null) notFound();
  return (
    <Suspense fallback={<Skeleton active />}>
      <StorefrontLayout>
        <StorefrontCatalog resource={catalogElements.name} sectionsResource={catalogSections.name} categoryId={id} />
      </StorefrontLayout>
    </Suspense>
  );
}
