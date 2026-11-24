"use client";

import { ArrowRightOutlined } from "@ant-design/icons";
import { useList, useTranslate } from "@refinedev/core";
import { Alert, Button, Card, Empty, Skeleton } from "antd";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath } from "@/lib/i18n";
import { catalogElements, catalogSections } from "@/providers/storefront-resources";
import type { CatalogElement, CatalogSection } from "@/types/catalog";
import { ProductCard } from "./catalog/product-card";

const SectionsPreview = () => {
  const translate = useTranslate();
  const locale = useLocale();
  const { result, query } = useList<CatalogSection>({
    resource: catalogSections.name,
    pagination: { mode: "off" },
  });

  return (
    <section aria-labelledby="sections-title">
      <h2 id="sections-title">{translate("storefront.sections")}</h2>
      {query.isLoading ? <Skeleton active /> : query.isError ? (
        <Alert type="error" showIcon message={translate("storefront.sectionsError")} action={<Button onClick={() => void query.refetch()}>{translate("storefront.retry")}</Button>} />
      ) : !result.data.length ? (
        <Empty description={translate("storefront.sectionsEmpty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ul className="storefront-sections">
          {result.data.slice(0, 8).map((item) => (
            <li key={item.id}><Card size="small"><Link href={getLocalizedPath(locale, `/category/${item.id}`)}>{item.name || translate("storefront.unnamedSection")}</Link></Card></li>
          ))}
        </ul>
      )}
    </section>
  );
};

const ProductsPreview = () => {
  const translate = useTranslate();
  const { result, query } = useList<CatalogElement>({
    resource: catalogElements.name,
    pagination: { currentPage: 1, pageSize: 5 },
    filters: [{ field: "active", operator: "eq", value: true }],
  });

  return (
    <section id="catalog" aria-labelledby="products-title">
      <h2 id="products-title">{translate("storefront.products")}</h2>
      {query.isLoading ? <Skeleton active /> : query.isError ? (
        <Alert type="error" showIcon message={translate("storefront.productsError")} action={<Button onClick={() => void query.refetch()}>{translate("storefront.retry")}</Button>} />
      ) : !result.data.length ? (
        <Empty description={translate("storefront.productsEmpty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ul className="storefront-products">
          {result.data.map((item) => (
            <li key={item.id}>
              <ProductCard product={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

type NewsPreview = { id: number; name: string; slug: string; brief?: string | null; createdAt?: string | null };

const NewsPreview = () => {
  const locale = useLocale();
  const translate = useTranslate();
  const { result, query } = useList<NewsPreview>({
    resource: "news",
    pagination: { currentPage: 1, pageSize: 3 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  return (
    <section aria-labelledby="news-title">
      <div className="storefront-section-heading">
        <h2 id="news-title">{translate("news.title")}</h2>
        <Link href={getLocalizedPath(locale, "/news")}>{translate("storefront.allNews")} <ArrowRightOutlined /></Link>
      </div>
      {query.isLoading ? <Skeleton active /> : query.isError ? (
        <Alert type="error" showIcon message={translate("news.loadError")} action={<Button onClick={() => void query.refetch()}>{translate("storefront.retry")}</Button>} />
      ) : !result.data.length ? (
        <Empty description={translate("storefront.newsEmpty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ul className="storefront-news">
          {result.data.map((item) => (
            <li key={item.slug}>
              <Card>
                <h3><Link href={getLocalizedPath(locale, `/news/show/${item.slug}`)}>{item.name}</Link></h3>
                {item.brief && <p>{item.brief}</p>}
                {item.createdAt && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { timeZone: "UTC" })}</time>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const StorefrontHome = () => {
  const translate = useTranslate();
  const locale = useLocale();
  return (
    <>
      <section className="storefront-hero" aria-labelledby="hero-title">
        <div>
          <h1 id="hero-title">{translate("storefront.heroTitle")}</h1>
          <p>{translate("storefront.heroText")}</p>
          <Button type="primary" size="large" href={getLocalizedPath(locale, "/catalog")} icon={<ArrowRightOutlined />}>{translate("storefront.toCatalog")}</Button>
        </div>
      </section>
      <SectionsPreview />
      <ProductsPreview />
      <NewsPreview />
    </>
  );
};
