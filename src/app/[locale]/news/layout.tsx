import { Layout } from "@components/layout";
import type { PropsWithChildren } from "react";

export default function NewsLayout({ children }: PropsWithChildren) {
  return <Layout>{children}</Layout>;
}
