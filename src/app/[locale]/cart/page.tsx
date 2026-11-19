import { Suspense } from "react";
import { Skeleton } from "antd";
import { StorefrontCart } from "@/components/storefront/cart/cart";
import { StorefrontLayout } from "@/components/storefront/layout";

export default function CartPage() {
  return (
    <Suspense fallback={<Skeleton active />}>
      <StorefrontLayout>
        <StorefrontCart />
      </StorefrontLayout>
    </Suspense>
  );
}
