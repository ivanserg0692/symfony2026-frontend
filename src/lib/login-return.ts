import { getLocalizedPath, type Locale } from "./i18n";

export function safeLoginReturn(locale: Locale, value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith(`${getLocalizedPath(locale)}/`)) {
    return undefined;
  }

  const path = value.slice(locale.length + 1);
  return /^\/(?:cart|notifications|news(?:\/show\/[a-zA-Z0-9_-]+)?|product\/[1-9][0-9]*)$/.test(path)
    && !/[\r\n]/.test(path) ? value : undefined;
}

export function loginWithReturn(locale: Locale, path: string) {
  const login = getLocalizedPath(locale, "/login");
  const destination = safeLoginReturn(locale, path);
  return destination ? `${login}?${new URLSearchParams({ to: destination })}` : login;
}
