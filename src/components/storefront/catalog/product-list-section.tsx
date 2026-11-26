import { useList, useTranslate, type CrudFilters } from "@refinedev/core";
import { Alert, Button, Empty, Skeleton } from "antd";
import { useId } from "react";
import type { CatalogElement } from "@/types/catalog";
import { ProductGrid } from "./product-grid";

type ProductListSectionProps = {
  id?: string;
  resource: string;
  title: string;
  filters: CrudFilters;
  limit: number;
  pageSize?: number;
  excludeProductId?: number;
  emptyDescription?: string;
};

export const ProductListSection = ({
  id,
  resource,
  title,
  filters,
  limit,
  pageSize = limit,
  excludeProductId,
  emptyDescription,
}: ProductListSectionProps) => {
  const headingId = useId();
  const translate = useTranslate();
  const { result, query } = useList<CatalogElement>({
    resource,
    pagination: { currentPage: 1, pageSize },
    filters,
  });
  const products = result.data.filter((product) => product.id !== excludeProductId).slice(0, limit);

  if (!query.isLoading && !query.isError && products.length === 0 && emptyDescription === undefined) {
    return null;
  }

  return (
    <section id={id} aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>
      {query.isLoading ? (
        <Skeleton active />
      ) : query.isError ? (
        <Alert
          type="error"
          showIcon
          message={translate("storefront.productsError")}
          action={<Button onClick={() => void query.refetch()}>{translate("storefront.retry")}</Button>}
        />
      ) : products.length === 0 ? (
        <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ProductGrid products={products} />
      )}
    </section>
  );
};
