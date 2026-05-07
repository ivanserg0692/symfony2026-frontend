"use client";

import React from "react";
import {
  AppstoreOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";
import { List as RefineList, useTable } from "@refinedev/antd";
import { useTranslate } from "@refinedev/core";
import type { HttpError } from "@refinedev/core";
import {
  Button,
  Card,
  Form,
  Input,
  List as AntdList,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TablePaginationConfig } from "antd/es/table/interface";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { localizeRoute } from "@/lib/i18n";

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

type ViewMode = "table" | "card";

export const NewsList = () => {
  const translate = useTranslate();
  const locale = useLocale();
  const [viewMode, setViewMode] = React.useState<ViewMode>("table");
  const { tableProps, searchFormProps, setFilters } = useTable<
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
  const cardDataSource = React.useMemo(
    () => [...(tableProps.dataSource ?? [])],
    [tableProps.dataSource],
  );
  const cardPagination =
    typeof tableProps.pagination === "object"
      ? {
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: pagination.onChange,
          onShowSizeChange: pagination.onShowSizeChange,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "30", "40", "50"],
        }
      : false;
  const getShowHref = (slug: string) => localizeRoute(locale, `/news/show/${slug}`);

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
          <Link href={getShowHref(slug)}>
            <Button icon={<EyeOutlined />}>{translate("buttons.show")}</Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <RefineList title={translate("news.titles.list")} breadcrumb={false}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space
          align="start"
          style={{ display: "flex", justifyContent: "space-between" }}
          wrap
        >
          <Form {...searchFormProps} layout="inline">
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
                    searchFormProps.form?.resetFields();
                    setFilters([], "replace");
                  }}
                >
                  {translate("buttons.reset", "Reset")}
                </Button>
              </Space>
            </Form.Item>
          </Form>
          <Segmented<ViewMode>
            value={viewMode}
            onChange={setViewMode}
            options={[
              {
                label: (
                  <Tooltip title={translate("views.table")}>
                    <TableOutlined aria-label={translate("views.table")} />
                  </Tooltip>
                ),
                value: "table",
              },
              {
                label: (
                  <Tooltip title={translate("views.cards")}>
                    <AppstoreOutlined aria-label={translate("views.cards")} />
                  </Tooltip>
                ),
                value: "card",
              },
            ]}
          />
        </Space>

        {viewMode === "table" ? (
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
        ) : (
          <AntdList<NewsRecord>
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 4 }}
            dataSource={cardDataSource}
            loading={tableProps.loading}
            pagination={cardPagination}
            renderItem={(record) => (
              <AntdList.Item>
                <Card
                  hoverable
                  title={record.name}
                  extra={record.status?.name ? <Tag>{record.status.name}</Tag> : null}
                  actions={[
                    <Link key="show" href={getShowHref(record.slug)}>
                      <Button type="link" icon={<EyeOutlined />}>
                        {translate("buttons.show")}
                      </Button>
                    </Link>,
                  ]}
                >
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Typography.Text code>{record.slug}</Typography.Text>
                    {record.brief && (
                      <Typography.Paragraph ellipsis={{ rows: 3 }}>
                        {record.brief}
                      </Typography.Paragraph>
                    )}
                    {record.createdAt && (
                      <Typography.Text type="secondary">
                        {new Date(record.createdAt).toLocaleString(undefined, {
                          timeZone: "UTC",
                        })}
                      </Typography.Text>
                    )}
                  </Space>
                </Card>
              </AntdList.Item>
            )}
          />
        )}
      </Space>
    </RefineList>
  );
};
