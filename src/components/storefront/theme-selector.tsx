"use client";

import { DesktopOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { Button, Dropdown } from "antd";
import { useAppTheme } from "@/providers/theme-provider";

export const ThemeSelector = () => {
  const translate = useTranslate();
  const { preference, setTheme } = useAppTheme();
  const options = [
    { key: "light", icon: <SunOutlined /> },
    { key: "dark", icon: <MoonOutlined /> },
    { key: "system", icon: <DesktopOutlined /> },
  ] as const;

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        selectable: true,
        selectedKeys: [preference],
        items: options.map((item) => ({
          ...item,
          label: translate(`theme.actions.${item.key}`),
        })),
        onClick: ({ key }) => {
          if (key === "light" || key === "dark" || key === "system") setTheme(key);
        },
      }}
    >
      <Button
        icon={options.find((item) => item.key === preference)?.icon}
        aria-label={translate("theme.select")}
      >
        {translate(`theme.actions.${preference}`)}
      </Button>
    </Dropdown>
  );
};
