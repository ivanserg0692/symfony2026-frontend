"use client";

import React from "react";
import { EyeOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { List, useTable } from "@refinedev/antd";
import { useNavigation, useTranslate } from "@refinedev/core";
import type { HttpError } from "@refinedev/core";
import { Button, Form, Input, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TablePaginationConfig } from "antd/es/table/interface";

type NewsRecord = {
  name: string;
  slug: string;
  createdAt: string;
  createdBy?: {
    firstName?: string;
  };
  description?: string;
  brief?: string;
  status?: {
    name?: string;
  };
};

type NewsSearch = {
  query?: string;
};

export const NewsList = () => {
  const translate = useTranslate();
  const { show } = useNavigation();
  const { tableProps, searchFormProps } = useTable<
    NewsRecord,
    HttpError,
    NewsSearch
  >({
    pagination: {
      pageSize: 10,
    },
    sorters: {
      initial: [
        {
          field: "createdAt",
          order: "desc",
        },
      ],
    },
    onSearch: ({ query }) => {
      const value = query?.trim();

      if (!value) {
        return [];
      }

      return [
        {
          field: "query",
          operator: "contains",
          value,
        },
      ];
    },
  });
  const { size, ...pagination } =
    typeof tableProps.pagination === "object"
      ? (tableProps.pagination as TablePaginationConfig & { size?: unknown })
      : {};

  const columns: ColumnsType<NewsRecord> = [
    {
      dataIndex: "name",
      title: translate("news.fields.name"),
      sorter: true,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      dataIndex: "slug",
      title: translate("news.fields.slug"),
      sorter: true,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      dataIndex: "createdAt",
      title: translate("news.fields.createdAt"),
      sorter: true,
      render: (value: string) =>
        value
          ? new Date(value).toLocaleString(undefined, {
              timeZone: "UTC",
            })
          : null,
    },
    {
      dataIndex: ["createdBy", "firstName"],
      title: translate("news.fields.createdBy"),
    },
    {
      dataIndex: "brief",
      title: translate("news.fields.brief"),
      ellipsis: true,
    },
    {
      dataIndex: ["status", "name"],
      title: translate("news.fields.status"),
      render: (value?: string) => (value ? <Tag>{value}</Tag> : null),
    },
    {
      dataIndex: "slug",
      title: translate("table.actions"),
      fixed: "right",
      render: (slug: string) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              show("news", slug);
            }}
          >
            {translate("buttons.show")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <List title={translate("news.titles.list")}>
      <Form {...searchFormProps} layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item name="query" style={{ minWidth: 280 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={translate("news.search.placeholder", "Search news")}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
              {translate("buttons.search", "Search")}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                searchFormProps.form?.setFieldsValue({ query: undefined });
                searchFormProps.onFinish?.({ query: undefined });
              }}
            >
              {translate("buttons.reset", "Reset")}
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <Table<NewsRecord>
        {...tableProps}
        columns={columns}
        rowKey="slug"
        scroll={{ x: 960 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "30", "40", "50"],
        }}
      />
    </List>
  );
};
