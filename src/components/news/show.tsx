"use client";

import { Show } from "@refinedev/antd";
import { useShow, useTranslate } from "@refinedev/core";
import { Descriptions, Tag, Typography } from "antd";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";
import { localizeRoute } from "@/lib/i18n";

type NewsRecord = {
  name: string;
  slug: string;
  createdAt?: string;
  createdBy?: {
    firstName?: string;
    lastName?: string;
  };
  description?: string;
  brief?: string;
  status?: {
    name?: string;
  };
};

export const NewsShow = () => {
  const translate = useTranslate();
  const locale = useLocale();
  const {
    query: { data, isError, isLoading },
  } = useShow<NewsRecord>();
  const record = data?.data;

  if (isLoading) {
    return <Show isLoading={isLoading} />;
  }

  if (isError || !record) {
    return <div className="news-detail">{translate("news.loadOneError")}</div>;
  }

  const author = [record.createdBy?.firstName, record.createdBy?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <Show title={record.name}>
      <Link className="news-detail__back" href={localizeRoute(locale, "/news")}>
        {translate("news.backToList")}
      </Link>

      <Descriptions bordered column={1} style={{ marginTop: 16 }}>
        <Descriptions.Item label={translate("news.fields.slug")}>
          <Typography.Text code>{record.slug}</Typography.Text>
        </Descriptions.Item>
        {record.createdAt && (
          <Descriptions.Item label={translate("news.fields.createdAt")}>
            {new Date(record.createdAt).toLocaleString(undefined, {
              timeZone: "UTC",
            })}
          </Descriptions.Item>
        )}
        {author && (
          <Descriptions.Item label={translate("news.fields.createdBy")}>
            {author}
          </Descriptions.Item>
        )}
        {record.status?.name && (
          <Descriptions.Item label={translate("news.fields.status")}>
            <Tag>{record.status.name}</Tag>
          </Descriptions.Item>
        )}
      </Descriptions>

      {record.brief && (<> <br/> <br/>  <p className="news-detail__brief">{record.brief}</p></>)}

      {record.description && (
        <section className="news-detail__section">
          <h2>{translate("news.fields.description")}</h2>
          <p>{record.description}</p>
        </section>
      )}
    </Show>
  );
};
