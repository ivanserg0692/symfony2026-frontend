"use client";

import { ShoppingCartOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Alert, Button, Card, InputNumber, Popconfirm, Result, Skeleton } from "antd";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath } from "@/lib/i18n";
import { loginWithReturn } from "@/lib/login-return";
import type { CartItem } from "@/types/cart";
import type { CatalogElementDetail } from "@/types/catalog";
import { CatalogPicture, PictureAttribution } from "../catalog-picture";
import { effectiveCatalogPrice, formatCatalogAmount } from "../catalog/price";
import { useCartSession } from "./cart-provider";
import { useCartActions, useCartProducts } from "./use-cart";

export function StorefrontCart() {
  const translate = useTranslate();
  const locale = useLocale();
  const { ownerId, checkingIdentity } = useCartSession();
  const login = loginWithReturn(locale, getLocalizedPath(locale, "/cart"));

  return (
    <>
      <h1>{translate("storefront.cart")}</h1>
      {checkingIdentity ? <Skeleton active /> : ownerId ? (
        <CartContents key={ownerId} login={login} />
      ) : <SignInRequired login={login} />}
    </>
  );
}

function SignInRequired({ login }: { login: string }) {
  const translate = useTranslate();

  return (
    <Result className="storefront-cart__state" icon={<ShoppingCartOutlined />} title={translate("cart.signInRequired")}
      extra={<Button type="primary" href={login}>{translate("auth.actions.login")}</Button>} />
  );
}

function CartContents({ login }: { login: string }) {
  const translate = useTranslate();
  const locale = useLocale();
  const { cart } = useCartSession();
  const actions = useCartActions();
  const items = cart.data?.data ?? [];
  const details = useCartProducts(items);
  const products = details.data?.data.products ?? {};
  const estimate = cartEstimate(items, products);

  if (cart.error?.statusCode === 401 || actions.error === "cart.signInRequired") {
    return <SignInRequired login={login} />;
  }
  if (cart.isPending) return <Skeleton active />;
  if (cart.isError) return (
    <Alert type="error" showIcon message={translate("cart.loadError")}
      action={<Button onClick={() => void cart.refetch()}>{translate("storefront.retry")}</Button>} />
  );

  const catalogPath = getLocalizedPath(locale, "/catalog");
  if (!items.length) return (
    <Result className="storefront-cart__state" icon={<ShoppingCartOutlined />} title={translate("cart.empty")}
      extra={<Button type="primary" href={catalogPath}>{translate("storefront.toCatalog")}</Button>} />
  );

  return (
    <>
      {actions.error && <Alert type="error" showIcon message={translate(actions.error)} />}
      {details.data?.data.hasLookupError && (
        <Alert type="warning" showIcon message={translate("cart.productLookupError")}
          action={<Button loading={details.isFetching} onClick={() => void details.refetch()}>{translate("storefront.retry")}</Button>} />
      )}
      <div className="storefront-cart">
        <ul className="storefront-cart__items">
          {items.map((item) => (
            <CartRow key={item.id} item={item} product={products[item.catalogElementId]}
              loading={details.isPending} busy={actions.busy}
              update={(quantity) => actions.update(item.id, quantity)}
              remove={() => void actions.remove(item.id)} />
          ))}
        </ul>
        <aside aria-labelledby="cart-total">
          <Card>
            <h2 id="cart-total">{translate("cart.estimate")}</h2>
            {details.isPending ? <Skeleton active paragraph={false} /> : (
              <>
                {estimate.amounts.size > 0 && (
                  <ul className="storefront-cart__totals">
                    {Array.from(estimate.amounts, ([currency, amount]) => (
                      <li key={currency}>{formatCatalogAmount(locale, amount, currency)}</li>
                    ))}
                  </ul>
                )}
                {estimate.incomplete && (
                  <p>{translate(estimate.amounts.size ? "cart.partialTotal" : "cart.noTotal")}</p>
                )}
              </>
            )}
            <p className="storefront-cart__note">{translate("cart.estimateNote")}</p>
            <Link href={catalogPath}>{translate("storefront.toCatalog")}</Link>
          </Card>
        </aside>
      </div>
      <div className="storefront-cart__footer">
        <Popconfirm title={translate("cart.clearConfirm")} okText={translate("cart.clear")}
          cancelText={translate("cart.cancel")} onConfirm={actions.clear}>
          <Button danger disabled={actions.busy}>{translate("cart.clear")}</Button>
        </Popconfirm>
      </div>
    </>
  );
}

function CartRow({ item, product, loading, busy, update, remove }: {
  item: CartItem;
  product?: CatalogElementDetail;
  loading: boolean;
  busy: boolean;
  update: (quantity: number) => Promise<boolean>;
  remove: () => void;
}) {
  const translate = useTranslate();
  const locale = useLocale();
  const [draft, setDraft] = useState<number | null>();
  const quantity = draft === undefined ? item.quantity : draft;
  const active = product?.active === true;
  const name = product?.name || translate("cart.productNumber", { id: item.catalogElementId });
  const price = active ? effectiveCatalogPrice(product.productPrices) : null;
  const canSave = quantity !== null && Number.isSafeInteger(quantity) && quantity > 0 && quantity !== item.quantity;
  const availability = !active ? "cart.unavailable" : product.totalStock < item.quantity ? "cart.insufficientStock" : undefined;

  return (
    <li className="storefront-cart__item">
      <div className="storefront-cart__photo">
        <CatalogPicture picture={product?.picture ?? null} name={name} />
      </div>
      <div className="storefront-cart__product">
        <h3>{active ? <Link href={getLocalizedPath(locale, `/product/${product.id}`)}>{name}</Link> : name}</h3>
        {!loading && price && <p>{formatCatalogAmount(locale, price.amount, price.currency)}</p>}
        {!loading && (availability || !price) && <p className="storefront-cart__note">{translate(availability ?? "shop.priceUnavailable")}</p>}
        <PictureAttribution picture={product?.picture ?? null} />
      </div>
      <form className="storefront-cart__quantity" onSubmit={async (event) => {
        event.preventDefault();
        if (!canSave || busy) return;
        await update(quantity);
        setDraft(undefined);
      }}>
        <label htmlFor={`cart-quantity-${item.id}`}>{translate("cart.quantity")}</label>
        <div className="storefront-cart__controls">
          <InputNumber id={`cart-quantity-${item.id}`} min={1} precision={0} value={quantity}
            disabled={busy || loading || !active || product.totalStock <= 0} onChange={setDraft} />
          <Button htmlType="submit" disabled={busy || !active || product.totalStock <= 0 || !canSave}>{translate("cart.save")}</Button>
        </div>
      </form>
      <Button className="storefront-cart__remove" danger type="text" disabled={busy} onClick={remove}>{translate("cart.remove")}</Button>
    </li>
  );
}

function cartEstimate(items: CartItem[], products: Record<number, CatalogElementDetail>) {
  const amounts = new Map<string, number>();
  const overflow = new Set<string>();
  let incomplete = false;

  for (const item of items) {
    const product = products[item.catalogElementId];
    const price = product?.active && product.totalStock >= item.quantity
      ? effectiveCatalogPrice(product.productPrices)
      : null;
    if (!price) {
      incomplete = true;
      continue;
    }
    const total = (amounts.get(price.currency) ?? 0) + price.amount * item.quantity;
    if (!Number.isSafeInteger(total)) {
      incomplete = true;
      overflow.add(price.currency);
    }
    amounts.set(price.currency, total);
  }
  overflow.forEach((currency) => amounts.delete(currency));
  return { amounts, incomplete };
}
