"use client";

import {
  useInvalidate,
  useIsAuthenticated,
  useLogout,
  useMenu,
  useTranslate,
} from "@refinedev/core";
import { locales, localizeRoute } from "@/lib/i18n";
import { useLocale } from "@/hooks/use-locale";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Menu = () => {
  const auth = useIsAuthenticated();
  const invalidate = useInvalidate();
  const { mutate: logout } = useLogout();
  const { menuItems, selectedKey } = useMenu();
  const locale = useLocale();
  const pathname = usePathname();
  const translate = useTranslate();
  const isAuthenticated = auth.data?.authenticated === true;

  return (
    <nav className="menu">
      <ul>
        {menuItems.map((item) => (
          <li key={item.key}>
            <Link
              href={localizeRoute(locale, item.route ?? "/")}
              className={selectedKey === item.key ? "active" : ""}
            >
              {translate(String(item.label), {}, String(item.label))}
            </Link>
          </li>
        ))}
      </ul>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {locales.map((item) => (
          <Link
            className={item === locale ? "active" : ""}
            href={localizeRoute(item, pathname)}
            key={item}
          >
            {translate(`language.${item}`)}
          </Link>
        ))}
      </div>
      {!auth.isLoading &&
        (isAuthenticated ? (
          <button
            onClick={() => {
              logout(undefined, {
                onSuccess: () => {
                  invalidate({
                    resource: "news",
                    invalidates: ["list", "detail"],
                  });
                },
              });
            }}
            type="button"
          >
            {translate("auth.actions.logout")}
          </button>
        ) : (
          <Link href={localizeRoute(locale, "/login")}>
            {translate("auth.actions.login")}
          </Link>
        ))}
    </nav>
  );
};
