import { AuthPage } from "@components/auth-page";
import { getLocalizedPath, isLocale } from "@/lib/i18n";
import { authProviderServer } from "@providers/auth-provider/auth-provider.server";
import { redirect } from "next/navigation";

type LoginProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function Login({ params }: LoginProps) {
  const { locale } = await params;
  const data = await getData();

  if (data.authenticated) {
    redirect(isLocale(locale) ? getLocalizedPath(locale, "/news") : "/ru/news");
  }

  return <AuthPage type="login" />;
}

async function getData() {
  const { authenticated, redirectTo, error } = await authProviderServer.check();

  return {
    authenticated,
    redirectTo,
    error,
  };
}
