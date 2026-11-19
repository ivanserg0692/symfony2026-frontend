import { Metadata } from "next";
import React, { Suspense } from "react";

import { Providers } from "./providers";
import "@ant-design/v5-patch-for-react-19";
import "antd/dist/reset.css";
import "@styles/global.css";

export const metadata: Metadata = {
  title: "Магазин / Store",
  description: "Каталог товаров / Product catalog",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var p;try{p=localStorage.getItem('app-theme')}catch(e){}var t=p==='light'||p==='dark'?p:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t})()` }} />
      </head>
      <body>
        <Suspense>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
