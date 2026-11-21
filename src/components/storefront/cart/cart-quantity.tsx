"use client";

import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Button, Space } from "antd";

type CartQuantityProps = {
  name: string;
  quantity: number;
  max?: number;
  disabled: boolean;
  update: (quantity: number) => void;
};

export function CartQuantity({ name, quantity, max, disabled, update }: CartQuantityProps) {
  const translate = useTranslate();

  return (
    <Space.Compact className="storefront-cart-stepper" role="group"
      aria-label={translate("cart.quantityFor", { name })}>
      <Button icon={<MinusOutlined />} aria-label={translate("cart.decrease", { name })}
        disabled={disabled || quantity <= 1} onClick={() => update(quantity - 1)} />
      <span aria-live="polite">{quantity}</span>
      <Button icon={<PlusOutlined />} aria-label={translate("cart.increase", { name })}
        disabled={disabled || (max !== undefined && quantity >= max)} onClick={() => update(quantity + 1)} />
    </Space.Compact>
  );
}
