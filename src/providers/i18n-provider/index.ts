import type { I18nProvider } from "@refinedev/core";

import { isLocale, type Locale } from "@/lib/i18n";
import { en } from "./locales/en";
import { ru } from "./locales/ru";

const translations = {
  en,
  ru,
};

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

export const createI18nProvider = (initialLocale: Locale): I18nProvider => {
  let locale = initialLocale;

  return {
    translate: (key, params, defaultMessage) => {
      const message = getValueByPath(translations[locale], key);

      return interpolate(message ?? defaultMessage ?? key, params);
    },
    changeLocale: async (nextLocale) => {
      if (isLocale(nextLocale)) {
        locale = nextLocale;
      }
    },
    getLocale: () => locale,
  };
};
