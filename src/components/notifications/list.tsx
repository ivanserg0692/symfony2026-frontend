"use client";

import {
  CheckOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { List as RefineList } from "@refinedev/antd";
import { useList, useTranslate } from "@refinedev/core";
import type { CrudSort, HttpError } from "@refinedev/core";
import {
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  SorterResult,
  TablePaginationConfig,
} from "antd/es/table/interface";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

type NotificationRecord = {
  id: number;
  createdAt?: string | null;
  message?: string | null;
  readAt?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

export const NotificationList = () => {
  const translate = useTranslate();
  const [messageApi, contextHolder] = message.useMessage();
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorters, setSorters] = useState<CrudSort[]>([
    {
      field: "createdAt",
      order: "desc",
    },
  ]);
  const { query, result } = useList<NotificationRecord, HttpError>({
    resource: "notification",
    pagination: {
      currentPage,
      pageSize,
    },
    sorters,
  });

  const refreshNotifications = () => {
    void query.refetch();
  };

  const handleTableChange = (
    nextPagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<NotificationRecord> | SorterResult<NotificationRecord>[],
  ) => {
    const nextSorter = Array.isArray(sorter) ? sorter[0] : sorter;

    setCurrentPage(nextPagination.current ?? 1);
    setPageSize(nextPagination.pageSize ?? 10);
    setSorters(
      nextSorter?.field && nextSorter.order
        ? [
            {
              field: String(nextSorter.field),
              order: nextSorter.order === "ascend" ? "asc" : "desc",
            },
          ]
        : [],
    );
  };

  const handleMutationError = () => {
    void messageApi.error(translate("notifications.mutationError"));
  };

  const markAsRead = async (record: NotificationRecord) => {
    if (record.readAt) {
      return;
    }

    setMutatingId(record.id);

    try {
      await apiFetch<NotificationRecord>(`/notification/${record.id}/read`, {
        method: "PATCH",
        csrf: true,
      });
      refreshNotifications();
    } catch {
      handleMutationError();
    } finally {
      setMutatingId(null);
    }
  };

  const deleteNotification = async (record: NotificationRecord) => {
    setMutatingId(record.id);

    try {
      await apiFetch<void>(`/notification/${record.id}`, {
        method: "DELETE",
        csrf: true,
      });
      refreshNotifications();
    } catch {
      handleMutationError();
    } finally {
      setMutatingId(null);
    }
  };

  const deleteAll = async () => {
    setClearing(true);

    try {
      await apiFetch<void>("/notification", {
        method: "DELETE",
        csrf: true,
      });
      refreshNotifications();
    } catch {
      handleMutationError();
    } finally {
      setClearing(false);
    }
  };

  const columns: ColumnsType<NotificationRecord> = [
    {
      dataIndex: "message",
      title: translate("notifications.fields.message"),
      render: (value?: string | null) => (
        <Typography.Text>{value ?? translate("notifications.fallbackMessage")}</Typography.Text>
      ),
    },
    {
      dataIndex: "readAt",
      title: translate("notifications.fields.status"),
      width: 140,
      render: (value?: string | null) =>
        value ? (
          <Tag>{translate("notifications.status.read")}</Tag>
        ) : (
          <Tag color="blue">{translate("notifications.status.unread")}</Tag>
        ),
    },
    {
      dataIndex: "createdAt",
      title: translate("notifications.fields.createdAt"),
      sorter: true,
      sortOrder:
        sorters[0]?.field === "createdAt"
          ? sorters[0].order === "asc"
            ? "ascend"
            : "descend"
          : null,
      width: 190,
      render: formatDate,
    },
    {
      dataIndex: "readAt",
      title: translate("notifications.fields.readAt"),
      sorter: true,
      sortOrder:
        sorters[0]?.field === "readAt"
          ? sorters[0].order === "asc"
            ? "ascend"
            : "descend"
          : null,
      width: 190,
      render: formatDate,
    },
    {
      dataIndex: "id",
      title: translate("table.actions"),
      fixed: "right",
      width: 120,
      render: (_value: number, record) => (
        <Space size={4}>
          <Tooltip title={translate("notifications.actions.markAsRead")}>
            <Button
              aria-label={translate("notifications.actions.markAsRead")}
              disabled={Boolean(record.readAt)}
              icon={<CheckOutlined />}
              loading={mutatingId === record.id}
              onClick={() => void markAsRead(record)}
              size="small"
              type="text"
            />
          </Tooltip>
          <Tooltip title={translate("notifications.actions.delete")}>
            <Button
              aria-label={translate("notifications.actions.delete")}
              danger
              icon={<DeleteOutlined />}
              loading={mutatingId === record.id}
              onClick={() => void deleteNotification(record)}
              size="small"
              type="text"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <RefineList
      breadcrumb={false}
      headerButtons={() => (
        <Space wrap>
          <Tooltip title={translate("notifications.actions.refresh")}>
            <Button
              aria-label={translate("notifications.actions.refresh")}
              icon={<ReloadOutlined />}
              onClick={refreshNotifications}
            />
          </Tooltip>
          <Popconfirm
            cancelText={translate("notifications.actions.cancel")}
            okText={translate("notifications.actions.clearAll")}
            onConfirm={() => void deleteAll()}
            title={translate("notifications.clearAllConfirm")}
          >
            <Button danger loading={clearing}>
              {translate("notifications.actions.clearAll")}
            </Button>
          </Popconfirm>
        </Space>
      )}
      title={translate("notifications.titles.list")}
    >
      {contextHolder}
      <Table<NotificationRecord>
        columns={columns}
        dataSource={result.data}
        loading={query.isFetching}
        onChange={handleTableChange}
        pagination={{
          current: currentPage,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "30", "40", "50"],
          total: result.total,
        }}
        rowClassName={(record) =>
          record.readAt
            ? "notifications-list__row"
            : "notifications-list__row notifications-list__row--unread"
        }
        rowKey="id"
        scroll={{ x: 860 }}
      />
    </RefineList>
  );
};
