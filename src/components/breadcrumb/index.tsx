"use client";

import { useLocale } from "@/hooks/use-locale";
import { localizeRoute } from "@/lib/i18n";
import { useBreadcrumb, useTranslate } from "@refinedev/core";
import Link from "next/link";

export const Breadcrumb = () => {
  const { breadcrumbs } = useBreadcrumb();
  const locale = useLocale();
  const translate = useTranslate();

  return (
    <ul className="breadcrumb">
      {breadcrumbs.map((breadcrumb) => {
        return (
          <li key={`breadcrumb-${breadcrumb.label}`}>
            {breadcrumb.href ? (
              <Link href={localizeRoute(locale, breadcrumb.href)}>
                {translate(String(breadcrumb.label), {}, breadcrumb.label)}
              </Link>
            ) : (
              <span>
                {translate(String(breadcrumb.label), {}, breadcrumb.label)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};
