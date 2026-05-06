"use client";

import { DevtoolsProvider } from "@providers/devtools";
import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider from "@refinedev/nextjs-router";
import type { PropsWithChildren } from "react";

import { authProviderClient } from "@providers/auth-provider/auth-provider.client";
import { dataProvider } from "@providers/data-provider";
import { i18nProvider } from "@providers/i18n-provider";

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <RefineKbarProvider>
      <DevtoolsProvider>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={authProviderClient}
          i18nProvider={i18nProvider}
          resources={[
            {
              name: "news",
              list: "/:locale/news",
              show: "/:locale/news/:id",
              meta: {
                label: "resources.news",
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
  );
};

