"use client";

import { useTranslate } from "@refinedev/core";
import { Card } from "antd";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath } from "@/lib/i18n";
import type { CatalogElement } from "@/types/catalog";
import { AddToCart } from "../cart/add-to-cart";
import { CatalogPicture, PictureAttribution } from "../catalog-picture";
import { effectiveCatalogPrice, formatCatalogAmount } from "./price";

export const ProductPrice = ({ product }: { product: CatalogElement }) => {
  const translate = useTranslate();
  const locale = useLocale();
  const price = effectiveCatalogPrice(product.productPrices);
  return <p className="storefront-product__price">{price
    ? formatCatalogAmount(locale, price.amount, price.currency)
    : translate("shop.priceUnavailable")}</p>;
};

export const ProductCard = ({ product }: { product: CatalogElement }) => {
  const translate = useTranslate();
  const locale = useLocale();
  const name = product.name || translate("storefront.unnamedProduct");

  return (
    <Card className="storefront-product" cover={<CatalogPicture picture={product.picture} name={product.name || ""} />}>
      <h3><Link href={getLocalizedPath(locale, `/product/${product.id}`)}>{name}</Link></h3>
      <ProductPrice product={product} />
      <p>{translate(product.totalStock > 0 ? "shop.inStock" : "shop.outOfStock")}</p>
      <AddToCart id={product.id} name={name} stock={product.totalStock} />
      <PictureAttribution picture={product.picture} />
    </Card>
  );
};
