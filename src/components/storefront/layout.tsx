"use client";

import { AppstoreOutlined, GlobalOutlined, UserOutlined } from "@ant-design/icons";
import { useIsAuthenticated, useTranslate } from "@refinedev/core";
import { Button, Dropdown, Input } from "antd";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Notifications } from "@/components/notifications";
import { useLocale } from "@/hooks/use-locale";
import { getLocalizedPath, locales, localizeRoute } from "@/lib/i18n";
import { CartMenu } from "./cart/cart-menu";
import { CartProvider } from "./cart/cart-provider";
import { ThemeSelector } from "./theme-selector";

export const StorefrontLayout = ({ children }: PropsWithChildren) => (
  <CartProvider><StorefrontShell>{children}</StorefrontShell></CartProvider>
);

const StorefrontShell = ({ children }: PropsWithChildren) => {
  const translate = useTranslate();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("query") ?? "";
  const [search, setSearch] = useState(searchQuery);
  const [hasCompactActionsRow, setHasCompactActionsRow] = useState(false);
  const headerInnerRef = useRef<HTMLDivElement>(null);
  useEffect(() => setSearch(searchQuery), [searchQuery, pathname]);
  const auth = useIsAuthenticated();
  const home = getLocalizedPath(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 420px)");
    const updateCompactActionsRow = () => setHasCompactActionsRow(media.matches);

    updateCompactActionsRow();
    media.addEventListener("change", updateCompactActionsRow);
    return () => media.removeEventListener("change", updateCompactActionsRow);
  }, []);

  return (
    <div className="storefront">
      <a className="storefront__skip" href="#main-content">{translate("storefront.skip")}</a>
      <header className="storefront__header">
        <div className="storefront__header-inner" ref={headerInnerRef}>
          <Link className="storefront__brand" href={home} aria-label={translate("storefront.home")}>
            {translate("storefront.brand")}
          </Link>
          <Button className="storefront__compact-action storefront__catalog-link" type="primary" href={getLocalizedPath(locale, "/catalog")} icon={<AppstoreOutlined />} aria-label={translate("storefront.catalog")}>
            <span className="storefront__action-label">{translate("storefront.catalog")}</span>
          </Button>
          <div className="storefront__search">
            <Input.Search value={search} onChange={(event) => setSearch(event.target.value)} onSearch={(query) => {
              const browsing = pathname === getLocalizedPath(locale, "/catalog") || pathname.startsWith(getLocalizedPath(locale, "/category/"));
              const params = new URLSearchParams(browsing ? searchParams.toString() : "");
              params.delete("page");
              params.delete("query");
              if (query.trim()) params.set("query", query.trim());
              router.push((browsing ? pathname : getLocalizedPath(locale, "/catalog")) + (params.size ? `?${params}` : ""));
            }} aria-label={translate("storefront.search")} placeholder={translate("storefront.search")} />
          </div>
          <nav className="storefront__actions" aria-label={translate("storefront.navigation")}>
            {!auth.isLoading && (auth.data?.authenticated ? (
              <>
                <Notifications
                  placement={hasCompactActionsRow ? "bottomLeft" : "bottomRight"}
                  popupBoundaryRef={headerInnerRef}
                />
                <Dropdown
                  trigger={["click"]}
                  menu={{ items: [
                    { key: "notifications", label: <Link href={getLocalizedPath(locale, "/notifications")}>{translate("notifications.title")}</Link> },
                    { key: "news", label: <Link href={getLocalizedPath(locale, "/news")}>{translate("news.title")}</Link> },
                  ] }}
                >
                  <Button className="storefront__compact-action" icon={<UserOutlined />} aria-label={translate("storefront.account")}>
                    <span className="storefront__action-label">{translate("storefront.account")}</span>
                  </Button>
                </Dropdown>
              </>
            ) : (
              <Button className="storefront__compact-action" href={getLocalizedPath(locale, "/login")} icon={<UserOutlined />} aria-label={translate("auth.actions.login")}>
                <span className="storefront__action-label">{translate("auth.actions.login")}</span>
              </Button>
            ))}
            <CartMenu />
            <ThemeSelector />
            <Dropdown
              trigger={["click"]}
              menu={{
                selectedKeys: [locale],
                items: locales.map((item) => ({ key: item, label: <Link href={localizeRoute(item, pathname) + (searchParams.size ? `?${searchParams}` : "")} lang={item}>{translate(`language.${item}`)}</Link> })),
              }}
            >
              <Button className="storefront__compact-action" icon={<GlobalOutlined />} aria-label={translate("storefront.language")}>
                <span className="storefront__action-label">{translate(`language.${locale}`)}</span>
              </Button>
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
