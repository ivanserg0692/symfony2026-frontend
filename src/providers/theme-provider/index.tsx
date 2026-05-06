"use client";

import type { ThemeConfig } from "antd";
import { ConfigProvider, theme } from "antd";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AppTheme = "light" | "dark";

type AppThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const storageKey = "app-theme";

const AppThemeContext = createContext<AppThemeContextValue | undefined>(
  undefined,
);

const getStoredTheme = (): AppTheme => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
};

const getAntdTheme = (appTheme: AppTheme): ThemeConfig => {
  if (appTheme === "dark") {
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorBgBase: "#1f1f1f",
        colorBgContainer: "#262626",
        colorBgLayout: "#1f1f1f",
      },
      components: {
        Layout: {
          bodyBg: "#1f1f1f",
          headerBg: "#141414",
          siderBg: "#141414",
        },
      },
    };
  }

  return {
    algorithm: theme.defaultAlgorithm,
    token: {
      borderRadius: 6,
      colorBgBase: "#f3f4f6",
      colorBgContainer: "#fbfbfc",
      colorBgElevated: "#ffffff",
      colorBgLayout: "#eef1f5",
      colorBorder: "#d8dde5",
      colorPrimary: "#2f6fcb",
      colorText: "rgba(24, 31, 42, 0.88)",
    },
    components: {
      Layout: {
        bodyBg: "#eef1f5",
        headerBg: "#fbfbfc",
        siderBg: "#fbfbfc",
        triggerBg: "#fbfbfc",
        triggerColor: "rgba(24, 31, 42, 0.88)",
      },
      Menu: {
        itemBg: "#fbfbfc",
        itemSelectedBg: "#e3ecfa",
        itemSelectedColor: "#1f5fbf",
      },
      Table: {
        headerBg: "#f5f7fa",
        rowHoverBg: "#f3f6fb",
      },
    },
  };
};

export const AppThemeProvider = ({ children }: PropsWithChildren) => {
  const [appTheme, setAppTheme] = useState<AppTheme>("light");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setAppTheme(getStoredTheme());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    document.documentElement.dataset.theme = appTheme;
    document.documentElement.style.colorScheme = appTheme;
    window.localStorage.setItem(storageKey, appTheme);
  }, [appTheme, isHydrated]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme: appTheme,
      setTheme: setAppTheme,
      toggleTheme: () => {
        setAppTheme((currentTheme) =>
          currentTheme === "dark" ? "light" : "dark",
        );
      },
    }),
    [appTheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <ConfigProvider theme={getAntdTheme(appTheme)}>{children}</ConfigProvider>
    </AppThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }

  return context;
};
