"use client";

import { PictureOutlined } from "@ant-design/icons";
import { useTranslate } from "@refinedev/core";
import { useState } from "react";
import type { CatalogPicture as Picture } from "@/types/catalog";

export const PictureAttribution = ({ picture }: { picture: Picture | null }) => {
  const translate = useTranslate();
  if (!picture?.attribution) return null;

  return (
    <details className="storefront-picture__attribution">
      <summary>{translate("storefront.imageAttribution")}</summary>
      <div>
        <a href={picture.sourceUrl} target="_blank" rel="noopener noreferrer">{picture.attribution}</a>
        {" · "}<a href={picture.licenseUrl} target="_blank" rel="noopener noreferrer">{picture.license}</a>
      </div>
    </details>
  );
};

export const CatalogPicture = ({ picture, name, full = false }: { picture: Picture | null; name: string; full?: boolean }) => {
  const translate = useTranslate();
  const [failedUrl, setFailedUrl] = useState<string>();
  const source = full ? picture?.fullUrl : picture?.cardUrl;

  return (
    <figure className="storefront-picture">
      <div className="storefront-picture__image">
        {source && source !== failedUrl ? (
          // API-provided URLs do not require a new Next.js image-host configuration.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source} alt={picture?.alt || name} loading="lazy" onError={() => setFailedUrl(source)} />
        ) : (
          <span role="img" aria-label={translate("storefront.noImage")}><PictureOutlined /></span>
        )}
      </div>
      {full && picture?.attribution && (
        <figcaption><PictureAttribution picture={picture} /></figcaption>
      )}
    </figure>
  );
};
