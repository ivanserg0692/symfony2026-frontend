"use client";

import { useList, useOne, useTranslate } from "@refinedev/core";
import { Alert, Breadcrumb, Button, Drawer, Empty, Pagination, Result, Skeleton, Tag } from "antd";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath } from "@/lib/i18n";
import type { CatalogElement, CatalogSection } from "@/types/catalog";
import { CatalogFilterForm } from "./filters";
import { ProductCard } from "./product-card";
import { CATALOG_PAGE_SIZE, catalogFilters, catalogQueryString, readCatalogQuery, sectionAncestors, type CatalogQuery } from "./query";

export const StorefrontCatalog = ({ categoryId }: { categoryId?: number }) => {
  const translate = useTranslate();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const parsed = readCatalogQuery(new URLSearchParams(params.toString()));
  const value = { ...parsed.value, section: categoryId ?? parsed.value.section };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sections = useList<CatalogSection>({ resource: "catalog/sections", dataProviderName: "catalog", pagination: { mode: "off" } });
  const category = useOne<CatalogSection>({ resource: "catalog/sections", dataProviderName: "catalog", id: categoryId, queryOptions: { enabled: categoryId !== undefined, retry: false } });
  const selectedExists = value.section === null || sections.result.data.some((section) => section.id === value.section);
  const ready = parsed.valid && !sections.query.isLoading && (value.section === null || (!sections.query.isError && selectedExists)) &&
    (categoryId === undefined || (!category.query.isLoading && !category.query.isError && category.result?.active === true));
  const products = useList<CatalogElement>({
    resource: "catalog/elements", dataProviderName: "catalog",
    pagination: { currentPage: value.page, pageSize: CATALOG_PAGE_SIZE },
    filters: catalogFilters(value, sections.result.data),
    queryOptions: { enabled: ready },
  });
  const catalogPath = getLocalizedPath(locale, "/catalog");
  const navigate = (next: CatalogQuery) => {
    const path = categoryId !== undefined && next.section !== null ? getLocalizedPath(locale, `/category/${next.section}`) : catalogPath;
    router.push(path + catalogQueryString({ ...next, section: path === catalogPath ? next.section : null }));
    setFiltersOpen(false);
  };
  const reset = () => navigate({ query: "", section: categoryId ?? null, priceFrom: "", priceTo: "", inStock: false, page: 1 });
  const filterForm = (name: string) => <CatalogFilterForm key={`${pathname}?${params}`} name={name} value={value} sections={sections.result.data} onApply={(filters) => navigate({ ...value, ...filters, section: filters.section ?? null, page: 1 })} onReset={reset} />;
  const name = categoryId !== undefined ? category.result?.name || translate("storefront.unnamedSection") : translate("storefront.catalog");
  const failed = products.query.isError;
  const ancestors = categoryId === undefined ? [] : sectionAncestors(sections.result.data, categoryId);

  if (category.query.isError && categoryId !== undefined) {
    return category.query.error?.statusCode === 404
      ? <Result status="404" title={translate("shop.sectionNotFound")} extra={<Link href={catalogPath}>{translate("storefront.toCatalog")}</Link>} />
      : <Alert type="error" message={translate("storefront.sectionsError")} action={<Button onClick={() => void category.query.refetch()}>{translate("storefront.retry")}</Button>} />;
  }
  if (categoryId !== undefined && !category.query.isLoading && category.result?.active !== true) return <Result status="404" title={translate("shop.sectionNotFound")} />;

  return (
    <>
      <Breadcrumb items={[
        { title: <Link href={getLocalizedPath(locale)}>{translate("storefront.brand")}</Link> },
        { title: <Link href={catalogPath}>{translate("storefront.catalog")}</Link> },
        ...ancestors.map((section) => ({ title: section.id === categoryId ? section.name : <Link href={getLocalizedPath(locale, `/category/${section.id}`)}>{section.name}</Link> })),
      ]} />
      <h1>{name}</h1>
      {category.result?.description && categoryId !== undefined && <p>{category.result.description}</p>}
      {categoryId !== undefined && <ul className="storefront-section-links">{sections.result.data.filter((section) => section.parentId === categoryId).map((section) => <li key={section.id}><Link href={getLocalizedPath(locale, `/category/${section.id}`)}>{section.name || translate("storefront.unnamedSection")}</Link></li>)}</ul>}
      {!parsed.valid && <Alert type="error" message={translate("shop.invalidFilters")} action={<Button onClick={reset}>{translate("shop.reset")}</Button>} />}
      {sections.query.isError && <Alert type="error" message={translate("storefront.sectionsError")} action={<Button onClick={() => void sections.query.refetch()}>{translate("storefront.retry")}</Button>} />}
      {parsed.valid && !sections.query.isLoading && !sections.query.isError && !selectedExists && <Alert type="warning" message={translate("shop.sectionNotFound")} action={<Button onClick={() => navigate({ ...value, section: null, page: 1 })}>{translate("shop.reset")}</Button>} />}
      <div className="storefront-catalog">
        <aside className="storefront-catalog__filters" aria-label={translate("shop.filters")}>
          <h2>{translate("shop.filters")}</h2>
          {sections.query.isLoading ? <Skeleton active /> : !sections.query.isError && filterForm("catalog-desktop")}
        </aside>
        <section className="storefront-catalog__results" aria-label={translate("storefront.products")} aria-busy={ready && products.query.isFetching}>
          <div className="storefront-catalog__toolbar">
            <Button className="storefront-catalog__filter-button" onClick={() => setFiltersOpen(true)} disabled={sections.query.isLoading || sections.query.isError}>{translate("shop.filters")}</Button>
            <span>{translate("shop.catalogOrder")}</span>
            {ready && !products.query.isLoading && !failed && <span>{translate("shop.total", { count: products.result.total })}</span>}
          </div>
          <div className="storefront-filter-tags">
            {value.query && <Tag closable onClose={() => navigate({ ...value, query: "", page: 1 })}>{value.query}</Tag>}
            {value.section !== null && <Tag closable onClose={() => navigate({ ...value, section: null, page: 1 })}>{sections.result.data.find((item) => item.id === value.section)?.name || value.section}</Tag>}
            {(["priceFrom", "priceTo"] as const).filter((field) => value[field] !== "").map((field) => <Tag key={field} closable onClose={() => navigate({ ...value, [field]: "", page: 1 })}>{translate(`shop.${field}`)}: {value[field]}</Tag>)}
            {value.inStock && <Tag closable onClose={() => navigate({ ...value, inStock: false, page: 1 })}>{translate("shop.onlyInStock")}</Tag>}
          </div>
          {(sections.query.isLoading || (categoryId !== undefined && category.query.isLoading) || (ready && products.query.isLoading)) ? <Skeleton active /> : ready && (
            failed ? <Alert type="error" message={translate("storefront.productsError")} action={<Button onClick={() => void products.query.refetch()}>{translate("storefront.retry")}</Button>} /> : <>
              {!products.result.data.length ? <Empty description={translate("shop.noResults")} /> : <ul className="storefront-products">{products.result.data.map((product) => <li key={product.id}><ProductCard product={product} /></li>)}</ul>}
              <Pagination current={value.page} pageSize={CATALOG_PAGE_SIZE} total={products.result.total} showSizeChanger={false} onChange={(page) => navigate({ ...value, page })} />
            </>
          )}
        </section>
      </div>
      <Drawer className="storefront-catalog-drawer" title={translate("shop.filters")} open={filtersOpen} onClose={() => setFiltersOpen(false)} width="min(360px, 100vw)">{filtersOpen && filterForm("catalog-mobile")}</Drawer>
    </>
  );
};
