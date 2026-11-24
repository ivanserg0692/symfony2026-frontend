"use client";

import { useList, useOne, useTranslate } from "@refinedev/core";
import { Alert, Breadcrumb, Button, Drawer, Empty, Pagination, Result, Skeleton, Tag } from "antd";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath, type Locale } from "@/lib/i18n";
import type { CatalogElement, CatalogSection } from "@/types/catalog";
import { CatalogFilterForm } from "./filters";
import { ProductCard } from "./product-card";
import {
  CATALOG_PAGE_SIZE,
  catalogFilters,
  catalogQueryString,
  descendantSectionIds,
  readCatalogQuery,
  sectionAncestors,
  type CatalogQuery,
} from "./query";

type StorefrontCatalogProps = {
  resource: string;
  sectionsResource: string;
  categoryId?: number;
};

const useCatalogUrl = (locale: Locale, categoryId: number | undefined, onNavigate: () => void) => {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams().toString();
  const { value: urlValue, valid } = readCatalogQuery(new URLSearchParams(params));
  const value = { ...urlValue, section: categoryId ?? urlValue.section };
  const catalogPath = getLocalizedPath(locale, "/catalog");

  const navigate = (next: CatalogQuery) => {
    const path = categoryId !== undefined && next.section !== null
      ? getLocalizedPath(locale, `/category/${next.section}`)
      : catalogPath;
    router.push(path + catalogQueryString({ ...next, section: path === catalogPath ? next.section : null }));
    onNavigate();
  };

  const reset = () => navigate({
    query: "",
    section: categoryId ?? null,
    priceFrom: "",
    priceTo: "",
    inStock: false,
    page: 1,
  });
  return { value, valid, catalogPath, formKey: `${pathname}?${params}`, navigate, reset };
};

const useCatalogData = (
  { resource, sectionsResource, categoryId }: StorefrontCatalogProps,
  { value, valid }: { value: CatalogQuery; valid: boolean },
) => {
  const sections = useList<CatalogSection>({ resource: sectionsResource, pagination: { mode: "off" } });
  const category = useOne<CatalogSection>({
    resource: sectionsResource,
    id: categoryId,
    queryOptions: { enabled: categoryId !== undefined, retry: false },
  });
  const sectionItems = sections.result.data;
  const selectedSection = sectionItems.find((section) => section.id === value.section);
  const sectionsReady = !sections.query.isLoading && !sections.query.isError;
  const categoryLoading = categoryId !== undefined && category.query.isLoading;
  const categoryFailed = categoryId !== undefined && category.query.isError;
  const categoryActive = category.result?.active === true;
  const sectionReady = !sections.query.isLoading &&
    (value.section === null || (sectionsReady && selectedSection !== undefined));
  const categoryReady = categoryId === undefined || (!categoryLoading && !categoryFailed && categoryActive);
  const ready = valid && sectionReady && categoryReady;
  const products = useList<CatalogElement>({
    resource,
    pagination: { currentPage: value.page, pageSize: CATALOG_PAGE_SIZE },
    filters: value.section === null
      ? catalogFilters(value)
      : catalogFilters(value, descendantSectionIds(sectionItems, value.section)),
    queryOptions: { enabled: ready },
  });

  return {
    sections: {
      items: sectionItems,
      isLoading: sections.query.isLoading,
      isError: sections.query.isError,
      retry: sections.query.refetch,
      selectedName: selectedSection?.name,
      selectionMissing: valid && sectionsReady && value.section !== null && selectedSection === undefined,
    },
    category: {
      details: category.result,
      ancestors: categoryId === undefined ? [] : sectionAncestors(sectionItems, categoryId),
      children: categoryId === undefined ? [] : sectionItems.filter((section) => section.parentId === categoryId),
      requestFailed: categoryFailed,
      notFound: category.query.error?.statusCode === 404,
      unavailable: categoryId !== undefined && !categoryLoading && !categoryActive,
      retry: category.query.refetch,
    },
    products: {
      items: products.result.data,
      total: products.result.total,
      ready,
      isLoading: sections.query.isLoading || categoryLoading || (ready && products.query.isLoading),
      isFetching: ready && products.query.isFetching,
      isError: products.query.isError,
      retry: products.query.refetch,
    },
  };
};

export const StorefrontCatalog = ({ resource, sectionsResource, categoryId }: StorefrontCatalogProps) => {
  const translate = useTranslate();
  const locale = useLocale();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const url = useCatalogUrl(locale, categoryId, () => setFiltersOpen(false));
  const catalog = useCatalogData({ resource, sectionsResource, categoryId }, url);
  const filterForm = (name: string) => (
    <CatalogFilterForm
      key={url.formKey}
      name={name}
      value={url.value}
      sections={catalog.sections.items}
      onApply={(filters) => url.navigate({ ...url.value, ...filters, section: filters.section ?? null, page: 1 })}
      onReset={url.reset}
    />
  );
  if (catalog.category.requestFailed) {
    return catalog.category.notFound
      ? (
        <Result
          status="404"
          title={translate("shop.sectionNotFound")}
          extra={<Link href={url.catalogPath}>{translate("storefront.toCatalog")}</Link>}
        />
      )
      : (
        <Alert
          type="error"
          message={translate("storefront.sectionsError")}
          action={
            <Button onClick={() => void catalog.category.retry()}>{translate("storefront.retry")}</Button>
          }
        />
      );
  }
  if (catalog.category.unavailable) return <Result status="404" title={translate("shop.sectionNotFound")} />;

  return (
    <>
      <Breadcrumb
        items={[
          { title: <Link href={getLocalizedPath(locale)}>{translate("storefront.brand")}</Link> },
          { title: <Link href={url.catalogPath}>{translate("storefront.catalog")}</Link> },
          ...catalog.category.ancestors.map((section) => ({
            title: section.id === categoryId ? section.name : (
              <Link href={getLocalizedPath(locale, `/category/${section.id}`)}>{section.name}</Link>
            ),
          })),
        ]}
      />
      <h1>
        {categoryId !== undefined
          ? catalog.category.details?.name || translate("storefront.unnamedSection")
          : translate("storefront.catalog")}
      </h1>
      {catalog.category.details?.description && categoryId !== undefined && (
        <p>{catalog.category.details.description}</p>
      )}
      {categoryId !== undefined && (
        <ul className="storefront-section-links">
          {catalog.category.children.map((section) => (
            <li key={section.id}>
              <Link href={getLocalizedPath(locale, `/category/${section.id}`)}>
                {section.name || translate("storefront.unnamedSection")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!url.valid && (
        <Alert
          type="error"
          message={translate("shop.invalidFilters")}
          action={<Button onClick={url.reset}>{translate("shop.reset")}</Button>}
        />
      )}
      {catalog.sections.isError && (
        <Alert
          type="error"
          message={translate("storefront.sectionsError")}
          action={<Button onClick={() => void catalog.sections.retry()}>{translate("storefront.retry")}</Button>}
        />
      )}
      {catalog.sections.selectionMissing && (
        <Alert
          type="warning"
          message={translate("shop.sectionNotFound")}
          action={
            <Button onClick={() => url.navigate({ ...url.value, section: null, page: 1 })}>
              {translate("shop.reset")}
            </Button>
          }
        />
      )}
      <div className="storefront-catalog">
        <aside className="storefront-catalog__filters" aria-label={translate("shop.filters")}>
          <h2>{translate("shop.filters")}</h2>
          {catalog.sections.isLoading
            ? <Skeleton active />
            : !catalog.sections.isError && filterForm("catalog-desktop")}
        </aside>
        <section
          className="storefront-catalog__results"
          aria-label={translate("storefront.products")}
          aria-busy={catalog.products.isFetching}
        >
          <div className="storefront-catalog__toolbar">
            <Button
              className="storefront-catalog__filter-button"
              onClick={() => setFiltersOpen(true)}
              disabled={catalog.sections.isLoading || catalog.sections.isError}
            >
              {translate("shop.filters")}
            </Button>
            <span>{translate("shop.catalogOrder")}</span>
            {catalog.products.ready && !catalog.products.isLoading && !catalog.products.isError && (
              <span>{translate("shop.total", { count: catalog.products.total })}</span>
            )}
          </div>
          <div className="storefront-filter-tags">
            {url.value.query && (
              <Tag closable onClose={() => url.navigate({ ...url.value, query: "", page: 1 })}>
                {url.value.query}
              </Tag>
            )}
            {url.value.section !== null && (
              <Tag closable onClose={() => url.navigate({ ...url.value, section: null, page: 1 })}>
                {catalog.sections.selectedName || url.value.section}
              </Tag>
            )}
            {(["priceFrom", "priceTo"] as const)
              .filter((field) => url.value[field] !== "")
              .map((field) => (
                <Tag key={field} closable onClose={() => url.navigate({ ...url.value, [field]: "", page: 1 })}>
                  {translate(`shop.${field}`)}: {url.value[field]}
                </Tag>
              ))}
            {url.value.inStock && (
              <Tag closable onClose={() => url.navigate({ ...url.value, inStock: false, page: 1 })}>
                {translate("shop.onlyInStock")}
              </Tag>
            )}
          </div>
          {catalog.products.isLoading ? <Skeleton active /> : catalog.products.ready && (
            catalog.products.isError ? (
              <Alert
                type="error"
                message={translate("storefront.productsError")}
                action={
                  <Button onClick={() => void catalog.products.retry()}>{translate("storefront.retry")}</Button>
                }
              />
            ) : (
              <>
                {!catalog.products.items.length ? <Empty description={translate("shop.noResults")} /> : (
                  <ul className="storefront-products">
                    {catalog.products.items.map((product) => (
                      <li key={product.id}><ProductCard product={product} /></li>
                    ))}
                  </ul>
                )}
                <Pagination
                  current={url.value.page}
                  pageSize={CATALOG_PAGE_SIZE}
                  total={catalog.products.total}
                  showSizeChanger={false}
                  onChange={(page) => url.navigate({ ...url.value, page })}
                />
              </>
            )
          )}
        </section>
      </div>
      <Drawer
        className="storefront-catalog-drawer"
        title={translate("shop.filters")}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        width="min(360px, 100vw)"
      >
        {filtersOpen && filterForm("catalog-mobile")}
      </Drawer>
    </>
  );
};
