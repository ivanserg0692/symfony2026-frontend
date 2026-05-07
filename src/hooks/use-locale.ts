"use client";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { useParams } from "next/navigation";

export const useLocale = (): Locale => {
  const params = useParams<{ locale?: string }>();

  return isLocale(params.locale) ? params.locale : defaultLocale;
};

