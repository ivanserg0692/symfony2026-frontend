import { Suspense } from "react";
import { Skeleton } from "antd";
import { notFound } from "next/navigation";
import { StorefrontProduct } from "@/components/storefront/catalog/product";
import { positiveId } from "@/components/storefront/catalog/query";
import { StorefrontLayout } from "@/components/storefront/layout";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveId((await params).id);
  if (id === null) notFound();
  return <Suspense fallback={<Skeleton active />}><StorefrontLayout><StorefrontProduct id={id} /></StorefrontLayout></Suspense>;
}
