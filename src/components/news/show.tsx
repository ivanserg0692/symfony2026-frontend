"use client";

import { useShow, useTranslate } from "@refinedev/core";
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
    return <div className="news-detail">{translate("common.loading")}</div>;
  }

  if (isError || !record) {
    return <div className="news-detail">{translate("news.loadOneError")}</div>;
  }

  const author = [record.createdBy?.firstName, record.createdBy?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="news-detail">
      <Link className="news-detail__back" href={localizeRoute(locale, "/news")}>
        {translate("news.backToList")}
      </Link>

      <header className="news-detail__header">
        <div>
          <h1>{record.name}</h1>
          <dl className="news-detail__meta">
            {record.createdAt && (
              <div>
                <dt>{translate("news.fields.createdAt")}</dt>
                <dd>
                  {new Date(record.createdAt).toLocaleString(undefined, {
                    timeZone: "UTC",
                  })}
                </dd>
              </div>
            )}
            {author && (
              <div>
                <dt>{translate("news.fields.createdBy")}</dt>
                <dd>{author}</dd>
              </div>
            )}
            {record.status?.name && (
              <div>
                <dt>{translate("news.fields.status")}</dt>
                <dd>{record.status.name}</dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {record.brief && <p className="news-detail__brief">{record.brief}</p>}

      {record.description && (
        <section className="news-detail__section">
          <h2>{translate("news.fields.description")}</h2>
          <p>{record.description}</p>
        </section>
      )}
    </article>
  );
};
