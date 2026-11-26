"use client";

import { MinusOutlined, PlusOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Button, Input, Space } from "antd";
import { useState } from "react";

type CartQuantityProps = {
  name: string;
  quantity: number;
  max?: number;
  disabled: boolean;
  update: (quantity: number) => void;
};

export function CartQuantity({ name, quantity, max, disabled, update }: CartQuantityProps) {
  const translate = useTranslate();
  const [draft, setDraft] = useState<string>();

  function saveDraft() {
    setDraft(undefined);
    if (disabled || draft === undefined || !/^\d+$/.test(draft)) return;

    const nextQuantity = Number(draft);
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 1 || nextQuantity === quantity
      || (max !== undefined && nextQuantity > max)) return;

    update(nextQuantity);
  }

  return (
    <Space.Compact className="storefront-cart-stepper" role="group"
      aria-label={translate("cart.quantityFor", { name })}>
      <Button icon={<MinusOutlined />} aria-label={translate("cart.decrease", { name })}
        disabled={disabled || quantity <= 1} onClick={() => update(quantity - 1)} />
      <Input className="storefront-cart-stepper__input" inputMode="numeric"
        aria-label={translate("cart.quantityFor", { name })} disabled={disabled}
        value={draft ?? String(quantity)} onChange={(event) => setDraft(event.target.value)}
        onBlur={saveDraft} onPressEnter={(event) => {
          event.preventDefault();
          event.currentTarget.blur();
        }} />
      <Button icon={<PlusOutlined />} aria-label={translate("cart.increase", { name })}
        disabled={disabled || (max !== undefined && quantity >= max)} onClick={() => update(quantity + 1)} />
    </Space.Compact>
  );
}
