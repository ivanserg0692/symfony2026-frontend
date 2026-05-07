import { isLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import type { PropsWithChildren } from "react";

type LocaleLayoutProps = PropsWithChildren<{
  params: Promise<{
    locale: string;
  }>;
}>;

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return children;
}

