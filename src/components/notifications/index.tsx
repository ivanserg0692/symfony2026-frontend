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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from "react";
import { apiFetch, buildApiUrl } from "@/lib/api-client";

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

const popupMaxWidth = 384;
const notificationLimit = 10;
const notificationPollIntervalMs = 30_000;

const formatDate = (value?: string | null) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
};

export const Notifications = ({
  placement = "bottomRight",
  popupBoundaryRef,
}: {
  placement?: "bottomLeft" | "bottomRight";
  popupBoundaryRef?: RefObject<HTMLElement | null>;
}) => {
  const auth = useIsAuthenticated();
  const translate = useTranslate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<ComponentRef<typeof Popover>>(null);
  const [popupPosition, setPopupPosition] = useState<{ width: number; offsetX: number }>();
  const [loading, setLoading] = useState(false);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = auth.data?.authenticated === true;

  useLayoutEffect(() => {
    const boundary = popupBoundaryRef?.current;
    const trigger = triggerRef.current;
    if (!open || !boundary || !trigger) {
      return;
    }

    const updatePopupPosition = () => {
      const bounds = boundary.getBoundingClientRect();
      const { paddingLeft, paddingRight } = getComputedStyle(boundary);
      const left = bounds.left + parseFloat(paddingLeft);
      const right = bounds.right - parseFloat(paddingRight);
      const width = Math.min(popupMaxWidth, right - left);

      const anchor = trigger.getBoundingClientRect();
      const preferredLeft = placement === "bottomLeft" ? anchor.left : anchor.right - width;
      const popupLeft = Math.min(Math.max(preferredLeft, left), right - width);
      setPopupPosition({ width, offsetX: popupLeft - preferredLeft });
    };

    updatePopupPosition();
    const observer = new ResizeObserver(updatePopupPosition);
    observer.observe(boundary);
    observer.observe(trigger);
    const navigation = trigger.closest("nav");
    if (navigation) {
      observer.observe(navigation);
    }
    window.addEventListener("resize", updatePopupPosition);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePopupPosition);
    };
  }, [open, placement, popupBoundaryRef]);

  useLayoutEffect(() => {
    if (open && popupPosition) {
      popupRef.current?.forceAlign();
    }
  }, [open, popupPosition]);

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
          csrf: true,
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
        csrf: true,
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
        csrf: true,
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
      ref={popupRef}
      arrow={false}
      rootClassName="notifications-popup"
      align={{
        targetOffset: [-(popupPosition?.offsetX ?? 0), 0],
        overflow: { shiftX: true, adjustY: true },
      }}
      styles={{
        root: { width: popupPosition?.width ?? `min(${popupMaxWidth}px, calc(100% - 32px))` },
      }}
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
      placement={placement}
      trigger="click"
    >
      <Badge count={unreadCount} overflowCount={99} size="small">
        <Button
          aria-label={translate("notifications.title")}
          className="notifications-trigger"
          ref={triggerRef}
          icon={<BellOutlined />}
          shape="circle"
          type="text"
        />
      </Badge>
    </Popover>
  );
};
