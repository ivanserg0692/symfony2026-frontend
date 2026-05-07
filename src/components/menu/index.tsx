"use client";

import {
  LoginOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import {
  useInvalidate,
  useIsAuthenticated,
  useLogout,
  useMenu,
  useTranslate,
} from "@refinedev/core";
import { locales, localizeRoute } from "@/lib/i18n";
import { useLocale } from "@/hooks/use-locale";
import { useAppTheme } from "@providers/theme-provider";
import { Button, Menu as AntMenu, Space } from "antd";
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
  const appTheme = useAppTheme();
  const isAuthenticated = auth.data?.authenticated === true;
  const menuItemsForAntd = menuItems.map((item) => ({
    key: String(item.key),
    label: (
      <Link href={localizeRoute(locale, item.route ?? "/")}>
        {translate(String(item.label), {}, String(item.label))}
      </Link>
    ),
  }));

  return (
    <nav className="app-menu">
      <AntMenu
        items={menuItemsForAntd}
        mode="inline"
        selectedKeys={selectedKey ? [String(selectedKey)] : []}
        theme={appTheme.theme}
      />
      <Button
        block
        icon={appTheme.theme === "dark" ? <SunOutlined /> : <MoonOutlined />}
        onClick={appTheme.toggleTheme}
      >
        {translate(
          appTheme.theme === "dark"
            ? "theme.actions.light"
            : "theme.actions.dark",
        )}
      </Button>
      <Space className="app-menu__locale" size={8} wrap>
        {locales.map((item) => (
          <Link href={localizeRoute(item, pathname)} key={item}>
            <Button
              size="small"
              type={item === locale ? "primary" : "default"}
            >
              {translate(`language.${item}`)}
            </Button>
          </Link>
        ))}
      </Space>
      {!auth.isLoading &&
        (isAuthenticated ? (
          <Button
            block
            icon={<LogoutOutlined />}
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
          >
            {translate("auth.actions.logout")}
          </Button>
        ) : (
          <Link href={localizeRoute(locale, "/login")}>
            <Button block icon={<LoginOutlined />}>
              {translate("auth.actions.login")}
            </Button>
          </Link>
        ))}
    </nav>
  );
};
