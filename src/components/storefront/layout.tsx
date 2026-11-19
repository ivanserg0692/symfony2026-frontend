"use client";

import { AppstoreOutlined, ShoppingCartOutlined, UserOutlined } from "@ant-design/icons";
import { useIsAuthenticated, useTranslate } from "@refinedev/core";
import { Button, Dropdown, Input } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type PropsWithChildren } from "react";
import { Notifications } from "@/components/notifications";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath, locales, localizeRoute } from "@/lib/i18n";
import { ThemeSelector } from "./theme-selector";

export const StorefrontLayout = ({ children }: PropsWithChildren) => {
  const translate = useTranslate();
  const locale = useLocale();
  const pathname = usePathname();
  const auth = useIsAuthenticated();
  const home = getLocalizedPath(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="storefront">
      <a className="storefront__skip" href="#main-content">{translate("storefront.skip")}</a>
      <header className="storefront__header">
        <div className="storefront__header-inner">
          <Link className="storefront__brand" href={home} aria-label={translate("storefront.home")}>
            {translate("storefront.brand")}
          </Link>
          <Button type="primary" href={`${home}#catalog`} icon={<AppstoreOutlined />}>
            {translate("storefront.catalog")}
          </Button>
          <div className="storefront__search">
            <Input.Search disabled aria-label={translate("storefront.search")} placeholder={translate("storefront.search")} />
          </div>
          <nav className="storefront__actions" aria-label={translate("storefront.navigation")}>
            {!auth.isLoading && (auth.data?.authenticated ? (
              <>
                <Notifications />
                <Dropdown
                  trigger={["click"]}
                  menu={{ items: [
                    { key: "notifications", label: <Link href={getLocalizedPath(locale, "/notifications")}>{translate("notifications.title")}</Link> },
                    { key: "news", label: <Link href={getLocalizedPath(locale, "/news")}>{translate("news.title")}</Link> },
                  ] }}
                >
                  <Button icon={<UserOutlined />}>{translate("storefront.account")}</Button>
                </Dropdown>
              </>
            ) : (
              <Button href={getLocalizedPath(locale, "/login")} icon={<UserOutlined />}>{translate("auth.actions.login")}</Button>
            ))}
            <Button disabled icon={<ShoppingCartOutlined />}>{translate("storefront.cart")}</Button>
            <ThemeSelector />
            <Dropdown
              trigger={["click"]}
              menu={{
                selectedKeys: [locale],
                items: locales.map((item) => ({ key: item, label: <Link href={localizeRoute(item, pathname)} lang={item}>{translate(`language.${item}`)}</Link> })),
              }}
            >
              <Button aria-label={translate("storefront.language")}>{translate(`language.${locale}`)}</Button>
            </Dropdown>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="storefront__main">{children}</main>
      <footer className="storefront__footer">
        <span>{translate("storefront.brand")}</span>
        <Link href={getLocalizedPath(locale, "/news")}>{translate("news.title")}</Link>
      </footer>
    </div>
  );
};
