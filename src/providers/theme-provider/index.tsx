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
type ThemePreference = AppTheme | "system";

type AppThemeContextValue = {
  theme: AppTheme;
  preference: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const storageKey = "app-theme";

const AppThemeContext = createContext<AppThemeContextValue | undefined>(
  undefined,
);

const getStoredTheme = (): ThemePreference => {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
};

const getAntdTheme = (appTheme: AppTheme): ThemeConfig => {
  if (appTheme === "dark") {
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: "#7C3AED",
        borderRadius: 12,
        fontFamily: "Inter, system-ui, sans-serif",
        colorBgBase: "#101116",
        colorBgContainer: "#191B23",
        colorBgLayout: "#101116",
        colorText: "#F4F4F5",
        colorTextSecondary: "#A1A1AA",
        colorBorder: "#30323D",
      },
      components: {
        Layout: {
          bodyBg: "#101116",
          headerBg: "#191B23",
          siderBg: "#191B23",
        },
      },
    };
  }

  return {
    algorithm: theme.defaultAlgorithm,
    token: {
      borderRadius: 12,
      fontFamily: "Inter, system-ui, sans-serif",
      colorBgBase: "#F7F7FA",
      colorBgContainer: "#FFFFFF",
      colorBgElevated: "#ffffff",
      colorBgLayout: "#F7F7FA",
      colorBorder: "#E4E4E7",
      colorPrimary: "#7C3AED",
      colorText: "#18181B",
      colorTextSecondary: "#52525B",
    },
    components: {
      Layout: {
        bodyBg: "#F7F7FA",
        headerBg: "#FFFFFF",
        siderBg: "#FFFFFF",
        triggerBg: "#FFFFFF",
        triggerColor: "#18181B",
      },
      Menu: {
        itemBg: "#FFFFFF",
        itemSelectedBg: "#F3EDFF",
        itemSelectedColor: "#7C3AED",
      },
      Table: {
        headerBg: "#f5f7fa",
        rowHoverBg: "#f3f6fb",
      },
    },
  };
};

export const AppThemeProvider = ({ children }: PropsWithChildren) => {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = useState<AppTheme>("light");
  const [isHydrated, setIsHydrated] = useState(false);
  const appTheme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    setPreference(getStoredTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    setIsHydrated(true);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    document.documentElement.dataset.theme = appTheme;
    document.documentElement.style.colorScheme = appTheme;
    try {
      window.localStorage.setItem(storageKey, preference);
    } catch {
      // Theme selection still works when browser storage is unavailable.
    }
  }, [appTheme, preference, isHydrated]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme: appTheme,
      preference,
      setTheme: setPreference,
      toggleTheme: () => {
        setPreference(appTheme === "dark" ? "light" : "dark");
      },
    }),
    [appTheme, preference],
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
