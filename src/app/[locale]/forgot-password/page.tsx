import { AuthPage } from "@components/auth-page";
import { getLocalizedPath, isLocale } from "@/lib/i18n";
import { authProviderServer } from "@providers/auth-provider/auth-provider.server";
import { redirect } from "next/navigation";

type ForgotPasswordProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ForgotPassword({ params }: ForgotPasswordProps) {
  const { locale } = await params;
  const data = await getData();

  if (data.authenticated) {
    redirect(isLocale(locale) ? getLocalizedPath(locale, "/news") : "/ru/news");
  }

  return <AuthPage type="forgotPassword" />;
}

async function getData() {
  const { authenticated, redirectTo, error } = await authProviderServer.check();

  return {
    authenticated,
    redirectTo,
    error,
  };
}
