"use client";

import { ShoppingCartOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Alert, Button } from "antd";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath } from "@/lib/i18n";
import { loginWithReturn } from "@/lib/login-return";
import { useCartActions, useCartIdentity } from "./use-cart";

export function AddToCart({ id, available }: { id: number; available: boolean }) {
  const translate = useTranslate();
  const locale = useLocale();
  const identity = useCartIdentity();
  const cartLink = getLocalizedPath(locale, "/cart");
  const login = loginWithReturn(locale, getLocalizedPath(locale, `/product/${id}`));
  const ownerId = identity.data?.id;

  if (identity.isFetching || !available || !ownerId) {
    return (
      <div className="storefront-add">
        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          disabled={!available || identity.isFetching}
          href={available && !identity.isFetching ? login : undefined}
        >
          {translate("cart.add")}
        </Button>
      </div>
    );
  }

  return <AddForUser key={`${ownerId}:${id}`} id={id} cartLink={cartLink} login={login} />;
}

function AddForUser({ id, cartLink, login }: { id: number; cartLink: string; login: string }) {
  const translate = useTranslate();
  const actions = useCartActions();
  const [added, setAdded] = useState(false);

  const add = async () => {
    if (actions.busy) return;
    setAdded(false);
    setAdded(await actions.add(id));
  };

  return (
    <div className="storefront-add">
      <Button type="primary" icon={<ShoppingCartOutlined />} loading={actions.busy} onClick={() => void add()}>
        {translate("cart.add")}
      </Button>
      {added && <Alert type="success" showIcon message={translate("cart.added")} action={<Link href={cartLink}>{translate("cart.open")}</Link>} />}
      {actions.error && (
        <Alert type="error" showIcon message={translate(actions.error)}
          action={actions.error === "cart.signInRequired" ? <Link href={login}>{translate("auth.actions.login")}</Link> : undefined} />
      )}
    </div>
  );
}
