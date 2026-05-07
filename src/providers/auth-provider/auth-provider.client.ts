"use client";

import type { AuthProvider } from "@refinedev/core";
import { ApiError, apiFetch } from "@/lib/api-client";
import { defaultLocale, getLocalizedPath, getLocaleFromPath } from "@/lib/i18n";

type UserIdentity = {
  id?: number;
  email?: string;
  name?: string;
  roles?: string[];
};

const getAuthRedirectPath = (path: string) => {
  if (typeof window === "undefined") {
    return getLocalizedPath(defaultLocale, path);
  }

  return getLocalizedPath(
    getLocaleFromPath(window.location.pathname) ?? defaultLocale,
    path,
  );
};

export const authProviderClient: AuthProvider = {
  login: async ({ email, username, password, turnstileToken }) => {
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        csrf: "authenticate",
        body: JSON.stringify({
          email: email ?? username,
          password,
          turnstileToken: turnstileToken ?? "",
        }),
      });

      return {
        success: true,
        redirectTo: getAuthRedirectPath("/news"),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid username or password";

      return {
        success: false,
        error: {
          name: "LoginError",
          message,
        },
      };
    }
  },
  logout: async () => {
    await apiFetch("/auth/logout", {
      method: "POST",
      csrf: true,
    });

    return {
      success: true,
    };
  },
  check: async () => {
    try {
      await apiFetch("/auth/me");

      return {
        authenticated: true,
      };
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401) {
        return { authenticated: false, error };
      }

      return {
        authenticated: false,
        logout: true,
        redirectTo: getAuthRedirectPath("/login"),
      };
    }
  },
  getPermissions: async () => {
    try {
      const user = await apiFetch<UserIdentity>("/auth/me");

      return user.roles ?? null;
    } catch {
      return null;
    }
  },
  getIdentity: async () => {
    try {
      return await apiFetch<UserIdentity>("/auth/me");
    } catch {
      return null;
    }
  },
  onError: async (error) => {
    if (error.response?.status === 401) {
      return {
        logout: true,
      };
    }

    return { error };
  },
};
