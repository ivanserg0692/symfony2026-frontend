"use client";

import { useOne, useTranslate } from "@refinedev/core";
import { Alert, Breadcrumb, Button, Result, Skeleton } from "antd";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath } from "@/lib/i18n";
import type { CatalogElementDetail } from "@/types/catalog";
import { CatalogPicture } from "../catalog-picture";
import { ProductPrice } from "./product-card";

export const StorefrontProduct = ({ id }: { id: number }) => {
  const translate = useTranslate();
  const locale = useLocale();
  const { result: product, query } = useOne<CatalogElementDetail>({ resource: "catalog/elements", id, dataProviderName: "catalog", queryOptions: { retry: false } });
  const catalogPath = getLocalizedPath(locale, "/catalog");
  if (query.isLoading) return <Skeleton active />;
  if (query.isError) return query.error?.statusCode === 404
    ? <Result status="404" title={translate("shop.productNotFound")} extra={<Link href={catalogPath}>{translate("storefront.toCatalog")}</Link>} />
    : <Alert type="error" message={translate("shop.productError")} action={<Button onClick={() => void query.refetch()}>{translate("storefront.retry")}</Button>} />;
  if (!product || product.active !== true) return <Result status="404" title={translate("shop.productNotFound")} extra={<Link href={catalogPath}>{translate("storefront.toCatalog")}</Link>} />;
  const name = product.name || translate("storefront.unnamedProduct");
  return <>
    <Breadcrumb items={[
      { title: <Link href={catalogPath}>{translate("storefront.catalog")}</Link> },
      { title: name },
    ]} />
    <article className="storefront-detail">
      <header className="storefront-detail__heading">
        <h1>{name}</h1>
        <ProductPrice product={product} />
        <p>{translate(product.totalStock > 0 ? "shop.inStock" : "shop.outOfStock")}</p>
      </header>
      <CatalogPicture picture={product.picture} name={name} full />
      <div className="storefront-detail__content">
        <section aria-labelledby="product-description"><h2 id="product-description">{translate("shop.description")}</h2><p className="storefront-detail__description">{product.description || translate("shop.noDescription")}</p></section>
        <section aria-labelledby="product-sections"><h2 id="product-sections">{translate("storefront.sections")}</h2>
          <ul className="storefront-section-links">{product.sections.filter((section) => section.active === true).map((section) => <li key={section.id}><Link href={getLocalizedPath(locale, `/category/${section.id}`)}>{section.name || translate("storefront.unnamedSection")}</Link></li>)}</ul>
        </section>
      </div>
    </article>
  </>;
};
