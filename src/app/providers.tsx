"use client";

import { DevtoolsProvider } from "@providers/devtools";
import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider from "@refinedev/nextjs-router";
import { useMemo, type PropsWithChildren } from "react";

import { authProviderClient } from "@providers/auth-provider/auth-provider.client";
import { dataProviders } from "@providers/data-provider";
import { createI18nProvider } from "@providers/i18n-provider";
import { useLocale } from "@/hooks/use-locale";
import { storefrontResources } from "@/providers/storefront-resources";
import { AppThemeProvider } from "@providers/theme-provider";

export const Providers = ({ children }: PropsWithChildren) => {
  const locale = useLocale();
  const i18nProvider = useMemo(() => createI18nProvider(locale), [locale]);

  return (
    <AppThemeProvider>
      <RefineKbarProvider>
        <DevtoolsProvider>
          <Refine
            routerProvider={routerProvider}
            dataProvider={dataProviders}
            authProvider={authProviderClient}
            i18nProvider={i18nProvider}
            resources={[
              ...storefrontResources,
              {
                name: "news",
                list: "/:locale/news",
                show: "/:locale/news/show/:id",
              },
              {
                name: "notification",
                list: "/:locale/notifications",
                meta: {
                  label: "resources.notification",
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              projectId: "lTmBHr-9dDGf0-4VaWng",
            }}
          >
            {children}
            <RefineKbar />
          </Refine>
        </DevtoolsProvider>
      </RefineKbarProvider>
    </AppThemeProvider>
  );
};
