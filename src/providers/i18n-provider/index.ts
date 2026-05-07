import type { I18nProvider } from "@refinedev/core";

import {
  defaultLocale,
  getLocaleFromPath,
  isLocale,
  type Locale,
} from "@/lib/i18n";
import { en } from "./locales/en";
import { ru } from "./locales/ru";

const translations = {
  en,
  ru,
};

let currentLocale: Locale = defaultLocale;

const getValueByPath = (messages: object, key: string): string | undefined => {
  return key.split(".").reduce<unknown>((value, segment) => {
    if (value && typeof value === "object" && segment in value) {
      return (value as Record<string, unknown>)[segment];
    }

    return undefined;
  }, messages) as string | undefined;
};

const interpolate = (
  message: string,
  params?: Record<string, string | number>,
) => {
  if (!params) {
    return message;
  }

  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replaceAll(`{{${key}}}`, String(value));
  }, message);
};

const detectLocale = (): Locale => {
  if (typeof window === "undefined") {
    return currentLocale;
  }

  const pathLocale = getLocaleFromPath(window.location.pathname);

  if (pathLocale) {
    currentLocale = pathLocale;
    window.localStorage.setItem("locale", pathLocale);
    return pathLocale;
  }

  const storedLocale = window.localStorage.getItem("locale");

  if (isLocale(storedLocale)) {
    currentLocale = storedLocale;
    return storedLocale;
  }

  return currentLocale;
};

export const i18nProvider: I18nProvider = {
  translate: (key, params, defaultMessage) => {
    const locale = detectLocale();
    const message = getValueByPath(translations[locale], key);

    return interpolate(message ?? defaultMessage ?? key, params);
  },
  changeLocale: (locale) => {
    if (isLocale(locale)) {
      currentLocale = locale;

      if (typeof window !== "undefined") {
        window.localStorage.setItem("locale", locale);
      }
    }

    return Promise.resolve();
  },
  getLocale: () => detectLocale(),
};
