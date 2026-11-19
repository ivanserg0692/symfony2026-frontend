import { AuthPage } from "@components/auth-page";
import { defaultLocale, getLocalizedPath, isLocale } from "@/lib/i18n";
import { safeLoginReturn } from "@/lib/login-return";
import { authProviderServer } from "@providers/auth-provider/auth-provider.server";
import { redirect } from "next/navigation";

type LoginProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ to?: string | string[] }>;
};

export default async function Login({ params, searchParams }: LoginProps) {
  const [{ locale: requestedLocale }, { to }] = await Promise.all([params, searchParams]);
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const returnTo = safeLoginReturn(locale, to);
  const { authenticated } = await authProviderServer.check();

  if (authenticated) {
    redirect(returnTo ?? getLocalizedPath(locale, "/news"));
  }

  return <AuthPage type="login" returnTo={returnTo} />;
}
