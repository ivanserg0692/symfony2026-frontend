"use client";

import { useLocale } from "@/hooks/use-locale";
import { localizeRoute } from "@/lib/i18n";
import { useBreadcrumb, useTranslate } from "@refinedev/core";
import { Breadcrumb as AntBreadcrumb } from "antd";
import Link from "next/link";

export const Breadcrumb = () => {
  const { breadcrumbs } = useBreadcrumb();
  const locale = useLocale();
  const translate = useTranslate();

  return (
    <AntBreadcrumb
      items={breadcrumbs.map((breadcrumb) => ({
        key: String(breadcrumb.label),
        title: breadcrumb.href ? (
          <Link href={localizeRoute(locale, breadcrumb.href)}>
            {translate(String(breadcrumb.label), {}, breadcrumb.label)}
          </Link>
        ) : (
          <span>{translate(String(breadcrumb.label), {}, breadcrumb.label)}</span>
        ),
      }))}
    />
  );
};
