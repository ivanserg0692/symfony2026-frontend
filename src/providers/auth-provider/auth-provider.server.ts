import type { AuthProvider } from "@refinedev/core";
import { API_URL } from "@/lib/api-client";
import { cookies } from "next/headers";

/**
 * Checks the session on the Next.js server before rendering authentication pages.
 * The page can redirect an authenticated user straight to the news page.
 * Pick selects only the check contract from AuthProvider; it provides no implementation.
 * Login and logout are handled by authProviderClient in the browser.
 */
export const authProviderServer: Pick<AuthProvider, "check"> = {
  check: async () => {
    // Server-side fetch does not attach browser cookies automatically:
    // explicitly forward cookies from the incoming Next.js request to the Symfony API.
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const response = await fetch(`${API_URL}/auth/me`, {
      cache: "no-store",
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    });

    if (response.ok) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      logout: true,
      redirectTo: "/login",
    };
  },
};
