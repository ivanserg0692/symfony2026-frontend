"use client";

import type { AuthProvider } from "@refinedev/core";
import { ApiError, apiFetch, getCsrfToken } from "@/lib/api-client";

type UserIdentity = {
  id?: number;
  email?: string;
  name?: string;
  roles?: string[];
};

export const authProviderClient: AuthProvider = {
  login: async ({ email, username, password, turnstileToken }) => {
    try {
      const csrf = await getCsrfToken("authenticate");
      await apiFetch("/auth/login", {
        method: "POST",
        headers: {
          [csrf.header_name]: csrf.token,
        },
        body: JSON.stringify({
          email: email ?? username,
          password,
          turnstileToken: turnstileToken ?? "",
        }),
      });

      return {
        success: true,
        redirectTo: "/",
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
    const csrf = await getCsrfToken("api_mutation");

    await apiFetch("/auth/logout", {
      method: "POST",
      headers: {
        [csrf.header_name]: csrf.token,
      },
    });

    return {
      success: true,
      redirectTo: "/login",
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
        redirectTo: "/login",
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
