"use client";

import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useIsAuthenticated, useTranslate } from "@refinedev/core";
import {
  Badge,
  Button,
  Empty,
  List,
  Popconfirm,
  Popover,
  Space,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, buildApiUrl, getCsrfToken } from "@/lib/api-client";

type NotificationItem = {
  id: number;
  createdAt?: string | null;
  message?: string | null;
  readAt?: string | null;
};

type ListResponse<TData> = {
  items: TData[];
  pagination?: {
    total: number;
  };
};

const notificationLimit = 10;
const notificationPollIntervalMs = 30_000;

const mutationHeaders = async () => {
  const csrf = await getCsrfToken("api_mutation");

  return {
    [csrf.header_name]: csrf.token,
  };
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

export const Notifications = () => {
  const auth = useIsAuthenticated();
  const translate = useTranslate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = auth.data?.authenticated === true;

  const unreadCount = useMemo(
    () => items.filter((item) => !item.readAt).length,
    [items],
  );

  const loadNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isAuthenticated) {
        setItems([]);
        setError(null);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const url = buildApiUrl("/notification", {
          page: 1,
          limit: notificationLimit,
          sort: "createdAt",
          direction: "desc",
        });
        const response = await apiFetch<ListResponse<NotificationItem>>(url);

        setItems(response.items);
        setError(null);
      } catch {
        if (!options?.silent) {
          setError(translate("notifications.loadError"));
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [isAuthenticated, translate],
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadNotifications({ silent: true });
    }, notificationPollIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, loadNotifications]);

  const markAsRead = async (item: NotificationItem) => {
    if (item.readAt) {
      return;
    }

    setMutatingId(item.id);
    setError(null);

    try {
      const updated = await apiFetch<NotificationItem>(
        `/notification/${item.id}/read`,
        {
          method: "PATCH",
          headers: await mutationHeaders(),
        },
      );

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id ? updated : currentItem,
        ),
      );
    } catch {
      setError(translate("notifications.mutationError"));
    } finally {
      setMutatingId(null);
    }
  };

  const deleteNotification = async (item: NotificationItem) => {
    setMutatingId(item.id);
    setError(null);

    try {
      await apiFetch<void>(`/notification/${item.id}`, {
        method: "DELETE",
        headers: await mutationHeaders(),
      });

      setItems((currentItems) =>
        currentItems.filter((currentItem) => currentItem.id !== item.id),
      );
    } catch {
      setError(translate("notifications.mutationError"));
    } finally {
      setMutatingId(null);
    }
  };

  const deleteAll = async () => {
    setClearing(true);
    setError(null);

    try {
      await apiFetch<void>("/notification", {
        method: "DELETE",
        headers: await mutationHeaders(),
      });

      setItems([]);
    } catch {
      setError(translate("notifications.mutationError"));
    } finally {
      setClearing(false);
    }
  };

  if (auth.isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <Popover
      arrow={false}
      content={
        <div className="notifications-popover">
          <div className="notifications-popover__header">
            <Typography.Text strong>
              {translate("notifications.title")}
            </Typography.Text>
            <Space size={4}>
              <Tooltip title={translate("notifications.actions.refresh")}>
                <Button
                  aria-label={translate("notifications.actions.refresh")}
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={() => void loadNotifications()}
                  size="small"
                  type="text"
                />
              </Tooltip>
              {items.length > 0 && (
                <Popconfirm
                  cancelText={translate("notifications.actions.cancel")}
                  okText={translate("notifications.actions.clearAll")}
                  onConfirm={() => void deleteAll()}
                  title={translate("notifications.clearAllConfirm")}
                >
                  <Button danger loading={clearing} size="small" type="text">
                    {translate("notifications.actions.clearAll")}
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>
          {error && (
            <Typography.Text
              className="notifications-popover__error"
              type="danger"
            >
              {error}
            </Typography.Text>
          )}
          <Spin spinning={loading && items.length === 0}>
            {items.length === 0 ? (
              <Empty
                description={translate("notifications.empty")}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                className="notifications-popover__list"
                dataSource={items}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Tooltip
                        key="read"
                        title={translate("notifications.actions.markAsRead")}
                      >
                        <Button
                          aria-label={translate(
                            "notifications.actions.markAsRead",
                          )}
                          disabled={Boolean(item.readAt)}
                          icon={<CheckOutlined />}
                          loading={mutatingId === item.id}
                          onClick={() => void markAsRead(item)}
                          size="small"
                          type="text"
                        />
                      </Tooltip>,
                      <Tooltip
                        key="delete"
                        title={translate("notifications.actions.delete")}
                      >
                        <Button
                          aria-label={translate(
                            "notifications.actions.delete",
                          )}
                          danger
                          icon={<DeleteOutlined />}
                          loading={mutatingId === item.id}
                          onClick={() => void deleteNotification(item)}
                          size="small"
                          type="text"
                        />
                      </Tooltip>,
                    ]}
                    className={
                      item.readAt
                        ? "notifications-popover__item"
                        : "notifications-popover__item notifications-popover__item--unread"
                    }
                  >
                    <List.Item.Meta
                      description={formatDate(item.createdAt)}
                      title={
                        <Typography.Text>
                          {item.message ??
                            translate("notifications.fallbackMessage")}
                        </Typography.Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </div>
      }
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          void loadNotifications();
        }
      }}
      open={open}
      placement="bottomRight"
      trigger="click"
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button
          aria-label={translate("notifications.title")}
          icon={<BellOutlined />}
          shape="circle"
          type="text"
        />
      </Badge>
    </Popover>
  );
};
