import { Suspense } from "react";
import { Skeleton } from "antd";
import { StorefrontHome } from "@/components/storefront/home";
import { StorefrontLayout } from "@/components/storefront/layout";

export default function Home() {
  return <Suspense fallback={<Skeleton active />}><StorefrontLayout><StorefrontHome /></StorefrontLayout></Suspense>;
}
