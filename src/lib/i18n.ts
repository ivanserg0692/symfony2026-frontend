export const locales = ["ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

export const isLocale = (value: unknown): value is Locale => {
  return typeof value === "string" && locales.includes(value as Locale);
};

export const getLocaleFromPath = (path: string): Locale | null => {
  const locale = path.split("/")[1];

  return isLocale(locale) ? locale : null;
};

export const getLocalizedPath = (locale: Locale, path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
};

export const localizeRoute = (locale: Locale, route = "/") => {
  if (route.startsWith("/:locale")) {
    return route.replace("/:locale", `/${locale}`);
  }

  const routeLocale = getLocaleFromPath(route);

  if (isLocale(routeLocale)) {
    const [, , ...rest] = route.split("/");

    return `/${locale}${rest.length > 0 ? `/${rest.join("/")}` : ""}`;
  }

  return getLocalizedPath(locale, route);
};
