"use client";

import { ShoppingCartOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Alert, Badge, Button, Popover, Skeleton } from "antd";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath } from "@/lib/i18n";
import { loginWithReturn } from "@/lib/login-return";
import { useCartSession } from "./cart-provider";
import { CartQuantity } from "./cart-quantity";
import { useCartActions, useCartProducts } from "./use-cart";

export function CartMenu() {
  const translate = useTranslate();
  const locale = useLocale();
  const { ownerId, checkingIdentity, cart } = useCartSession();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const panelId = useId();
  const cartPath = getLocalizedPath(locale, "/cart");
  const login = loginWithReturn(locale, cartPath);
  const signedIn = !!ownerId && cart.error?.statusCode !== 401;
  const count = !checkingIdentity && signedIn
    ? cart.data?.data.reduce((total, item) => total + item.quantity, 0) ?? 0
    : 0;

  return (
    <div className="storefront-cart-menu" onKeyDown={(event) => {
      if (event.key !== "Escape" || !open) return;
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }}>
      <Popover placement="bottomRight" trigger={["hover", "click"]} open={open} onOpenChange={setOpen}
        getPopupContainer={(node) => node.parentElement!} destroyOnHidden
        content={<div id={panelId} className="storefront-cart-menu__panel">
          {checkingIdentity ? <Skeleton active paragraph={false} /> : signedIn ? (
            <CartMenuItems key={ownerId} login={login} close={() => setOpen(false)} />
          ) : <CartMenuSignIn login={login} />}
          <Button block type="primary" href={cartPath} onClick={() => setOpen(false)}>
            {translate("cart.open")}
          </Button>
        </div>}>
        <Button ref={trigger} className="storefront__compact-action" aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={count ? translate("cart.count", { count }) : translate("storefront.cart")}
          icon={<Badge count={count} size="small"><ShoppingCartOutlined /></Badge>}>
          <span className="storefront__action-label">{translate("storefront.cart")}</span>
        </Button>
      </Popover>
    </div>
  );
}

function CartMenuSignIn({ login }: { login: string }) {
  const translate = useTranslate();

  return (
    <div>
      <p>{translate("cart.signInRequired")}</p>
      <Link href={login}>{translate("auth.actions.login")}</Link>
    </div>
  );
}

function CartMenuItems({ login, close }: { login: string; close: () => void }) {
  const translate = useTranslate();
  const locale = useLocale();
  const { cart } = useCartSession();
  const actions = useCartActions();
  const items = cart.data?.data ?? [];
  const details = useCartProducts(items);
  const products = details.data?.data.products ?? {};

  if (actions.error === "cart.signInRequired") return <CartMenuSignIn login={login} />;
  if (cart.isPending) return <Skeleton active paragraph={false} />;
  if (cart.isError) return (
    <Alert type="error" showIcon message={translate("cart.loadError")}
      action={<Button onClick={() => void cart.refetch()}>{translate("storefront.retry")}</Button>} />
  );
  if (!items.length) return <p>{translate("cart.empty")}</p>;

  return (
    <>
      {actions.error && <Alert type="error" showIcon message={translate(actions.error)} />}
      {details.data?.data.hasLookupError && (
        <Alert type="warning" showIcon message={translate("cart.productLookupError")}
          action={<Button onClick={() => void details.refetch()}>{translate("storefront.retry")}</Button>} />
      )}
      <ul className="storefront-cart-menu__items">
        {items.map((item) => {
          const product = products[item.catalogElementId];
          const name = product?.name || translate("cart.productNumber", { id: item.catalogElementId });

          return (
            <li className="storefront-cart-menu__item" key={item.id}>
              {product?.active ? (
                <Link href={getLocalizedPath(locale, `/product/${product.id}`)} onClick={close}>{name}</Link>
              ) : <span>{name}</span>}
              <div className="storefront-cart-menu__controls">
                <CartQuantity name={name} quantity={item.quantity} max={product?.totalStock}
                  disabled={actions.busy || !product?.active || product.totalStock <= 0}
                  update={(quantity) => void actions.update(item.id, quantity)} />
                <Button danger type="text" disabled={actions.busy}
                  aria-label={translate("cart.removeProduct", { name })}
                  onClick={() => void actions.remove(item.id)}>{translate("cart.remove")}</Button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
