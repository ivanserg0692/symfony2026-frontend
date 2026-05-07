"use client";

import { Layout as AntLayout } from "antd";
import type { PropsWithChildren } from "react";
import { Breadcrumb } from "../breadcrumb";
import { Menu } from "../menu";
import { Notifications } from "../notifications";

const { Content, Header, Sider } = AntLayout;

export const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <AntLayout className="app-layout">
      <Sider
        breakpoint="md"
        className="app-layout__sider"
        collapsedWidth={0}
        width={220}
      >
        <Menu />
      </Sider>
      <AntLayout>
        <Header className="app-layout__header">
          <Notifications />
        </Header>
        <Content className="app-layout__content">
          <div className="app-layout__breadcrumb">
            <Breadcrumb />
          </div>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
