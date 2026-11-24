"use client";

import { ShoppingCartOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Alert, Button } from "antd";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath } from "@/lib/i18n";
import { loginWithReturn } from "@/lib/login-return";
import { useCartSession } from "./cart-provider";
import { CartQuantity } from "./cart-quantity";
import { useCartActions } from "./use-cart";

type AddToCartProps = { id: number; name: string; stock: number };

export function AddToCart({ id, name, stock }: AddToCartProps) {
  const translate = useTranslate();
  const locale = useLocale();
  const { ownerId, checkingIdentity, cart } = useCartSession();
  const login = loginWithReturn(locale, getLocalizedPath(locale, `/product/${id}`));

  if (checkingIdentity || !ownerId || cart.error?.statusCode === 401) {
    return (
      <div className="storefront-add">
        <Button type="primary" icon={<ShoppingCartOutlined />}
          disabled={stock <= 0 || checkingIdentity}
          href={stock > 0 && !checkingIdentity ? login : undefined}>
          {translate("cart.add")}
        </Button>
      </div>
    );
  }

  return <AddForUser key={`${ownerId}:${id}`} id={id} name={name} stock={stock} login={login} />;
}

function AddForUser({ id, name, stock, login }: AddToCartProps & { login: string }) {
  const translate = useTranslate();
  const { cart } = useCartSession();
  const actions = useCartActions();
  const item = cart.data?.data.find(({ catalogElementId }) => catalogElementId === id);

  return (
    <div className="storefront-add">
      {item ? (
        <CartQuantity name={name} quantity={item.quantity} max={stock} disabled={actions.busy || cart.isError || stock <= 0}
          update={(quantity) => void actions.update(item.id, quantity)} />
      ) : (
        <Button type="primary" icon={<ShoppingCartOutlined />} loading={cart.isPending}
          disabled={stock <= 0 || actions.busy || cart.isPending || cart.isError} onClick={() => void actions.add(id)}>
          {translate("cart.add")}
        </Button>
      )}
      {cart.isError && <Alert type="error" showIcon message={translate("cart.loadError")}
        action={<Button onClick={() => void cart.refetch()}>{translate("storefront.retry")}</Button>} />}
      {actions.error && (
        <Alert type="error" showIcon message={translate(actions.error)}
          action={actions.error === "cart.signInRequired" ? <Link href={login}>{translate("auth.actions.login")}</Link> : undefined} />
      )}
    </div>
  );
}
